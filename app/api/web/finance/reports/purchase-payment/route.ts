import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Log from '@/models/Log';
import Companie from '@/models/Companie';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");

    if (!id || !startDateStr || !endDateStr) {
      return NextResponse.json({
        noResult: true,
        message: 'Missing required parameters',
        error: true
      });
    }

    const cmp = await Companie.findOne({ masterAccountId: id });
    if (!cmp) {
      return NextResponse.json({
        noResult: true,
        message: 'Company not found',
        error: true
      });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const payments = await Log.aggregate([
      {
        $match: {
          type: 'payment',
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'purchases',
          localField: 'purchaseId',
          foreignField: '_id',
          as: 'purchase'
        }
      },
      {
        $unwind: {
          path: '$purchase',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'purchase.companyId': cmp._id
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'purchase.supplierId',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: {
          path: '$supplier',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'purchase.vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          logId: '$_id',
          purchaseOrderNumber: '$purchase.purchaseOrderNumber',
          purchaseType: '$purchase.purchaseType',
          supplierData: '$supplier',
          vendorData: '$vendor',
          method: '$paymentMethod',
          date: '$date',
          amount: '$amount',
          paymentNumber: '$paymentNumber'
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    return NextResponse.json({
      noResult: payments.length === 0,
      message: 'success',
      result: payments,
      error: false
    });
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      error: true
    });
  }
}
