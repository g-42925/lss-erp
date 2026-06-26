import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Companie from '@/models/Companie';
import Product from '@/models/Product';
import InboundLog from '@/models/InboundLog';
import OutboundLog from '@/models/OutboundLog';
import Batche from '@/models/Batche';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');
    const warehouseId = url.searchParams.get('warehouseId');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    if (!masterAccountId) {
      return NextResponse.json({ noResult: true, message: 'Missing id param', result: null, error: true });
    }
    if (!warehouseId) {
      return NextResponse.json({ noResult: true, message: 'Warehouse limit required', result: [], error: false });
    }
    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ noResult: true, message: 'startDate and endDate are required', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    // Parse Dates — gunakan waktu lokal WIB (UTC+7)
    const startDate = new Date(startDateStr + 'T00:00:00+07:00');
    const endDate = new Date(endDateStr + 'T23:59:59+07:00');

    const warehouseObjId = new mongoose.Types.ObjectId(warehouseId);

    // Ambil semua produk (tipe barang) milik perusahaan
    const products = await Product.find({ productOf: company._id, productType: 'good' }).lean();

    // ── 1. CURRENT STOCK dari Batches (source of truth) ──────────────────────
    // endStock saat INI = accumulative - outQty (semua delivery sudah masuk sini)
    const currentBatchAgg = await Batche.aggregate([
      { $match: { warehouseId: warehouseObjId } },
      {
        $group: {
          _id: '$productId',
          accumulative: { $sum: '$accumulative' },
          outQty: { $sum: '$outQty' },
        }
      }
    ]);

    // ── 2. InboundLog SETELAH endDate (untuk roll back ke endDate) ────────────
    const inboundAfterEnd = await InboundLog.aggregate([
      { $match: { warehouseId: warehouseObjId, date: { $gt: endDate } } },
      { $group: { _id: '$productId', total: { $sum: '$quantity' } } }
    ]);

    // ── 3. OutboundLog SETELAH endDate (untuk roll back ke endDate) ───────────
    const outboundAfterEnd = await OutboundLog.aggregate([
      { $match: { warehouseId: warehouseObjId, date: { $gt: endDate } } },
      { $group: { _id: '$productId', total: { $sum: '$quantity' } } }
    ]);

    // ── 4. InboundLog dalam periode [startDate, endDate] ─────────────────────
    const inboundInRange = await InboundLog.aggregate([
      { $match: { warehouseId: warehouseObjId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$productId', total: { $sum: '$quantity' } } }
    ]);

    // ── 5. OutboundLog dalam periode [startDate, endDate] ────────────────────
    const outboundInRange = await OutboundLog.aggregate([
      { $match: { warehouseId: warehouseObjId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$productId', total: { $sum: '$quantity' } } }
    ]);

    // Build maps
    type AggBatch = { _id: unknown; accumulative: number; outQty: number };
    type AggLog = { _id: unknown; total: number };

    const batchMap = new Map((currentBatchAgg as AggBatch[]).map(x => [String(x._id), (x.accumulative || 0) - (x.outQty || 0)]));
    const inAfterMap = new Map((inboundAfterEnd as AggLog[]).map(x => [String(x._id), x.total || 0]));
    const outAfterMap = new Map((outboundAfterEnd as AggLog[]).map(x => [String(x._id), x.total || 0]));
    const inRangeMap = new Map((inboundInRange as AggLog[]).map(x => [String(x._id), x.total || 0]));
    const outRangeMap = new Map((outboundInRange as AggLog[]).map(x => [String(x._id), x.total || 0]));

    const report = products.map((item) => {
      const id = String(item._id);

      // Stok sekarang dari Batches (paling akurat)
      const currentStock = batchMap.get(id) ?? 0;

      // Roll-back dari sekarang ke endDate:
      // endStock = currentStock - (inbound setelah endDate) + (outbound setelah endDate)
      const inAfter = inAfterMap.get(id) ?? 0;
      const outAfter = outAfterMap.get(id) ?? 0;
      const endStock = currentStock - inAfter + outAfter;

      // Inbound & Outbound dalam periode yang dipilih
      const inbound = inRangeMap.get(id) ?? 0;
      const outbound = outRangeMap.get(id) ?? 0;

      // firstStock = endStock - inbound + outbound
      // (karena: firstStock + inbound - outbound = endStock)
      const firstStock = endStock - inbound + outbound;

      console.log(
        {
          _id: id,
          itemCode: item.productId,
          name: item.productName,
          conversionRatioX: item.conversionRatioX,
          conversionRatioY: item.conversionRatioY,
          unit: item.warehouseUnit || item.saleUnit || '-',
          category: item.category || '',
          firstStock,
          inbound,
          outbound,
          endStock,
        }
      )

      return {
        _id: id,
        itemCode: item.productId,
        name: item.productName,
        conversionRatioX: item.conversionRatioX,
        conversionRatioY: item.conversionRatioY,
        unit: item.warehouseUnit || item.saleUnit || '-',
        category: item.category || '',
        firstStock,
        inbound,
        outbound,
        endStock,
      };
    });

    // Hanya tampilkan produk yang pernah punya stok di warehouse ini
    const active = report.filter(r =>
      r.firstStock !== 0 || r.inbound !== 0 || r.outbound !== 0 || r.endStock !== 0
    );

    return NextResponse.json({ noResult: false, message: '', result: active, error: false });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
