import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import InvLog from '@/models/InvLog';
import InvItem from '@/models/InvItem';

// ─── PUT /api/web/inv-logs/receive ────────────────────────────────────────────
// Mark a procurement log as received and update the item's stock.
//
// This is an ATOMIC operation:
//   1. Validate log (must be approved + not yet received)
//   2. findByIdAndUpdate with $inc on InvItem (atomic stock increment)
//   3. Mark InvLog as received (received_status: true, received_at: now)
//
// Guards:
//   - finance_status must be "approved"
//   - received_status must be false (idempotency — prevents double stock update)
//
// Body: { _id }
export async function PUT(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id } = body;

    if (!_id) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ noResult: true, message: '_id is required', result: null, error: true });
    }

    const log = await InvLog.findById(_id).session(session);
    if (!log) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ noResult: true, message: 'Log not found', result: null, error: true });
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

    const item = await InvItem.findById(log.itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ noResult: true, message: 'Associated item not found', result: null, error: true });
    }

    // Atomic stock increment — safe under concurrent requests
    await InvItem.findByIdAndUpdate(
      log.itemId,
      { $inc: { currentStock: log.qty } },
      { session, new: true }
    );

    const now = new Date();
    const updatedLog = await InvLog.findByIdAndUpdate(
      _id,
      {
        received_status: true,
        received_at: now,
      },
      { session, new: true }
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      noResult: false,
      message: `Successfully received ${log.qty} ${item.unit} of "${item.name}". Stock updated.`,
      result: updatedLog,
      error: false,
    });
  } catch (e: unknown) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
