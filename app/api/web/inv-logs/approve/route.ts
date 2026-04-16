import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import InvLog from '@/models/InvLog';

// ─── PUT /api/web/inv-logs/approve ────────────────────────────────────────────
// Finance approve or reject a procurement log.
//
// Validations:
//   - Log must exist
//   - Log must currently be in "pending" status (cannot re-approve or approve rejected)
//
// Body: { _id, action: "approved" | "rejected" }
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { _id, action } = body;

    if (!_id || !action) {
      return NextResponse.json({ noResult: true, message: '_id and action are required', result: null, error: true });
    }

    if (action !== 'approved' && action !== 'rejected') {
      return NextResponse.json({ noResult: true, message: 'action must be "approved" or "rejected"', result: null, error: true });
    }

    const log = await InvLog.findById(_id);
    if (!log) {
      return NextResponse.json({ noResult: true, message: 'Log not found', result: null, error: true });
    }

    // Guard: only pending logs can be approved or rejected
    if (log.finance_status !== 'pending') {
      return NextResponse.json({
        noResult: true,
        message: `Cannot ${action} a log that is already "${log.finance_status}"`,
        result: null,
        error: true,
      });
    }

    const updated = await InvLog.findByIdAndUpdate(
      _id,
      {
        finance_status: action,
        approved_at: new Date(),
      },
      { new: true }
    );

    return NextResponse.json({ noResult: false, message: '', result: updated, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
