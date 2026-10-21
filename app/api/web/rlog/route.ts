import Batche from "@/models/Batche";
import ProcurementReceivingLog from "@/models/ProcurementReceivingLog";
import InvItem from "@/models/InvItem";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url)
    const so = url.searchParams.get("so")
    const type = url.searchParams.get("type")

    // ── Procurement receiving logs ─────────────────────────────────────────────
    if (type === 'procurement') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let matchCondition: any = {};
      if (so && so !== 'null') {
        matchCondition = { purchaseOrderNumber: so };
      } else {
        matchCondition = { purchaseOrderNumber: { $exists: true, $ne: null } };
      }

      const logs = await ProcurementReceivingLog.aggregate([
        { $match: matchCondition },
        {
          $lookup: {
            from: 'invitems',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item'
          }
        },
        {
          $unwind: {
            path: '$item',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'receivedBy',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'lastEditedBy',
            foreignField: '_id',
            as: 'editor'
          }
        },
        {
          $unwind: {
            path: '$editor',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'lastApprovedBy',
            foreignField: '_id',
            as: 'approver'
          }
        },
        {
          $unwind: {
            path: '$approver',
            preserveNullAndEmptyArrays: true
          }
        },
        { $sort: { receivedDate: -1 } }
      ])

      return NextResponse.json({
        noResult: false,
        message: "",
        result: logs,
        error: false
      })
    }

    // ── Product/default: query Batche ──────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let matchCondition: any = {};
    if (so && so !== 'null') {
      matchCondition = { purchaseOrderNumber: so };
    } else {
      matchCondition = { purchaseOrderNumber: { $exists: true, $ne: null } };
    }

    const batches = await Batche.aggregate([
      {
        $match: matchCondition
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location'
        }
      },
      {
        $unwind: {
          path: '$location',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: {
          path: '$supplier',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastEditedBy',
          foreignField: '_id',
          as: 'editor'
        }
      },
      {
        $unwind: {
          path: '$editor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'lastApprovedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $unwind: {
          path: '$approver',
          preserveNullAndEmptyArrays: true
        }
      }
    ])

    return NextResponse.json({
      noResult: false,
      message: "",
      result: batches,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json(
      {
        noResult: true,
        message: e instanceof Error ? e.message : "Something went wrong",
        result: null,
        error: true
      }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, qty, expiryDate, receivedDate, approvalCode, editingUserId, type } = body;

    if (!approvalCode) {
      throw new Error("Approval code is required");
    }

    const User = (await import("@/models/User")).default;
    const approver = await User.findOne({ approvalCode });
    if (!approver) {
      throw new Error("Invalid approval code");
    }

    if (!_id) {
      throw new Error("ID is required");
    }

    // ── Procurement receiving log edit ─────────────────────────────────────────
    if (type === 'procurement') {
      const log = await ProcurementReceivingLog.findById(_id);
      if (!log) {
        throw new Error("Receiving log not found");
      }

      const newQty = parseInt(qty);
      if (isNaN(newQty) || newQty <= 0) {
        throw new Error("Invalid quantity");
      }

      const diff = newQty - log.qty;

      // Adjust InvItem stock (only for inventory saves)
      if (log.saveAs !== 'asset') {
        await InvItem.findByIdAndUpdate(log.itemId, {
          $inc: { currentStock: diff }
        });
      }

      // Adjust Purchase receivedQty
      const Purchase_ = (await import("@/models/Purchase")).default;
      await Purchase_.findByIdAndUpdate(log.purchaseId, {
        $inc: { receivedQty: diff }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatePayload: any = {
        qty: newQty,
        lastEditedBy: editingUserId,
        lastApprovedBy: approver._id,
        editedAt: new Date()
      };
      if (receivedDate) {
        updatePayload.receivedDate = new Date(receivedDate);
      }

      const updatedLog = await ProcurementReceivingLog.findByIdAndUpdate(_id, updatePayload, { new: true });

      return NextResponse.json({
        noResult: false,
        message: "Receiving log updated successfully",
        result: updatedLog,
        error: false
      });
    }

    // ── Product batch edit (original logic) ────────────────────────────────────
    const batch = await Batche.findById(_id);
    if (!batch) {
      throw new Error("Batch not found");
    }

    if (batch.status !== 'QUARANTINE') {
      throw new Error(`Batch cannot be edited via Receiving Log because it has already been processed by QC (status: ${batch.status})`);
    }

    const newQty = parseInt(qty);
    if (isNaN(newQty) || newQty <= 0) {
      throw new Error("Invalid quantity");
    }

    const diff = newQty - batch.qty;
    const isAccumulativeAffected = batch.accumulative !== undefined;

    // Also update Purchase received properties and recalculate stockValue
    let ratio = 1;
    if (batch.purchaseOrderNumber) {
      const purchase = await (await import("@/models/Purchase")).default.findOne({ purchaseOrderNumber: batch.purchaseOrderNumber, productId: batch.productId });
      if (purchase) {
        if (purchase.measurementId) {
          const Measurement = (await import("@/models/Measurement")).default;
          const config = await Measurement.findById(purchase.measurementId);
          if (config) ratio = config.ratio;
        }

        const product = await (await import("@/models/Product")).default.findById(purchase.productId);

        if (ratio === 1 && product?.packagingId) {
          const Packaging = (await import("@/models/Packaging")).default;
          const packaging = await Packaging.findById(product.packagingId);
          if (packaging?.qty) ratio = packaging.qty;
        }

        await (await import("@/models/Purchase")).default.findByIdAndUpdate(purchase._id, {
          $inc: { receivedQty: diff }
        });

        if (product && product.stockValue !== undefined && batch.status === 'ACTIVE') {
          const landedCost = (purchase.finalPrice || 0) + (purchase.shippingCost || 0) + (purchase.taxAmount || 0);
          const unitCost = landedCost / purchase.quantity;
          const valChange = unitCost * diff;
          await (await import("@/models/Product")).default.findByIdAndUpdate(product._id, {
            $inc: { stockValue: valChange }
          });
        }
      }
    }

    const diffQty = diff * ratio;
    const InboundLog = (await import("@/models/InboundLog")).default;
    let inboundLog = await InboundLog.findOne({ sourceId: batch._id });
    if (!inboundLog) {
      const batchDate = batch._id.getTimestamp();
      inboundLog = await InboundLog.findOne({
        productId: batch.productId,
        warehouseId: batch.warehouseId,
        date: {
          $gte: new Date(batchDate.getTime() - 10000),
          $lte: new Date(batchDate.getTime() + 10000)
        }
      });
    }

    if (inboundLog) {
      await InboundLog.findByIdAndUpdate(inboundLog._id, {
        $inc: { quantity: diffQty },
        $set: { sourceId: batch._id, sourceType: 'PURCHASE' }
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = {
      qty: newQty,
      lastEditedBy: editingUserId,
      lastApprovedBy: approver._id,
      editedAt: new Date()
    };
    if (isAccumulativeAffected) {
      updatePayload.accumulative = batch.accumulative + (diff * ratio);
    }
    if (expiryDate) {
      updatePayload.expiryDate = new Date(expiryDate);
    }

    const updatedBatch = await Batche.findByIdAndUpdate(_id, updatePayload, { new: true });

    return NextResponse.json({
      noResult: false,
      message: "Batch updated successfully",
      result: updatedBatch,
      error: false
    });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    });
  }
}