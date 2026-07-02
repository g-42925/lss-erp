/* eslint-disable @typescript-eslint/no-explicit-any */
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import ExitLog from '@/models/ExitLog';
import OutboundLog from '@/models/OutboundLog';
import Batche from '@/models/Batche';
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { productId, locationId, qty, reason, note } = await request.json();

    if (!productId || !locationId || !qty || !reason) {
      return NextResponse.json({ error: true, message: "Missing required fields" }, { status: 400 });
    }

    let remainingQtyToExit = Number(qty);
    const stock = await Batche.find({
      productId: new mongoose.Types.ObjectId(productId),
      locationId: new mongoose.Types.ObjectId(locationId)
    });

    const totalAvailable = stock.reduce((sum, batch) => sum + (batch.accumulative - batch.outQty - (batch.reserved || 0)), 0);

    if (remainingQtyToExit > totalAvailable) {
      return NextResponse.json({ error: true, message: "Quantity exceeds available stock in location" }, { status: 400 });
    }

    // Automatically deduct from batches
    for (const batch of stock) {
      if (remainingQtyToExit <= 0) break;

      const availableInBatch = batch.accumulative - batch.outQty - (batch.reserved || 0);
      
      if (availableInBatch > 0) {
        if (availableInBatch >= remainingQtyToExit) {
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: remainingQtyToExit } });
          remainingQtyToExit = 0;
        } else {
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: availableInBatch } });
          remainingQtyToExit -= availableInBatch;
        }
      }
    }

    // Create exit log. We don't save batchId anymore since it could be spread out over multiple batches.
    const exitLog = await ExitLog.create({
      batchId: stock[0]?._id, // Just linking one batch if necessary, or modify schema below
      productId: new ObjectId(productId),
      locationId: new ObjectId(locationId),
      qty: Number(qty),
      reason,
      note
    });

    // We should use locationId directly or map to warehouseId if OutboundLog expects it. 
    // Usually locationId is interchangeable with warehouseId, but let's check stock[0]?.warehouseId
    // If not found, use locationId as warehouseId fallback.
    const wId = stock.length > 0 && stock[0].warehouseId ? stock[0].warehouseId : new ObjectId(locationId);

    // Create outbound log for stock report
    await OutboundLog.create({
      warehouseId: wId,
      productId: new ObjectId(productId),
      quantity: Number(qty),
      date: new Date()
    });

    return NextResponse.json({
      noResult: false,
      message: "Exit item successfully recorded",
      result: exitLog,
      error: false
    });
  } catch (e: any) {
    console.log(e);
    return NextResponse.json({
      noResult: false,
      message: e.message,
      result: null,
      error: true
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    
    const logs = await ExitLog.aggregate([
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location'
        }
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
        $unwind: '$location'
      },
      {
        $unwind: '$product'
      },
      {
        $sort: { date: -1 }
      }
    ]);

    return NextResponse.json({
      noResult: false,
      message: "",
      result: logs,
      error: false
    });
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    }, { status: 500 });
  }
}
