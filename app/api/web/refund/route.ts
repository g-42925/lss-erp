import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import RefundLog from '@/models/RefundLog';
import Order from '@/models/Order';
import Batches from '@/models/Batche';
import Product from '@/models/Product';
import Warehouse from '@/models/Warehouse';
import Companie from '@/models/Companie';
import InboundLog from '@/models/InboundLog';
import ExitLog from '@/models/ExitLog';
import OutboundLog from '@/models/OutboundLog';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: true, message: "Company ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    // Default to populate if needed
    const refunds = await RefundLog.find({ companyId: company._id })
      .populate('salesOrderId')
      .populate('productId')
      .populate('warehouseId')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      noResult: false,
      message: "",
      result: refunds,
      error: false
    });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const params = await request.json();

    if (!params.approvalCode) {
      return NextResponse.json({ error: true, message: "Kode approval diperlukan untuk melakukan refund" });
    }

    const approver = await User.findOne({ approvalCode: params.approvalCode });
    if (!approver) {
      return NextResponse.json({ error: true, message: "Kode approval tidak valid" });
    }

    // We expect companyId, orderId, productId, warehouseId, qty, refundAmount
    const order = await Order.findById(params.orderId);
    if (!order) {
      return NextResponse.json({ error: true, message: "Order not found" });
    }

    const product = await Product.findById(params.productId);
    if (!product) {
      return NextResponse.json({ error: true, message: "Product not found" });
    }

    // Get unit cost to store in refund for future restock 
    // Wait, let's find the batch unit cost if needed, but for now we can approximate like Product stockValue calculation
    // const qtyTotal = (product.remain || 0) + (product.allocated || 0); // we don't have this exactly here without aggregation
    // If we want exact, maybe just pass unitCost from the front end or handle it gracefully.
    // For now we will just allow it to proceed.

    const refund = await RefundLog.create({
      companyId: order.companyId,
      salesOrderId: order._id,
      salesOrderNumber: order.salesOrderNumber,
      productId: params.productId,
      warehouseId: params.warehouseId,
      qty: params.qty,
      refundAmount: params.refundAmount,
      status: 'refunded',
      createdAt: new Date(),
      createdByUserId: params.creatorId ? new mongoose.Types.ObjectId(params.creatorId) : undefined,
      createdByName: params.creatorName || undefined,
      approvedByUserId: approver._id,
      approvedByName: approver.name,
    });

    // Update the invoice to decrease the outstanding balance (increase the refund credit)
    await Invoice.findOneAndUpdate(
      { salesOrderId: order._id },
      { $inc: { refundCredit: params.refundAmount } }
    );

    return NextResponse.json({
      noResult: false,
      message: "succesfully returned product",
      result: refund,
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

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const params = await request.json();

    if (!params.id) {
      return NextResponse.json({ error: true, message: "RefundLog ID is required" });
    }

    const refund = await RefundLog.findById(params.id);
    if (!refund) {
      return NextResponse.json({ error: true, message: "Refund record not found" });
    }

    if (refund.status === 'stored_back' || refund.status === 'resolved') {
      return NextResponse.json({ error: true, message: "Already fully processed" });
    }

    // Determine how many have already been processed
    const alreadyStored = refund.storedBackQty || 0;
    const alreadyExited = refund.exitedQty || 0;
    const remaining = refund.qty - alreadyStored - alreadyExited;

    if (remaining <= 0) {
      return NextResponse.json({ error: true, message: "No remaining quantity to process" });
    }

    // Qty to process this time
    const qtyToProcess = params.qty ? Number(params.qty) : remaining;

    if (isNaN(qtyToProcess) || qtyToProcess <= 0) {
      return NextResponse.json({ error: true, message: "Invalid quantity" });
    }

    if (qtyToProcess > remaining) {
      return NextResponse.json({
        error: true,
        message: `Cannot process ${qtyToProcess}. Only ${remaining} remaining.`
      });
    }

    if (params.action === 'exit') {
      if (!params.reason) {
        return NextResponse.json({ error: true, message: "Reason is required for exit" });
      }

      if (!params.approvalCode) {
        return NextResponse.json({ error: true, message: "Kode approval diperlukan untuk exit" });
      }

      const approver = await User.findOne({ approvalCode: params.approvalCode });
      if (!approver) {
        return NextResponse.json({ error: true, message: "Kode approval tidak valid" });
      }

      await ExitLog.create({
        companyId: refund.companyId,
        warehouseId: refund.warehouseId,
        productId: refund.productId,
        qty: qtyToProcess,
        reason: params.reason,
        note: params.note || `Refund exit from Order: ${refund.salesOrderNumber}`,
        createdByUserId: params.userId ? new mongoose.Types.ObjectId(params.userId) : undefined,
        createdByName: params.userName || undefined,
        approvedByUserId: approver._id,
        approvedByName: approver.name,
      });

      await OutboundLog.create({
        warehouseId: refund.warehouseId,
        productId: refund.productId,
        quantity: qtyToProcess,
        date: new Date()
      });

      const newExited = alreadyExited + qtyToProcess;
      refund.exitedQty = newExited;

      if (alreadyStored + newExited >= refund.qty) {
        refund.status = 'resolved';
      }

      await refund.save();

      return NextResponse.json({
        noResult: false,
        message: alreadyStored + newExited >= refund.qty
          ? "Fully processed"
          : `Exited ${qtyToProcess} unit(s). ${refund.qty - alreadyStored - newExited} remaining.`,
        result: refund,
        error: false
      });
    }

    if (!refund.warehouseId) {
      return NextResponse.json({ error: true, message: "No warehouse associated with this refund. Please adjust stock manually." });
    }

    const warehouse = await Warehouse.findById(refund.warehouseId);

    // Build batch data — only include locationId if it is actually present
    const batchData: Record<string, unknown> = {
      warehouseId: refund.warehouseId,
      productId: refund.productId,
      qty: qtyToProcess,
      accumulative: qtyToProcess,
      outQty: 0,
      reserved: 0,
      batchNumber: `RFND-${String(Date.now()).slice(-5)}`,
      status: 'ACTIVE',
      createdAt: new Date(),
      note: `Refund store-back from Order: ${refund.salesOrderNumber} (${qtyToProcess} of ${refund.qty})`
    };


    // Only attach locationId when the warehouse provides one
    const locationId = warehouse?.locationId ?? null;
    if (locationId) {
      batchData.locationId = locationId;
    }

    // Store back into warehouse (create a new batch)
    await Batches.create(batchData);

    await InboundLog.create({
      warehouseId: refund.warehouseId,
      productId: refund.productId,
      quantity: qtyToProcess,
      date: new Date(),
    })


    // Update the refund log
    const newStored = alreadyStored + qtyToProcess;
    refund.storedBackQty = newStored;
    refund.storedBackAt = new Date();
    // Only mark fully done when all qty is stored back
    if (newStored + alreadyExited >= refund.qty) {
      refund.status = 'resolved';
    }

    await refund.save();

    return NextResponse.json({
      noResult: false,
      message: newStored + alreadyExited >= refund.qty
        ? "Fully stored back to warehouse"
        : `Stored back ${qtyToProcess} unit(s). ${refund.qty - newStored - alreadyExited} remaining.`,
      result: refund,
      error: false
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    });
  }
}
