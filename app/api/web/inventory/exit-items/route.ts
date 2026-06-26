import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Companie from "@/models/Companie";
import ExitLog from "@/models/ExitLog";
import OutboundLog from "@/models/OutboundLog";
import Batche from "@/models/Batche";
import User from "@/models/User";

// ─── GET /api/web/inventory/exit-items ────────────────────────────────────────
// Query: id (masterAccountId), warehouseId?, startDate?, endDate?
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get("id");
    const warehouseId = url.searchParams.get("warehouseId");
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");

    if (!masterAccountId) {
      return NextResponse.json({ error: true, message: "Missing id param", result: null });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", result: null });
    }

    // Build match stage
    const matchStage: Record<string, unknown> = { companyId: company._id };

    if (warehouseId) {
      matchStage.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr + "T00:00:00+07:00");
      const endDate = new Date(endDateStr + "T23:59:59+07:00");
      matchStage.date = { $gte: startDate, $lte: endDate };
    }

    const logs = await ExitLog.aggregate([
      { $match: matchStage },
      {
        $match: {
          $expr: {
            $gt: ["$qty", "$storedBackQty"]
          }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$warehouse", preserveNullAndEmptyArrays: true } },
      { $sort: { date: -1 } },
    ]);

    console.log(logs)

    return NextResponse.json({ error: false, message: "", result: logs });
  }
  catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: true, message: (e as Error).message, result: null }, { status: 500 });
  }
}

// ─── POST /api/web/inventory/exit-items ───────────────────────────────────────
// Body: { id (masterAccountId), warehouseId, productId, qty, reason, note?, userId?, userName? }
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { id: masterAccountId, warehouseId, productId, qty, reason, note, userId, userName, approvalCode } = await request.json();

    if (!masterAccountId || !warehouseId || !productId || !qty || !reason || !approvalCode) {
      return NextResponse.json({ error: true, message: "Missing required fields" }, { status: 400 });
    }

    const approver = await User.findOne({ approvalCode });
    if (!approver) {
      return NextResponse.json({ error: true, message: "Kode approval tidak valid" }, { status: 403 });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found" }, { status: 404 });
    }

    const warehouseObjId = new mongoose.Types.ObjectId(warehouseId);
    const productObjId = new mongoose.Types.ObjectId(productId);
    const exitQty = Number(qty);

    // Find batches for this product in this warehouse
    const batches = await Batche.find({
      warehouseId: warehouseObjId,
      productId: productObjId,
      status: "ACTIVE",
    }).sort({ createdAt: 1 }); // FIFO

    const totalAvailable = batches.reduce(
      (sum, b) => sum + (b.accumulative - b.outQty - (b.reserved || 0)),
      0
    );

    if (exitQty > totalAvailable) {
      return NextResponse.json(
        { error: true, message: `Stock tidak cukup. Tersedia: ${totalAvailable}` },
        { status: 400 }
      );
    }

    // Deduct FIFO from batches
    let remaining = exitQty;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const avail = batch.accumulative - batch.outQty - (batch.reserved || 0);
      if (avail <= 0) continue;
      const deduct = Math.min(avail, remaining);
      await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: deduct } });
      remaining -= deduct;
    }

    // Create ExitLog (with warehouseId, companyId, and creator info)
    const exitLog = await ExitLog.create({
      companyId: company._id,
      warehouseId: warehouseObjId,
      productId: productObjId,
      qty: exitQty,
      reason,
      note: note || "",
      status: "ACTIVE",
      createdByUserId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      createdByName: userName || undefined,
      approvedByUserId: approver._id,
      approvedByName: approver.name,
    });

    // Create OutboundLog for stock report tracking
    await OutboundLog.create({
      warehouseId: warehouseObjId,
      productId: productObjId,
      quantity: exitQty,
      date: new Date(),
    });

    return NextResponse.json({
      error: false,
      message: "Exit item berhasil dicatat",
      result: exitLog,
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: true, message: (e as Error).message, result: null }, { status: 500 });
  }
}
