import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Companie from '@/models/Companie';
import InvItem from '@/models/InvItem';
import InvUsage from '@/models/InvUsage';

// ─── GET /api/web/inv-usage?id=<masterAccountId> ─────────────────────────────
// Returns usage history for the company.
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

    // Populate the item details
    const usageHistory = await InvUsage.find({ companyId: company._id })
      .populate('itemId', 'name unit itemCode category')
      .sort({ usage_at: -1 });

    return NextResponse.json({ noResult: false, message: '', result: usageHistory, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}

// ─── POST /api/web/inv-usage ──────────────────────────────────────────────────
// Creates a usage record and decrements stock.
// Body: { id (masterAccountId), itemId, qty, note? }
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, itemId, qty, note } = body;

    if (!id || !itemId || !qty) {
      return NextResponse.json({ noResult: true, message: 'id, itemId, and qty are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const item = await InvItem.findOne({ _id: itemId, companyId: company._id });
    if (!item) {
      return NextResponse.json({ noResult: true, message: 'Item not found', result: null, error: true });
    }

    if (item.currentStock < qty) {
      return NextResponse.json({ noResult: true, message: `Insufficient stock. Available: ${item.currentStock}`, result: null, error: true });
    }

    const usageNumber = `USG-${String(Date.now()).slice(-7)}`;

    // Create usage record
    const usage = await InvUsage.create({
      companyId: company._id,
      itemId,
      usageNumber,
      qty: Number(qty),
      note: note?.trim() ?? '',
      usage_at: new Date(),
    });

    // Atomically decrement stock
    await InvItem.updateOne(
      { _id: itemId },
      { $inc: { currentStock: -Number(qty) } }
    );

    return NextResponse.json({ noResult: false, message: 'Stock decremented successfully', result: usage, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
