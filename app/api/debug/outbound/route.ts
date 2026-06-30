import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import OutboundLog from '@/models/OutboundLog';
import Batche from '@/models/Batche';
import Reservation from '@/models/Reservation';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';

    if (action === 'status') {
      // Cek status collection dan data
      const count = await OutboundLog.countDocuments();
      const docs = await OutboundLog.find({}).sort({ date: -1 }).limit(10).lean();
      
      // Cek Reservation IMMEDIATE hari ini
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const reservations = await Reservation.find({
        status: 'IMMEDIATE',
        createdAt: { $gte: todayStart }
      }).lean();

      return NextResponse.json({
        outboundLogCount: count,
        outboundLogs: docs,
        immediateReservationsToday: reservations,
        mongooseVersion: mongoose.version,
        collectionName: OutboundLog.collection.name,
      });
    }

    if (action === 'test-create') {
      // Test create OutboundLog langsung dari Next.js context
      const warehouseId = url.searchParams.get('warehouseId');
      const productId = url.searchParams.get('productId');
      const qty = parseInt(url.searchParams.get('qty') || '1');
      const ref = url.searchParams.get('ref') || 'TEST';

      if (!warehouseId || !productId) {
        return NextResponse.json({ error: 'warehouseId and productId required' }, { status: 400 });
      }

      try {
        const doc = await OutboundLog.create({
          warehouseId: new mongoose.Types.ObjectId(warehouseId),
          productId: new mongoose.Types.ObjectId(productId),
          quantity: qty,
          referenceNumber: ref,
          date: new Date()
        });
        return NextResponse.json({ 
          success: true, 
          _id: doc._id,
          collection: OutboundLog.collection.name
        });
      } catch(err: any) {
        return NextResponse.json({ 
          success: false, 
          error: err.message,
          name: err.name,
          validationErrors: err.errors
        });
      }
    }

    if (action === 'backfill') {
      // Backfill OutboundLog untuk IMMEDIATE reservations hari ini yang belum punya log
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const reservations = await Reservation.find({
        status: 'IMMEDIATE',
        createdAt: { $gte: todayStart }
      }).lean();

      const results = [];
      for (const r of reservations) {
        // Cek apakah sudah ada OutboundLog
        const existing = await OutboundLog.findOne({
          referenceNumber: r.salesOrderNumber,
          productId: r.productId
        });
        if (existing) {
          results.push({ so: r.salesOrderNumber, status: 'ALREADY_EXISTS' });
          continue;
        }

        // Ambil batch untuk dapatkan warehouseId
        const batch = await Batche.findById(r.batchId).lean();
        const warehouseId = (batch as any)?.warehouseId || r.warehouseId;
        
        if (!warehouseId) {
          results.push({ so: r.salesOrderNumber, status: 'NO_WAREHOUSE' });
          continue;
        }

        try {
          const doc = await OutboundLog.create({
            warehouseId: new mongoose.Types.ObjectId(warehouseId.toString()),
            productId: new mongoose.Types.ObjectId(r.productId.toString()),
            quantity: r.qty,
            referenceNumber: r.salesOrderNumber,
            date: (r as any).createdAt || new Date()
          });
          results.push({ so: r.salesOrderNumber, status: 'CREATED', _id: doc._id });
        } catch(err: any) {
          results.push({ so: r.salesOrderNumber, status: 'ERROR', error: err.message });
        }
      }

      return NextResponse.json({ results, totalProcessed: results.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
