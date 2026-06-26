import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Batche from '@/models/Batche';
import Companie from '@/models/Companie';
import Warehouse from '@/models/Warehouse';
import Product from '@/models/Product';
import Location from '@/models/Location';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!id) {
      return NextResponse.json({ error: true, message: "Company Master Account ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    const warehouses = await Warehouse.find({ companyId: company._id });
    const warehouseIds = warehouses.map((w: any) => w._id);

    // Build the date filter
    const dateFilter: any = {};
    let hasDateFilter = false;
    
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
      hasDateFilter = true;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
      hasDateFilter = true;
    }

    const filter: any = { 
      warehouseId: { $in: warehouseIds },
      expiryDate: { $ne: null }
    };

    if (hasDateFilter) {
      filter.expiryDate = { ...filter.expiryDate, ...dateFilter };
    }

    const batches = await Batche.find(filter)
      .populate({ path: 'productId', model: Product, select: 'productName category' })
      .populate({ path: 'warehouseId', model: Warehouse, select: 'name code' })
      .populate({ path: 'locationId', model: Location, select: 'name code' })
      .sort({ expiryDate: 1 });

    const reportData: any[] = [];
    const summary = {
      totalExpiredQty: 0,
      totalBatches: 0
    };

    for (const batch of batches) {
      const pn = batch.productId?.productName || 'Unknown Product';
      const remainingQty = (batch.accumulative || 0) - (batch.outQty || 0);

      // Only show batches that still have quantity remaining
      if (remainingQty <= 0) continue;

      summary.totalExpiredQty += remainingQty;
      summary.totalBatches += 1;

      reportData.push({
        id: batch._id.toString(),
        batchNumber: batch.batchNumber,
        productName: pn,
        warehouseName: batch.warehouseId?.name || '-',
        locationName: batch.locationId?.name || '-',
        expiryDate: batch.expiryDate,
        expiredQty: remainingQty,
        status: batch.status,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "Success",
      result: {
        summary: summary,
        data: reportData
      },
      error: false
    });

  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    });
  }
}
