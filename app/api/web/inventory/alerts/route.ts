import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Companie from '@/models/Companie';
import Product from '@/models/Product';
import Batche from '@/models/Batche';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get('id');
    const warehouseId = url.searchParams.get('warehouseId');

    if (!masterAccountId) {
      return NextResponse.json({ noResult: true, message: 'Missing id param', result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    // Build batch match: only ACTIVE batches, optionally filtered by warehouse
    const batchMatch: Record<string, unknown> = { status: 'ACTIVE' };
    if (warehouseId) {
      batchMatch.warehouseId = new mongoose.Types.ObjectId(warehouseId);
    }

    // Get all physical products with a defined reorderPoint > 0
    const products = await Product.find({
      productOf: company._id,
      productType: 'good',
      reorderPoint: { $gt: 0 }
    }).lean();

    if (products.length === 0) {
      return NextResponse.json({ noResult: false, message: '', result: [], error: false });
    }

    const productIds = products.map((p: any) => p._id);

    // Aggregate active stock per product
    const stockAgg = await Batche.aggregate([
      { $match: { ...batchMatch, productId: { $in: productIds } } },
      {
        $group: {
          _id: '$productId',
          accumulative: { $sum: '$accumulative' },
          outQty: { $sum: '$outQty' },
          reserved: { $sum: '$reserved' },
        }
      }
    ]);

    const stockMap = new Map(stockAgg.map((x: any) => [String(x._id), x]));

    const alerts = products
      .map((p: any) => {
        const s = stockMap.get(String(p._id)) || { accumulative: 0, outQty: 0, reserved: 0 };
        const availableStock = s.accumulative - s.outQty;
        const availableForSale = availableStock - s.reserved;

        const reorderPoint = p.reorderPoint ?? 0;
        const safetyStock = p.safetyStock ?? 0;

        // Determine alert level
        let alertLevel: 'ok' | 'warning' | 'critical' = 'ok';
        if (safetyStock > 0 && availableStock <= safetyStock) {
          alertLevel = 'critical';
        } else if (reorderPoint > 0 && availableStock <= reorderPoint) {
          alertLevel = 'warning';
        }

        return {
          _id: String(p._id),
          productName: p.productName,
          productId: p.productId,
          category: p.category,
          conversionRatioX: p.conversionRatioX,
          reorderPoint,
          safetyStock,
          availableStock,
          availableForSale,
          alertLevel,
        };
      })
      .filter((p: any) => p.alertLevel !== 'ok')
      .sort((a: any, b: any) => {
        // Critical first, then warning
        if (a.alertLevel === 'critical' && b.alertLevel !== 'critical') return -1;
        if (a.alertLevel !== 'critical' && b.alertLevel === 'critical') return 1;
        return a.availableStock - b.availableStock;
      });

    return NextResponse.json({ noResult: false, message: '', result: alerts, error: false });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
