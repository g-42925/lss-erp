import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import VoucherCash from "@/models/VoucherCash";
import Invoice from "@/models/Invoice";
import Cashflow from "@/models/Cashflow";
import Log from "@/models/Log";
import mongoose from "mongoose";

// ─── GET single voucher by ID ────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const voucher = await VoucherCash.findById(id).lean();
    if (!voucher) return NextResponse.json({ noResult: true, message: "Not found", result: null, error: true });
    return NextResponse.json({ noResult: false, result: voucher, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: null, error: true });
  }
}

// ─── PUT: update voucher ─────────────────────────────────────────────────────
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const existing = await VoucherCash.findById(id);
    if (!existing) return NextResponse.json({ noResult: true, message: "Not found", result: null, error: true });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Unlink old relations
      for (const item of (existing.items || [])) {
        if (item.refModel === "Invoice" && item.refId && item.paymentHistoryId) {
          await Invoice.updateOne(
            { _id: item.refId, "paymentHistory._id": item.paymentHistoryId },
            { $unset: { "paymentHistory.$.voucherId": "" } },
            { session }
          );
        } else if (item.refModel === "Cashflow" && item.refId) {
          await Cashflow.updateOne(
            { _id: item.refId },
            { $unset: { voucherId: "" } },
            { session }
          );
        } else if ((item.refModel === "Purchase" || item.refModel === "Debt") && item.paymentHistoryId) {
          await Log.updateOne(
            { _id: item.paymentHistoryId },
            { $unset: { voucherId: "" } },
            { session }
          );
        }
      }

      // Update voucher
      const updated = await VoucherCash.findByIdAndUpdate(
        id,
        { $set: { ...body } },
        { new: true, session }
      );

      // Re-link new relations
      for (const item of (body.items || [])) {
        if (item.refModel === "Invoice" && item.refId && item.paymentHistoryId) {
          await Invoice.updateOne(
            { _id: new mongoose.Types.ObjectId(item.refId), "paymentHistory._id": new mongoose.Types.ObjectId(item.paymentHistoryId) },
            { $set: { "paymentHistory.$.voucherId": updated._id } },
            { session }
          );
        } else if (item.refModel === "Cashflow" && item.refId) {
          await Cashflow.updateOne(
            { _id: new mongoose.Types.ObjectId(item.refId) },
            { $set: { voucherId: updated._id } },
            { session }
          );
        } else if ((item.refModel === "Purchase" || item.refModel === "Debt") && item.paymentHistoryId) {
          await Log.updateOne(
            { _id: new mongoose.Types.ObjectId(item.paymentHistoryId) },
            { $set: { voucherId: updated._id } },
            { session }
          );
        }
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ noResult: false, result: updated, error: false });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: null, error: true });
  }
}

// ─── DELETE: remove voucher and unlink relations ──────────────────────────────
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const voucher = await VoucherCash.findById(id);
    if (!voucher) return NextResponse.json({ noResult: true, message: "Not found", result: null, error: true });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Unlink all relations
      for (const item of (voucher.items || [])) {
        if (item.refModel === "Invoice" && item.refId && item.paymentHistoryId) {
          await Invoice.updateOne(
            { _id: item.refId, "paymentHistory._id": item.paymentHistoryId },
            { $unset: { "paymentHistory.$.voucherId": "" } },
            { session }
          );
        } else if (item.refModel === "Cashflow" && item.refId) {
          await Cashflow.updateOne(
            { _id: item.refId },
            { $unset: { voucherId: "" } },
            { session }
          );
        } else if ((item.refModel === "Purchase" || item.refModel === "Debt") && item.paymentHistoryId) {
          await Log.updateOne(
            { _id: item.paymentHistoryId },
            { $unset: { voucherId: "" } },
            { session }
          );
        }
      }

      await VoucherCash.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ noResult: false, result: { deleted: true }, error: false });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: null, error: true });
  }
}
