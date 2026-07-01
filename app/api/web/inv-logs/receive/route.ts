import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import InvLog from '@/models/InvLog';
import InvItem from '@/models/InvItem';

// ─── PUT /api/web/inv-logs/receive ────────────────────────────────────────────
// Mark a procurement log as received, update stock, and write a receiving log.
//
// This is an ATOMIC operation (single Mongoose session / transaction):
//   1. Validate log (must be approved + not yet received)
//   2. $inc InvItem.currentStock  (atomic stock increment)
//   3. Mark InvLog as received    (received_status: true, received_at: now)
//   4. Insert InvReceiving record (audit / inbound history for stock-report)
//
// Guards:
//   - finance_status must be "approved"
//   - received_status must be false (idempotency — prevents double stock update)
//
// Body: { _id, date? (ISO string), note?, receivedBy? (userId) }
export async function PUT(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, date, note, receivedBy } = body;

    if (!_id) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
        noResult: true,
        message: '_id is required',
        result: null,
        error: true,
      });
    }

    // ── 1. Fetch log ──────────────────────────────────────────────────────────
    const log = await InvLog.findById(_id).session(session);
    if (!log) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
        noResult: true,
        message: 'Log not found',
        result: null,
        error: true,
      });
    }

    // Guard 1: must be finance-approved
    if (log.finance_status !== 'approved') {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
        noResult: true,
        message: `Cannot receive goods for a log with status "${log.finance_status}". Finance approval is required first.`,
        result: null,
        error: true,
      });
    }

    // Guard 2: idempotency — prevent double-receive
    if (log.received_status === true) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
        noResult: true,
        message: 'Goods for this log have already been received.',
        result: null,
        error: true,
      });
    }

    // ── 2. Validate item ──────────────────────────────────────────────────────
    const item = await InvItem.findById(log.itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({
        noResult: true,
        message: 'Associated item not found',
        result: null,
        error: true,
      });
    }

    const now = new Date();
    // Use caller-supplied date (business date) or fall back to now
    const receivingDate = date ? new Date(date) : now;

    // ── 3. Atomic stock increment ─────────────────────────────────────────────
    await InvItem.findByIdAndUpdate(
      log.itemId,
      { $inc: { currentStock: log.qty } },
      { session, new: true }
    );

    // ── 4. Mark InvLog as received ────────────────────────────────────────────
    const updatedLog = await InvLog.findByIdAndUpdate(
      _id,
      {
        received_status: true,
        received_at: now,
      },
      { session, new: true }
    );

    // ── 5. Insert InvReceiving record (audit trail) ───────────────────────────
    const [receivingRecord] = await InvReceiving.create(
      [
        {
          companyId: log.companyId,
          invLogId: log._id,
          itemId: log.itemId,
          qty: log.qty,
          unitPrice: log.unitPrice,
          totalPrice: log.totalPrice,
          receivedBy: receivedBy ?? null,
          note: note ?? log.note ?? '',
          date: receivingDate,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      noResult: false,
      message: `Successfully received ${log.qty} ${item.unit} of "${item.name}". Stock updated.`,
      result: {
        log: updatedLog,
        receiving: receivingRecord,
      },
      error: false,
    });
  } catch (e: unknown) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true,
    });
  }
}
