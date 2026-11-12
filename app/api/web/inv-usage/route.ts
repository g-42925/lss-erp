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
    const { id, itemId, qty, note, fStock } = body;

    if (!id || !itemId || !qty) return NextResponse.json({ noResult: true, message: 'id, itemId, and qty are required', result: null, error: true });

    const company = await Companie.findOne({ masterAccountId: id });

    if (!company) return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });


    const item = await InvItem.findOne({ _id: itemId, companyId: company._id });
    if (!item) return NextResponse.json({ noResult: true, message: 'Item not found', result: null, error: true });


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
      { currentStock: fStock }
    );

    return NextResponse.json({ noResult: false, message: 'Stock decremented successfully', result: usage, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}

export async function PUT(request: NextRequest) {
  let status = 500

  try {
    await connectToDatabase()

    const url = new URL(request.url)
    const masterAccountId = url.searchParams.get('id')
    const body = await request.json()

    const { _id, qty, note } = body

    if (!masterAccountId || !_id || qty === undefined || qty === null) {
      status = 400
      throw new Error('id, _id, and qty are required')
    }

    const newQty = Number(qty)

    if (!Number.isFinite(newQty) || newQty <= 0) {
      status = 400
      throw new Error('Quantity must be greater than zero')
    }

    const company = await Companie.findOne({ masterAccountId })

    if (!company) {
      status = 404
      throw new Error('Company not found')
    }

    const session = await InvUsage.db.startSession()

    let updatedUsage: any = null

    try {
      await session.withTransaction(async () => {
        // Find existing usage
        const usage = await InvUsage.findOne({
          _id,
          companyId: company._id,
        }).session(session)

        if (!usage) {
          status = 404
          throw new Error('Usage record not found')
        }

        // Find related inventory item
        const item = await InvItem.findOne({
          _id: usage.itemId,
          companyId: company._id,
        }).session(session)

        if (!item) {
          status = 404
          throw new Error('Inventory item not found')
        }

        // Calculate quantity difference
        const difference = newQty - usage.qty

        if (difference > 0) {
          // Additional usage: decrement stock
          const result = await InvItem.updateOne(
            {
              _id: item._id,
              companyId: company._id,
              currentStock: { $gte: difference },
            },
            {
              $inc: { currentStock: -difference },
            },
            { session }
          )

          if (result.modifiedCount === 0) {
            status = 400
            throw new Error(
              `Insufficient stock. Available: ${item.currentStock}`
            )
          }
        } else if (difference < 0) {
          // Reduced usage: return stock
          await InvItem.updateOne(
            {
              _id: item._id,
              companyId: company._id,
            },
            {
              $inc: { currentStock: Math.abs(difference) },
            },
            { session }
          )
        }

        // Update usage record
        const updateData: Record<string, any> = {
          qty: newQty,
        }

        if (note !== undefined) {
          updateData.note = String(note).trim()
        }

        updatedUsage = await InvUsage.findOneAndUpdate(
          {
            _id,
            companyId: company._id,
          },
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
            session,
          }
        )
      })

      await updatedUsage.populate(
        'itemId',
        'name unit itemCode category'
      )

    }
    finally {
      await session.endSession()
    }

    return NextResponse.json({
      noResult: false,
      message: 'Usage updated and stock adjusted successfully',
      result: updatedUsage,
      error: false,
    })

  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: (e as Error).message,
      result: null,
      error: true,
    }, { status })
  }
}
