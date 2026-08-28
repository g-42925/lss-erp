/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from "@/models/Companie";
import Purchase from "@/models/Purchase";
import PurchaseReturn from "@/models/PurchaseReturn";
import Batche from "@/models/Batche";
import Product from "@/models/Product";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ok(result: any, message = "") {
  return NextResponse.json({ noResult: false, message, result, error: false });
}

function err(message: string, status = 200) {
  return NextResponse.json(
    { noResult: true, message, result: null, error: true },
    { status }
  );
}

// ─── GET — list all purchase returns for a company ───────────────────────────

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");   // masterAccountId
    const status = url.searchParams.get("status"); // optional filter

    if (!id) return err("masterAccountId is required");

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) return err("Company not found");

    const matchStage: any = { companyId: company._id };
    if (status) matchStage.status = status;

    const returns = await PurchaseReturn.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplierId",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy"
        }
      },
      { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "approvedBy",
          foreignField: "_id",
          as: "approvedBy"
        }
      },
      { $unwind: { path: "$approvedBy", preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: -1 } }
    ]);

    return ok(returns);
  } catch (e: any) {
    return err(e.message);
  }
}

// ─── POST — create a new purchase return (staff) ─────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { masterAccountId, purchaseId, batchId, returnQty, reason, reasonNote, createdBy } = body;

    if (!masterAccountId) return err("masterAccountId is required");
    if (!purchaseId) return err("purchaseId is required");
    if (!batchId) return err("batchId is required");
    if (!returnQty || returnQty < 1) return err("returnQty must be at least 1");
    if (!reason) return err("reason is required");

    const company = await Companie.findOne({ masterAccountId });
    if (!company) return err("Company not found");

    // Validate the purchase exists and is ordered/completed
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) return err("Purchase not found");
    if (!["ordered", "completed"].includes(purchase.status)) {
      return err("Can only return items from ordered or completed purchases");
    }
    if (purchase.purchaseType !== "product") {
      return err("Only product purchases with a supplier can be returned");
    }

    // Validate the batch
    const batch = await Batche.findById(batchId);
    if (!batch) return err("Batch not found");
    if (!["ACTIVE", "QUARANTINE"].includes(batch.status)) {
      return err(`Batch cannot be returned (status: ${batch.status})`);
    }

    const availableQty = batch.qty;
    if (returnQty > availableQty) {
      return err(`Return qty (${returnQty}) cannot exceed available batch qty (${availableQty})`);
    }

    // Calculate return amount based on unit cost from purchase
    const landedCost = (purchase.finalPrice || 0) + (purchase.shippingCost || 0) + (purchase.taxAmount || 0);
    const unitCost = purchase.quantity > 0 ? landedCost / purchase.quantity : 0;
    const returnAmount = unitCost * returnQty;

    // Generate return number
    const returnNumber = `RTN-${Date.now().toString().slice(-8)}`;

    const newReturn = await PurchaseReturn.create({
      companyId: company._id,
      returnNumber,
      purchaseId,
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      batchId,
      productId: purchase.productId,
      supplierId: purchase.supplierId || null,
      returnQty,
      returnAmount,
      reason,
      reasonNote: reasonNote || "",
      status: "draft",
      createdBy,
    });

    // Populate for response
    const [populated] = await PurchaseReturn.aggregate([
      { $match: { _id: newReturn._id } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplierId",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } }
    ]);

    return ok(populated, "Purchase return created successfully");
  } catch (e: any) {
    return err(e.message);
  }
}

// ─── PUT — approve or reject a return (finance) ──────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, action, userId } = body;

    if (!_id) return err("Return ID is required");
    if (!action) return err("action is required");

    const ret = await PurchaseReturn.findById(_id);
    if (!ret) return err("Purchase return not found");
    if (ret.status !== "draft") {
      return err(`Cannot process a return with status: ${ret.status}`);
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    if (action === "reject") {
      const updated = await PurchaseReturn.findByIdAndUpdate(
        _id,
        {
          status: "rejected",
          rejectedBy: userId,
          rejectedAt: new Date()
        },
        { new: true }
      );
      return ok(updated, "Purchase return rejected");
    }

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (action === "approve") {
      const { purchaseId, batchId, returnQty } = ret;

      // 1. Fetch and validate the batch
      const batch = await Batche.findById(batchId);
      if (!batch) return err("Batch not found");
      if (!["ACTIVE", "QUARANTINE"].includes(batch.status)) {
        return err(`Batch cannot be returned (status: ${batch.status})`);
      }
      if (returnQty > batch.qty) {
        return err(`Return qty exceeds current batch qty (${batch.qty})`);
      }

      // 2. Reduce batch qty; mark DEPLETED if fully returned
      const newBatchQty = batch.qty - returnQty;
      const newAccumulative = Math.max((batch.accumulative || 0) - returnQty, 0);
      const batchNewStatus = newBatchQty <= 0 ? "DEPLETED" : batch.status;

      await Batche.findByIdAndUpdate(batchId, {
        qty: newBatchQty,
        accumulative: newAccumulative,
        status: batchNewStatus,
        lastEditedBy: userId,
        editedAt: new Date()
      });

      // 3. Reduce product stockValue proportionally
      const product = await Product.findById(ret.productId);
      if (product && product.stockValue !== undefined) {
        const purchase = await Purchase.findById(purchaseId);
        if (purchase) {
          const landedCost = (purchase.finalPrice || 0) + (purchase.shippingCost || 0) + (purchase.taxAmount || 0);
          const unitCost = purchase.quantity > 0 ? landedCost / purchase.quantity : 0;
          const stockValueReduction = unitCost * returnQty;
          await Product.findByIdAndUpdate(ret.productId, {
            $inc: { stockValue: -stockValueReduction }
          });
        }
      }

      // 4. Also reduce receivedQty on the purchase to reflect items returned
      await Purchase.findByIdAndUpdate(purchaseId, {
        $inc: { receivedQty: -returnQty }
      });

      // 5. Mark return as approved
      const updated = await PurchaseReturn.findByIdAndUpdate(
        _id,
        {
          status: "approved",
          approvedBy: userId,
          approvedAt: new Date(),
        },
        { new: true }
      );

      return ok(updated, "Purchase return approved. Batch stock has been reduced.");
    }

    return err(`Unknown action: ${action}`);
  } catch (e: any) {
    return err(e.message);
  }
}
