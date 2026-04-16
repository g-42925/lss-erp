import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Companie from '@/models/Companie';
import InvItem from '@/models/InvItem';
import InvLog from '@/models/InvLog';

// ─── GET /api/web/inv-logs?id=<masterAccountId> ───────────────────────────────
// Returns all inventory procurement logs with item details, sorted newest first.
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');

    if (!masterAccountId) {
      return NextResponse.json({ noResult: true, message: 'Missing id param', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const logs = await InvLog.aggregate([
      { $match: { companyId: company._id } },
      {
        $lookup: {
          from: 'invitems',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: -1 } },
    ]);

    return NextResponse.json({ noResult: false, message: '', result: logs, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}

// ─── POST /api/web/inv-logs ────────────────────────────────────────────────────
// Creates a new procurement log entry. finance_status defaults to "pending".
// Stock is NOT modified here.
// Body: { id (masterAccountId), itemId, qty, unitPrice, note? }
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, itemId, qty, unitPrice, note } = body;

    if (!id || !itemId || !qty || unitPrice === undefined) {
      return NextResponse.json({ noResult: true, message: 'id, itemId, qty, and unitPrice are required', result: null, error: true });
    }

    if (Number(qty) < 1) {
      return NextResponse.json({ noResult: true, message: 'qty must be at least 1', result: null, error: true });
    }
    if (Number(unitPrice) < 0) {
      return NextResponse.json({ noResult: true, message: 'unitPrice must be 0 or greater', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const item = await InvItem.findOne({ _id: itemId, companyId: company._id });
    if (!item) {
      return NextResponse.json({ noResult: true, message: 'Item not found', result: null, error: true });
    }

    const parsedQty = Number(qty);
    const parsedUnitPrice = Number(unitPrice);
    const totalPrice = parsedQty * parsedUnitPrice;
    const logNumber = `INV-${String(Date.now()).slice(-8)}`;

    const log = await InvLog.create({
      companyId: company._id,
      itemId: item._id,
      logNumber,
      qty: parsedQty,
      unitPrice: parsedUnitPrice,
      totalPrice,
      note: note?.trim() ?? '',
      finance_status: 'pending',
      received_status: false,
      approved_at: null,
      received_at: null,
    });

    // Return with item populated
    const result = { ...log.toObject(), item: item.toObject() };

    return NextResponse.json({ noResult: false, message: '', result, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
