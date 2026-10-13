import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Companie from '@/models/Companie';
import InvItem from '@/models/InvItem';

// ─── GET /api/web/inv-items?id=<masterAccountId> ─────────────────────────────
// Returns all internal items for the company, sorted by name.
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

    const items = await InvItem.find({ companyId: company._id }).sort({ name: 1 });

    return NextResponse.json({ noResult: false, message: '', result: items, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}

// ─── POST /api/web/inv-items ──────────────────────────────────────────────────
// Creates a new internal item. Price is NOT stored here.
// Body: { id (masterAccountId), name, unit, category? }
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, name, unit, category } = body;

    if (!id || !name || !unit) {
      return NextResponse.json({ noResult: true, message: 'id, name, and unit are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const itemCode = `ITM-${String(Date.now()).slice(-7)}`;

    const item = await InvItem.create({
      companyId: company._id,
      name: name.trim(),
      unit: unit.trim(),
      category: category?.trim() ?? '',
      currentStock: 0,
      itemCode,
    });

    return NextResponse.json({ noResult: false, message: '', result: item, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}

// ─── PUT /api/web/inv-items ───────────────────────────────────────────────────
// Updates an existing internal item.
// Body: { id (masterAccountId), itemId, name, unit, category? }
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { id, itemId, name, unit, category } = body;

    if (!id || !itemId || !name || !unit) {
      return NextResponse.json({ noResult: true, message: 'id, itemId, name, and unit are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const item = await InvItem.findOneAndUpdate(
      { _id: itemId, companyId: company._id },
      {
        name: name.trim(),
        unit: unit.trim(),
        category: category?.trim() ?? '',
      },
      { new: true }
    );

    if (!item) {
      return NextResponse.json({ noResult: true, message: 'Item not found', result: null, error: true });
    }

    return NextResponse.json({ noResult: false, message: '', result: item, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
