import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import Companie from '@/models/Companie';
import InvItem from '@/models/InvItem';
import InvLog from '@/models/InvLog';
import InvUsage from '@/models/InvUsage';

/**
 * GET /api/web/inv-report?id=<masterAccountId>&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Returns a stock report per item with:
 *   - firstStock  : stock balance at the START of startDate (i.e. before startDate)
 *   - inbound     : total received qty between startDate (inclusive) and endDate (inclusive)
 *   - outbound    : total used qty between startDate (inclusive) and endDate (inclusive)
 *   - endStock    : firstStock + inbound - outbound
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    if (!masterAccountId) {
      return NextResponse.json({ noResult: true, message: 'Missing id param', result: null, error: true });
    }
    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ noResult: true, message: 'startDate and endDate are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    // Date boundaries
    // startDate: beginning of the day (00:00:00.000)
    // endDate  : end of the day (23:59:59.999)
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    // Everything BEFORE startDate (used to compute firstStock)
    const beforeStart = new Date(startDate);

    // ── All items for this company ────────────────────────────────────────────
    const items = await InvItem.find({ companyId: company._id }).lean();

    // ── All RECEIVED inbound logs before startDate (for firstStock) ───────────
    const inboundBefore = await InvLog.aggregate([
      {
        $match: {
          companyId: company._id,
          received_status: true,
          received_at: { $lt: beforeStart },
        },
      },
      {
        $group: {
          _id: '$itemId',
          totalQty: { $sum: '$qty' },
        },
      },
    ]);

    // ── All USAGE logs before startDate (for firstStock) ─────────────────────
    const usageBefore = await InvUsage.aggregate([
      {
        $match: {
          companyId: company._id,
          usage_at: { $lt: beforeStart },
        },
      },
      {
        $group: {
          _id: '$itemId',
          totalQty: { $sum: '$qty' },
        },
      },
    ]);

    // ── Inbound in range [startDate, endDate] ─────────────────────────────────
    const inboundInRange = await InvLog.aggregate([
      {
        $match: {
          companyId: company._id,
          received_status: true,
          received_at: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$itemId',
          totalQty: { $sum: '$qty' },
        },
      },
    ]);

    // ── Outbound (usage) in range [startDate, endDate] ────────────────────────
    const usageInRange = await InvUsage.aggregate([
      {
        $match: {
          companyId: company._id,
          usage_at: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$itemId',
          totalQty: { $sum: '$qty' },
        },
      },
    ]);

    // ── Build lookup maps ─────────────────────────────────────────────────────
    type AggRow = { _id: unknown; totalQty: number };
    const toMap = (arr: AggRow[]) =>
      new Map(arr.map((x) => [String(x._id), x.totalQty]));

    const inboundBeforeMap = toMap(inboundBefore as AggRow[]);
    const usageBeforeMap   = toMap(usageBefore as AggRow[]);
    const inboundRangeMap  = toMap(inboundInRange as AggRow[]);
    const usageRangeMap    = toMap(usageInRange as AggRow[]);

    // ── Compose report rows ───────────────────────────────────────────────────
    const report = items.map((item) => {
      const id = String(item._id);

      const totalInboundBefore = inboundBeforeMap.get(id) ?? 0;
      const totalUsageBefore   = usageBeforeMap.get(id) ?? 0;

      const firstStock = totalInboundBefore - totalUsageBefore;
      const inbound    = inboundRangeMap.get(id) ?? 0;
      const outbound   = usageRangeMap.get(id) ?? 0;
      const endStock   = firstStock + inbound - outbound;

      return {
        itemId:    id,
        itemCode:  item.itemCode,
        name:      item.name,
        unit:      item.unit,
        category:  item.category || '',
        firstStock,
        inbound,
        outbound,
        endStock,
      };
    });

    // Only include items that had some activity OR currently have stock
    // (return all items always — let the UI filter if needed)
    return NextResponse.json({ noResult: false, message: '', result: report, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
