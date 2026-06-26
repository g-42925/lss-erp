import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import AdjustLog from '@/models/AdjustLog';
import OutboundLog from '@/models/OutboundLog';
import Batche from '@/models/Batche';
import User from '@/models/User';
import Location from '@/models/Location';
import Warehouse from '@/models/Warehouse';
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { warehouseId, productId, qty, reason, note, approvalCode, userId } = await request.json();

    if (!warehouseId || !productId || !qty || !reason || !approvalCode || !userId) {
      return NextResponse.json({ error: true, message: "Missing required fields" }, { status: 400 });
    }

    // Verify approval code
    const approver = await User.findOne({ approvalCode });
    if (!approver) {
      return NextResponse.json({ error: true, message: "Invalid approval code" }, { status: 400 });
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return NextResponse.json({ error: true, message: "Warehouse not found" }, { status: 400 });
    }

    let locationId = warehouse.locationId;
    if (!locationId) {
      const defaultLoc = await Location.findOne();
      locationId = defaultLoc?._id;
    }

    let remainingQtyToAdjust = Number(qty);
    const stock = await Batche.find({
      productId: new mongoose.Types.ObjectId(productId),
      locationId: new mongoose.Types.ObjectId(locationId)
    });

    const totalAvailable = stock.reduce((sum, batch) => sum + (batch.accumulative - batch.outQty - (batch.reserved || 0)), 0);

    if (remainingQtyToAdjust > totalAvailable) {
      return NextResponse.json({ error: true, message: "Quantity exceeds available stock in location" }, { status: 400 });
    }

    for (const batch of stock) {
      if (remainingQtyToAdjust <= 0) break;
      const availableInBatch = batch.accumulative - batch.outQty - (batch.reserved || 0);
      if (availableInBatch > 0) {
        if (availableInBatch >= remainingQtyToAdjust) {
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: remainingQtyToAdjust } });
          remainingQtyToAdjust = 0;
        } else {
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: availableInBatch } });
          remainingQtyToAdjust -= availableInBatch;
        }
      }
    }

    // Create outbound log and store its _id on the adjust log
    const outboundLog = await OutboundLog.create({
      warehouseId: new ObjectId(warehouseId),
      productId: new ObjectId(productId),
      quantity: Number(qty),
      date: new Date()
    });

    const adjustLog = await AdjustLog.create({
      warehouseId: new ObjectId(warehouseId),
      productId: new ObjectId(productId),
      qty: Number(qty),
      reason,
      note,
      outboundLogId: outboundLog._id,
      approvedBy: approver._id,
      createdBy: new ObjectId(userId)
    });

    return NextResponse.json({
      noResult: false,
      message: "Adjustment recorded successfully",
      result: adjustLog,
      error: false
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true }, { status: 500 });
  }
}



export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const warehouseId = url.searchParams.get("warehouseId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  try {
    await connectToDatabase();

    const matchStage: Record<string, unknown> = {};
    if (warehouseId) {
      matchStage.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: end
      };
    }

    const logs = await AdjustLog.aggregate([
      { $match: matchStage },
      {
        $match: {
          $expr: {
            $gt: ["$qty", { $ifNull: ["$storedBackQty", 0] }]
          }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouseId',
          foreignField: '_id',
          as: 'warehouse'
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
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approver'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$approver', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      { $sort: { date: -1 } }
    ]);

    return NextResponse.json({
      noResult: false,
      message: "",
      result: logs,
      error: false
    });
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true
    }, { status: 500 });
  }
}
