import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Companie from "@/models/Companie";
import User from "@/models/User";
import ExitLog from "@/models/ExitLog";
import OutboundLog from "@/models/OutboundLog";
import InboundLog from "@/models/InboundLog";
import Batche from "@/models/Batche";

// ─── PUT /api/web/inventory/exit-items/[id] ───────────────────────────────────
// action = 'edit'       Body: { masterAccountId, action, newQty, approvalCode, userId, userName }
// action = 'store_back' Body: { masterAccountId, action, storeBackQty, approvalCode, userId, userName }
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id: exitLogId } = await params;
    const body = await request.json();
    const { masterAccountId, action, approvalCode, userId, userName } = body;

    if (!masterAccountId || !action || !approvalCode || !exitLogId) {
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

    // Load the ExitLog
    const exitLog = await ExitLog.findById(exitLogId);
    if (!exitLog) {
      return NextResponse.json({ error: true, message: "Exit log tidak ditemukan" }, { status: 404 });
    }

    // ── ACTION: edit ──────────────────────────────────────────────────────────
    if (action === "edit") {
      const newQty = Number(body.newQty);
      if (!newQty || newQty <= 0) {
        return NextResponse.json({ error: true, message: "Qty baru harus lebih dari 0" }, { status: 400 });
      }
      if (exitLog.status === "STORED_BACK") {
        return NextResponse.json(
          { error: true, message: "Exit log yang sudah di-store back tidak bisa diedit" },
          { status: 400 }
        );
      }

      const oldQty = exitLog.qty;
      const delta = newQty - oldQty; // positive = need more stock out, negative = return stock

      const warehouseObjId = exitLog.warehouseId;
      const productObjId = exitLog.productId;

      if (delta > 0) {
        // Need to deduct MORE stock from batches
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
        // Return stock to batches (increase availability)
        const returnQty = Math.abs(delta);
        const batches = await Batche.find({
          warehouseId: warehouseObjId,
          productId: productObjId,
        }).sort({ createdAt: -1 }); // LIFO for returns

        let remaining = returnQty;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const canReturn = Math.min(batch.outQty, remaining);
          if (canReturn <= 0) continue;
          await Batche.findByIdAndUpdate(batch._id, { $inc: { outQty: -canReturn } });
          remaining -= canReturn;
        }
      }

      // Replace OutboundLog: delete old matching entry, create new one
      // We match by warehouseId + productId + quantity (oldQty) within a small time window, or just delete one
      const oldOutbound = await OutboundLog.findOneAndDelete({
        warehouseId: warehouseObjId,
        productId: productObjId,
        quantity: oldQty,
      });

      if (!oldOutbound && oldQty !== newQty) {
        // Fallback: still create correction even if exact match not found
        console.warn("Could not find matching OutboundLog to delete for exit edit");
      }

      // Create fresh OutboundLog with new qty
      await OutboundLog.create({
        warehouseId: warehouseObjId,
        productId: productObjId,
        quantity: newQty,
        date: new Date(),
      });

      // Update ExitLog
      exitLog.originalQty = exitLog.originalQty ?? oldQty; // preserve original on first edit
      exitLog.qty = newQty;
      exitLog.status = "EDITED";
      exitLog.lastEditApprovedByName = validUserName;
      exitLog.lastEditAt = new Date();
      await exitLog.save();

      return NextResponse.json({
        error: false,
        message: `Qty exit berhasil diubah dari ${oldQty} → ${newQty}`,
        result: exitLog,
      });
    }

    // ── ACTION: store_back ────────────────────────────────────────────────────
    if (action === "store_back") {
      const storeBackQty = Number(body.storeBackQty);
      if (!storeBackQty || storeBackQty <= 0) {
        return NextResponse.json({ error: true, message: "Qty store back harus lebih dari 0" }, { status: 400 });
      }

      const remainingExitable = exitLog.qty - (exitLog.storedBackQty || 0);
      if (storeBackQty > remainingExitable) {
        return NextResponse.json(
          {
            error: true,
            message: `Qty store back (${storeBackQty}) melebihi sisa yang bisa dikembalikan (${remainingExitable})`,
          },
          { status: 400 }
        );
      }

      const warehouseObjId = exitLog.warehouseId!;
      const productObjId = exitLog.productId!;

      // Return stock to batches (LIFO)
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

      // Create InboundLog
      await InboundLog.create({
        warehouseId: warehouseObjId,
        productId: productObjId,
        quantity: storeBackQty,
        date: new Date(),
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        sourceType: "STORE_BACK",
        sourceId: exitLog._id,
        approvedByName: validUserName,
        note: `Store back dari ExitLog ${exitLog._id}`,
      });

      // Update ExitLog
      const newStoredBackQty = (exitLog.storedBackQty || 0) + storeBackQty;
      exitLog.storedBackQty = newStoredBackQty;
      exitLog.storedBackAt = new Date();
      exitLog.storeBackApprovedByName = validUserName;
      if (newStoredBackQty >= exitLog.qty) {
        exitLog.status = "STORED_BACK";
      }
      await exitLog.save();

      return NextResponse.json({
        error: false,
        message: `${storeBackQty} item berhasil di-store back ke gudang`,
        result: exitLog,
      });
    }

    return NextResponse.json({ error: true, message: "Action tidak dikenal" }, { status: 400 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: true, message: (e as Error).message, result: null },
      { status: 500 }
    );
  }
}
