import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import AdjustLog from "@/models/AdjustLog";
import OutboundLog from "@/models/OutboundLog";
import InboundLog from "@/models/InboundLog";
import Batche from "@/models/Batche";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id: adjustLogId } = await params;
    const body = await request.json();
    const { masterAccountId, action, approvalCode, userId } = body;

    if (!masterAccountId || !action || !approvalCode || !adjustLogId) {
      return NextResponse.json(
        { error: true, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate approval code
    const approver = await User.findOne({ approvalCode });
    if (!approver) {
      return NextResponse.json(
        { error: true, message: "Kode approval tidak valid" },
        { status: 403 }
      );
    }
    const validUserName = approver.name || approver.username || "—";

    // Load the AdjustLog
    const adjustLog = await AdjustLog.findById(adjustLogId);
    if (!adjustLog) {
      return NextResponse.json({ error: true, message: "Adjust log tidak ditemukan" }, { status: 404 });
    }

    // ── ACTION: edit ──────────────────────────────────────────────────────────
    if (action === "edit") {
      const newQty = Number(body.newQty);
      if (!newQty || newQty <= 0) {
        return NextResponse.json({ error: true, message: "Qty baru harus lebih dari 0" }, { status: 400 });
      }
      if (adjustLog.status === "STORED_BACK") {
        return NextResponse.json(
          { error: true, message: "Adjust log yang sudah di-store back tidak bisa diedit" },
          { status: 400 }
        );
      }

      const oldQty = adjustLog.qty;
      const delta = newQty - oldQty;

      const warehouseObjId = adjustLog.warehouseId;
      const productObjId = adjustLog.productId;

      if (delta > 0) {
        const batches = await Batche.find({
          warehouseId: warehouseObjId,
          productId: productObjId,
          status: "ACTIVE",
        }).sort({ createdAt: 1 });

        const totalAvailable = batches.reduce(
          (sum, b) => sum + (b.accumulative - b.outQty - (b.reserved || 0)),
          0
        );

        if (delta > totalAvailable) {
          return NextResponse.json(
            { error: true, message: `Stock tidak cukup untuk penambahan qty. Tersedia: ${totalAvailable}` },
            { status: 400 }
          );
        }

        let remaining = delta;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const avail = batch.accumulative - batch.outQty - (batch.reserved || 0);
          if (avail <= 0) continue;
          const deduct = Math.min(avail, remaining);
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: deduct } });
          remaining -= deduct;
        }
      } else if (delta < 0) {
        const returnQty = Math.abs(delta);
        const batches = await Batche.find({
          warehouseId: warehouseObjId,
          productId: productObjId,
        }).sort({ createdAt: -1 });

        let remaining = returnQty;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const canReturn = Math.min(batch.outQty, remaining);
          if (canReturn <= 0) continue;
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: -canReturn } });
          remaining -= canReturn;
        }
      }

      const oldOutbound = await OutboundLog.findOneAndDelete({
        warehouseId: warehouseObjId,
        productId: productObjId,
        quantity: oldQty,
      });

      if (!oldOutbound && oldQty !== newQty) {
        console.warn("Could not find matching OutboundLog to delete for adjust edit");
      }

      const newOutbound = await OutboundLog.create({
        warehouseId: warehouseObjId,
        productId: productObjId,
        quantity: newQty,
        date: new Date(),
      });

      adjustLog.originalQty = adjustLog.originalQty ?? oldQty;
      adjustLog.qty = newQty;
      adjustLog.status = "EDITED";
      adjustLog.lastEditApprovedByName = validUserName;
      adjustLog.lastEditAt = new Date();
      adjustLog.outboundLogId = newOutbound._id;
      await adjustLog.save();

      return NextResponse.json({
        error: false,
        message: `Qty adjust berhasil diubah dari ${oldQty} → ${newQty}`,
        result: adjustLog,
      });
    }

    // ── ACTION: store_back ────────────────────────────────────────────────────
    if (action === "store_back") {
      const storeBackQty = Number(body.storeBackQty);
      if (!storeBackQty || storeBackQty <= 0) {
        return NextResponse.json({ error: true, message: "Qty store back harus lebih dari 0" }, { status: 400 });
      }

      const remainingAdjustable = adjustLog.qty - (adjustLog.storedBackQty || 0);
      if (storeBackQty > remainingAdjustable) {
        return NextResponse.json(
          {
            error: true,
            message: `Qty store back (${storeBackQty}) melebihi sisa yang bisa dikembalikan (${remainingAdjustable})`,
          },
          { status: 400 }
        );
      }

      const warehouseObjId = adjustLog.warehouseId;
      const productObjId = adjustLog.productId;

      const batches = await Batche.find({
        warehouseId: warehouseObjId,
        productId: productObjId,
      }).sort({ createdAt: -1 });

      let remaining = storeBackQty;
      for (const batch of batches) {
        if (remaining <= 0) break;
        const canReturn = Math.min(batch.outQty, remaining);
        if (canReturn <= 0) continue;
        await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: -canReturn } });
        remaining -= canReturn;
      }

      await InboundLog.create({
        warehouseId: warehouseObjId,
        productId: productObjId,
        quantity: storeBackQty,
        date: new Date(),
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        sourceType: "STORE_BACK",
        sourceId: adjustLog._id,
        approvedByName: validUserName,
        note: `Store back dari AdjustLog ${adjustLog._id}`,
      });

      const newStoredBackQty = (adjustLog.storedBackQty || 0) + storeBackQty;
      adjustLog.storedBackQty = newStoredBackQty;
      adjustLog.storedBackAt = new Date();
      adjustLog.storeBackApprovedByName = validUserName;
      if (newStoredBackQty >= adjustLog.qty) {
        adjustLog.status = "STORED_BACK";
      }
      await adjustLog.save();

      return NextResponse.json({
        error: false,
        message: `${storeBackQty} item berhasil di-store back ke gudang`,
        result: adjustLog,
      });
    }

    return NextResponse.json({ error: true, message: "Action tidak dikenal" }, { status: 400 });
  }
  catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: true, message: (e as Error).message, result: null },
      { status: 500 }
    );
  }
}
