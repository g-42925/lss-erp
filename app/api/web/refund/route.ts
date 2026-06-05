import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import RefundLog from '@/models/RefundLog';
import Order from '@/models/Order';
import Batches from '@/models/Batche';
import Product from '@/models/Product';
import Warehouse from '@/models/Warehouse';
import Companie from '@/models/Companie';
import InboundLog from '@/models/InboundLog';
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
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const params = await request.json();

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
    const qtyTotal = (product.remain || 0) + (product.allocated || 0); // we don't have this exactly here without aggregation
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
    });

    return NextResponse.json({
      noResult: false,
      message: "succesfully returned product",
      result: refund,
      error: false
    });

  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
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

    if (refund.status === 'stored_back') {
      return NextResponse.json({ error: true, message: "Already fully stored back" });
    }

    // Determine how many have already been stored back
    const alreadyStored = refund.storedBackQty || 0;
    const remaining = refund.qty - alreadyStored;

    if (remaining <= 0) {
      return NextResponse.json({ error: true, message: "No remaining quantity to store back" });
    }

    // Qty to store back this time
    const qtyToStore = params.qty ? Number(params.qty) : remaining;

    if (isNaN(qtyToStore) || qtyToStore <= 0) {
      return NextResponse.json({ error: true, message: "Invalid quantity" });
    }

    if (qtyToStore > remaining) {
      return NextResponse.json({
        error: true,
        message: `Cannot store back ${qtyToStore}. Only ${remaining} remaining.`
      });
    }

    if (!refund.warehouseId) {
      return NextResponse.json({ error: true, message: "No warehouse associated with this refund. Please adjust stock manually." });
    }

    const warehouse = await Warehouse.findById(refund.warehouseId);

    // Build batch data — only include locationId if it is actually present
    const batchData: Record<string, any> = {
      warehouseId: refund.warehouseId,
      productId: refund.productId,
      qty: qtyToStore,
      accumulative: qtyToStore,
      outQty: 0,
      reserved: 0,
      batchNumber: `RFND-${String(Date.now()).slice(-5)}`,
      status: 'ACTIVE',
      createdAt: new Date(),
      note: `Refund store-back from Order: ${refund.salesOrderNumber} (${qtyToStore} of ${refund.qty})`
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
      quantity: qtyToStore,
      date: new Date(),
    })


    // Update the refund log
    const newStored = alreadyStored + qtyToStore;
    refund.storedBackQty = newStored;
    refund.storedBackAt = new Date();
    // Only mark fully done when all qty is stored back
    if (newStored >= refund.qty) {
      refund.status = 'stored_back';
    }
    // Otherwise keep status as 'refunded' — partial progress shown via storedBackQty

    await refund.save();

    return NextResponse.json({
      noResult: false,
      message: newStored >= refund.qty
        ? "Fully stored back to warehouse"
        : `Stored back ${qtyToStore} unit(s). ${refund.qty - newStored} remaining.`,
      result: refund,
      error: false
    });
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    });
  }
}
