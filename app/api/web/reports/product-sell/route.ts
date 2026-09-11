import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order';
import Invoice from '@/models/Invoice';
import Companie from '@/models/Companie';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: true, message: "Company Master Account ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    const orders = await Order.find({ companyId: company._id, void: { $ne: true } })
      .populate('customerId', 'customerName')
      .populate('cart.productId', 'productName')
      .sort({ saleDate: -1 });

    // Use Invoice (with snapshot values) for service revenue instead of ServiceOrder
    const serviceInvoices = await Invoice.aggregate([
      {
        $match: {
          companyId: company._id,
          invoiceType: 'service',
          status: 'active'
        }
      },
      {
        $lookup: {
          from: 'serviceorders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'serviceOrder'
        }
      },
      {
        $addFields: {
          svcOrderDoc: { $arrayElemAt: ['$serviceOrder', 0] }
        }
      },
      {
        $addFields: {
          // prefer invoice snapshot price/qty over live serviceorder values
          svcPrice: { $ifNull: ['$price', { $ifNull: ['$svcOrderDoc.price', 0] }] },
          svcQty: { $ifNull: ['$qty', { $ifNull: ['$svcOrderDoc.qty', 1] }] },
          isOneTimeService: {
            $and: [
              { $eq: ['$svcOrderDoc.contractType', 'One Time'] },
              { $eq: ['$svcOrderDoc.frequency', 'Once'] }
            ]
          }
        }
      },
      {
        $addFields: {
          missingQty: { $ifNull: ['$missing', 0] },
          svcUnitPrice: {
            $divide: ['$svcPrice', { $cond: [{ $eq: ['$svcQty', 0] }, 1, '$svcQty'] }]
          }
        }
      },
      {
        $addFields: {
          svcSubTotal: {
            $cond: [
              '$isOneTimeService',
              '$svcPrice',
              { $subtract: ['$svcPrice', { $multiply: ['$svcUnitPrice', '$missingQty'] }] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'svcOrderDoc.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $addFields: {
          productDoc: { $arrayElemAt: ['$product', 0] }
        }
      },
      { $sort: { date: -1 } }
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportData: any[] = [];
    const summary: Record<string, { qty: number, subTotal: number }> = {};

    for (const order of orders) {
      if (!order.cart || order.cart.length === 0) continue;

      for (let i = 0; i < order.cart.length; i++) {
        const item = order.cart[i];
        if (!item.productId) continue;

        const pn = item.productId.productName || 'Unknown Product';
        const qty = item.qty || 0;
        const subTotal = item.subTotal || 0;

        if (!summary[pn]) summary[pn] = { qty: 0, subTotal: 0 };
        summary[pn].qty += qty;
        summary[pn].subTotal += subTotal;

        reportData.push({
          id: `${order._id.toString()}-${i}`,
          transactionNumber: order.salesOrderNumber,
          date: order.saleDate,
          customerName: order.customerId?.customerName || order.customCustomer?.name || 'Walk-in Customer',
          productName: pn,
          productType: 'Good',
          qty: qty,
          subTotal: subTotal,
          source: 'Sales Order'
        });
      }
    }

    for (const inv of serviceInvoices) {
      const pn = inv.productDoc?.productName || inv.svcOrderDoc?.productName || 'Service';
      const qty = inv.svcQty || 1;
      const subTotal = inv.svcSubTotal || 0;
      const customerName =
        inv.svcOrderDoc?.customCustomer?.name ||
        inv.svcOrderDoc?.customerId?.customerName ||
        'Walk-in Customer';

      if (!summary[pn]) summary[pn] = { qty: 0, subTotal: 0 };
      summary[pn].qty += qty;
      summary[pn].subTotal += subTotal;

      reportData.push({
        id: `${inv._id.toString()}`,
        transactionNumber: inv.salesOrderNumber,
        date: inv.date,
        customerName,
        productName: pn,
        productType: 'Service',
        qty: qty,
        subTotal: subTotal,
        source: 'Service Invoice'
      });
    }

    reportData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      noResult: false,
      message: "Success",
      result: {
        summary: summary,
        data: reportData
      },
      error: false
    });

  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    });
  }
}
