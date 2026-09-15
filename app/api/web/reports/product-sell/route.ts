import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order';
import Invoice from '@/models/Invoice';
import Companie from '@/models/Companie';
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    if (!id) {
      return NextResponse.json({ error: true, message: "Company Master Account ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    const cid = company._id as mongoose.Types.ObjectId;

    // ── Parse date range (wajib dari frontend) ──
    const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // ── Produk (Good): ambil dari Order langsung untuk detail per-produk ──
    const orders = await Order.find({
      companyId: cid,
      void: { $ne: true },
      saleDate: { $gte: startDate, $lte: endDate }
    })
      .populate('customerId', 'customerName')
      .populate('cart.productId', 'productName')
      .sort({ saleDate: -1 });

    // ── Service: ambil dari Invoice service aktif dalam rentang tanggal ──
    const serviceInvoices = await Invoice.aggregate([
      {
        $match: {
          companyId: cid,
          invoiceType: 'service',
          status: 'active',
          date: { $gte: startDate, $lte: endDate }
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

    // ── Total Revenue: Pipeline IDENTIK dengan baseRevenuePipeline di dashboard ──
    // Menggunakan SATU pipeline untuk semua invoice aktif (tanpa filter invoiceType)
    // Sama persis dengan cara dashboard menghitung totalRevenue
    const [totalRevenueData] = await Invoice.aggregate([
      {
        $match: {
          companyId: cid,
          status: 'active',
          date: { $gte: startDate, $lte: endDate }
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
        $lookup: {
          from: 'serviceorders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'serviceOrder'
        }
      },
      {
        $addFields: {
          orderDoc: { $arrayElemAt: ['$order', 0] },
          svcOrderDoc: { $arrayElemAt: ['$serviceOrder', 0] }
        }
      },
      {
        $addFields: {
          orderTotal: { $ifNull: ['$orderDoc.total', 0] },
          isOneTimeService: {
            $and: [
              { $eq: ['$svcOrderDoc.contractType', 'One Time'] },
              { $eq: ['$svcOrderDoc.frequency', 'Once'] }
            ]
          },
          svcPrice: { $ifNull: ['$price', { $ifNull: ['$svcOrderDoc.price', 0] }] },
          svcQty: { $ifNull: ['$qty', { $ifNull: ['$svcOrderDoc.qty', 1] }] }
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
          svcBaseTotal: {
            $cond: [
              '$isOneTimeService',
              '$svcPrice',
              { $subtract: ['$svcPrice', { $multiply: ['$svcUnitPrice', '$missingQty'] }] }
            ]
          }
        }
      },
      {
        $addFields: {
          serviceTotal: {
            $cond: [{ $ne: ['$svcOrderDoc', null] }, '$svcBaseTotal', 0]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $add: ['$orderTotal', '$serviceTotal'] } },
          count: { $sum: 1 }
        }
      }
    ]);

    // ── Build detail rows ──
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
        summary,
        data: reportData,
        // Total revenue dihitung dengan pipeline IDENTIK dengan baseRevenuePipeline dashboard
        totalRevenue: totalRevenueData?.total ?? 0,
        totalTransactions: totalRevenueData?.count ?? 0,
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
