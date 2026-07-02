import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Invoice from '@/models/Invoice';
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

    // Set end date boundary to end of day to include the whole endDate
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const payments = await Invoice.aggregate([
      {
        $match: {
          companyId: cmp._id,
        }
      },
      // Payment history only exist in invoice, we unwind it
      {
        $unwind: '$paymentHistory'
      },
      // Match the unwound payment history dates within the range
      // and exclude reverted payments
      {
        $match: {
          "paymentHistory.date": {
            $gte: startDate,
            $lte: endDate
          },
          "paymentHistory.reverted": { $ne: true }
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      {
        $unwind: {
          path: '$order',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'order.customerId',
          foreignField: '_id',
          as: 'order.customer'
        }
      },
      {
        $unwind: {
          path: '$order.customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          invoiceId: '$_id',
          invoiceNumber: 1,
          customCustomer: '$order.customCustomer',
          customerData: '$order.customer',
          method: '$paymentHistory.method',
          date: '$paymentHistory.date',
          amount: '$paymentHistory.amount'
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
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      error: true
    });
  }
}
