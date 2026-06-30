import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Companie from '@/models/Companie';
import Product from '@/models/Product';
import InboundLog from '@/models/InboundLog';
import OutboundLog from '@/models/OutboundLog';


export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');
    const warehouseId = url.searchParams.get('warehouseId');
    const productId = url.searchParams.get('productId');
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    if (!masterAccountId) {
      return NextResponse.json({ noResult: true, message: 'Missing id param', result: null, error: true });
    }
    if (!warehouseId) {
      return NextResponse.json({ noResult: true, message: 'Warehouse is required', result: [], error: false });
    }
    if (!productId) {
      return NextResponse.json({ noResult: true, message: 'Product is required', result: [], error: false });
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
    const productObjId = new mongoose.Types.ObjectId(productId);

    // Ambil produk
    const product = await Product.findOne({ productOf: company._id, _id: productObjId }).lean();
    if (!product) {
       return NextResponse.json({ noResult: true, message: 'Product not found', result: null, error: true });
    }

    // ── 1. Calculate stockAtStart by summing all logs BEFORE startDate ──────────────────────
    const inBeforeStart = await InboundLog.aggregate([
      { $match: { warehouseId: warehouseObjId, productId: productObjId, date: { $lt: startDate } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$quantity', { $ifNull: ['$qty', 0] }] } } } }
    ]);
    const totalInBefore = inBeforeStart.length > 0 ? (inBeforeStart[0].total || 0) : 0;

    const outBeforeStart = await OutboundLog.aggregate([
      { $match: { warehouseId: warehouseObjId, productId: productObjId, date: { $lt: startDate } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$quantity', { $ifNull: ['$qty', 0] }] } } } }
    ]);
    const totalOutBefore = outBeforeStart.length > 0 ? (outBeforeStart[0].total || 0) : 0;

    const stockAtStart = totalInBefore - totalOutBefore;

    // ── 4. Logs DALAM periode [startDate, endDate] ────────────────────────────
    const inboundInRange = await InboundLog.find({ 
      warehouseId: warehouseObjId, 
      productId: productObjId, 
      date: { $gte: startDate, $lte: endDate } 
    }).lean();

    const outboundInRange = await OutboundLog.find({ 
      warehouseId: warehouseObjId, 
      productId: productObjId, 
      date: { $gte: startDate, $lte: endDate } 
    }).lean();

    let totalInboundRange = 0;
    const inMap = new Map<string, number>();
    for (const log of inboundInRange) {
      if (!log.date) continue;
      // Convert to WIB string YYYY-MM-DD
      const localStr = new Date(new Date(log.date).getTime() + 7 * 3600 * 1000).toISOString().split('T')[0];
      const qty = log.quantity || log.qty || 0;
      inMap.set(localStr, (inMap.get(localStr) || 0) + qty);
      totalInboundRange += qty;
    }

    let totalOutboundRange = 0;
    const outMap = new Map<string, number>();
    for (const log of outboundInRange) {
      if (!log.date) continue;
      // Convert to WIB string YYYY-MM-DD
      const localStr = new Date(new Date(log.date).getTime() + 7 * 3600 * 1000).toISOString().split('T')[0];
      const qty = log.quantity || log.qty || 0;
      outMap.set(localStr, (outMap.get(localStr) || 0) + qty);
      totalOutboundRange += qty;
    }

    // ── 5. Build daily report ───────────────────────────────────────────────
    
    const resultList = [];
    let runningStock = stockAtStart;

    const loopDate = new Date(startDateStr + 'T00:00:00+07:00');
    const endLimit = new Date(endDateStr + 'T23:59:59+07:00').getTime();

    while (loopDate.getTime() <= endLimit) {
      const localStr = new Date(loopDate.getTime() + 7 * 3600 * 1000).toISOString().split('T')[0];
      
      const inQty = inMap.get(localStr) || 0;
      const outQty = outMap.get(localStr) || 0;
      const endStockOfDay = runningStock + inQty - outQty;

      resultList.push({
        _id: localStr,
        date: localStr,
        firstStock: runningStock,
        inbound: inQty,
        outbound: outQty,
        endStock: endStockOfDay
      });

      runningStock = endStockOfDay;
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return NextResponse.json({ 
      noResult: false, 
      message: '', 
      result: {
        productInfo: {
          itemCode: product.productId,
          name: product.productName,
          unit: product.warehouseUnit || product.saleUnit || '-',
          category: product.category || ''
        },
        data: resultList
      }, 
      error: false 
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
