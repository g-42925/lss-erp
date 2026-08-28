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
    if (!warehouseId) {
      return NextResponse.json({ noResult: true, message: 'Warehouse param required', result: [], error: false });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
    }

    const warehouseObjId = new mongoose.Types.ObjectId(warehouseId);

    // Get all products of the company
    const products = await Product.find({ productOf: company._id, productType: 'good' }).lean();

    // Aggregate Batches to get qty, reserved, outQty — only ACTIVE batches count
    const currentBatchAgg = await Batche.aggregate([
      { $match: { warehouseId: warehouseObjId, status: 'ACTIVE' } },
      {
        $group: {
          _id: '$productId',
          accumulative: { $sum: '$accumulative' },
          reserved: { $sum: '$reserved' },
          outQty: { $sum: '$outQty' },
        }
      }
    ]);

    type AggBatch = { _id: unknown; accumulative: number; reserved: number; outQty: number };

    const batchMap = new Map((currentBatchAgg as AggBatch[]).map(x => [String(x._id), x]));

    const report = products.map((item: any) => {
      const id = String(item._id);
      const batchData = batchMap.get(id) || { accumulative: 0, reserved: 0, outQty: 0 };
      
      // availableItems = total active stock units (accumulative - outQty)
      const availableItems = batchData.accumulative - batchData.outQty;
      const availableForSale = availableItems - batchData.reserved;
      const totalOut = batchData.outQty;

      return {
        _id: id,
        itemCode: item.productId,
        name: item.productName,
        category: item.category || '',
        reorderPoint: item.reorderPoint ?? 0,
        safetyStock: item.safetyStock ?? 0,
        availableItems,
        availableForSale,
        totalOut,
      };
    });

    // Only return products that have ever had stock interaction in this warehouse
    const active = report.filter((r: any) => 
      batchMap.has(r._id)
    );

    return NextResponse.json({ noResult: false, message: '', result: active, error: false });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
  }
}
