import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Companie from '@/models/Companie';
import ExitLog from '@/models/ExitLog';
import AdjustLog from '@/models/AdjustLog';
import RefundLog from '@/models/RefundLog';
import User from '@/models/User';

// ─── GET /api/web/reports/remarks ──────────────────────────────────────────────
// Query: id (masterAccountId), startDate?, endDate?, type? (exit|adjust|retur|all)
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const type = url.searchParams.get('type') || 'all'; // exit | adjust | retur | all

    if (!masterAccountId) {
      return NextResponse.json({ error: true, message: 'Missing id param', result: null });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ error: true, message: 'Company not found', result: null });
    }

    const companyObjId = company._id;

    // Date range filter
    const dateFilter: Record<string, unknown> = {};
    if (startDateStr && endDateStr) {
      dateFilter.$gte = new Date(startDateStr + 'T00:00:00+07:00');
      dateFilter.$lte = new Date(endDateStr + 'T23:59:59+07:00');
    }

    const results: RemarkEntry[] = [];

    // ─── 1. Exit Items ───────────────────────────────────────────────────────────
    if (type === 'all' || type === 'exit') {
      const exitMatch: Record<string, unknown> = { companyId: companyObjId };
      if (dateFilter.$gte) exitMatch.date = dateFilter;

      const exitLogs = await ExitLog.aggregate([
        { $match: exitMatch },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        {
          $lookup: {
            from: 'warehouses',
            localField: 'warehouseId',
            foreignField: '_id',
            as: 'warehouse',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
        { $sort: { date: -1 } },
      ]);

      for (const log of exitLogs) {
        const entry: RemarkEntry = {
          _id: String(log._id),
          type: 'exit',
          typeLabel: 'Exit Item',
          date: log.date,
          productName: log.product?.productName || '—',
          productCode: log.product?.productId || '—',
          warehouseName: log.warehouse?.name || '—',
          qty: log.qty,
          originalQty: log.originalQty ?? null,
          reason: log.reason || '—',
          note: log.note || '',
          createdByName: log.createdByName || '—',
          approvedByName: log.approvedByName || '—',
          status: log.status || 'ACTIVE',
          // Edit audit trail
          lastEditApprovedByName: log.lastEditApprovedByName || null,
          lastEditAt: log.lastEditAt || null,
          // Store back
          storedBackQty: log.storedBackQty || 0,
          storedBackAt: log.storedBackAt || null,
          storeBackApprovedByName: log.storeBackApprovedByName || null,
        };
        results.push(entry);
      }
    }

    // ─── 2. Adjustments ──────────────────────────────────────────────────────────
    if (type === 'all' || type === 'adjust') {
      const adjustMatch: Record<string, unknown> = { companyId: companyObjId };
      if (dateFilter.$gte) adjustMatch.date = dateFilter;

      const adjustLogs = await AdjustLog.aggregate([
        { $match: adjustMatch },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        {
          $lookup: {
            from: 'warehouses',
            localField: 'warehouseId',
            foreignField: '_id',
            as: 'warehouse',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdByUser',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'approvedBy',
            foreignField: '_id',
            as: 'approvedByUser',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$createdByUser', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$approvedByUser', preserveNullAndEmptyArrays: true } },
        { $sort: { date: -1 } },
      ]);

      for (const log of adjustLogs) {
        const entry: RemarkEntry = {
          _id: String(log._id),
          type: 'adjust',
          typeLabel: 'Adjustment',
          date: log.date,
          productName: log.product?.productName || '—',
          productCode: log.product?.productId || '—',
          warehouseName: log.warehouse?.name || '—',
          qty: log.qty,
          originalQty: log.originalQty ?? null,
          reason: log.reason || '—',
          note: log.note || '',
          createdByName: log.createdByUser?.name || '—',
          approvedByName: log.approvedByUser?.name || '—',
          status: log.status || 'ACTIVE',
          lastEditApprovedByName: log.lastEditApprovedByName || null,
          lastEditAt: log.lastEditAt || null,
          storedBackQty: log.storedBackQty || 0,
          storedBackAt: log.storedBackAt || null,
          storeBackApprovedByName: log.storeBackApprovedByName || null,
        };
        results.push(entry);
      }
    }

    // ─── 3. Returns (Retur / RefundLog) ──────────────────────────────────────────
    if (type === 'all' || type === 'retur') {
      const returMatch: Record<string, unknown> = { companyId: companyObjId };
      if (dateFilter.$gte) returMatch.createdAt = dateFilter;

      const refundLogs = await RefundLog.aggregate([
        { $match: returMatch },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        {
          $lookup: {
            from: 'warehouses',
            localField: 'warehouseId',
            foreignField: '_id',
            as: 'warehouse',
          },
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
      ]);

      for (const log of refundLogs) {
        const entry: RemarkEntry = {
          _id: String(log._id),
          type: 'retur',
          typeLabel: 'Retur',
          date: log.createdAt,
          productName: log.product?.productName || '—',
          productCode: log.product?.productId || '—',
          warehouseName: log.warehouse?.name || '—',
          qty: log.qty,
          originalQty: null,
          reason: `Order: ${log.salesOrderNumber || '—'}`,
          note: `Refund Amount: Rp ${(log.refundAmount || 0).toLocaleString('id-ID')}`,
          createdByName: log.createdByName || '—',
          approvedByName: log.approvedByName || '—',
          status: log.status || 'refunded',
          lastEditApprovedByName: null,
          lastEditAt: null,
          storedBackQty: log.storedBackQty || 0,
          storedBackAt: log.storedBackAt || null,
          storeBackApprovedByName: null,
        };
        results.push(entry);
      }
    }

    // Sort all combined results by date descending
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ error: false, message: '', result: results });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: true, message: (e as Error).message, result: null },
      { status: 500 }
    );
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface RemarkEntry {
  _id: string;
  type: 'exit' | 'adjust' | 'retur';
  typeLabel: string;
  date: Date | string;
  productName: string;
  productCode: string;
  warehouseName: string;
  qty: number;
  originalQty: number | null;
  reason: string;
  note: string;
  createdByName: string;
  approvedByName: string;
  status: string;
  lastEditApprovedByName: string | null;
  lastEditAt: Date | string | null;
  storedBackQty: number;
  storedBackAt: Date | string | null;
  storeBackApprovedByName: string | null;
}
