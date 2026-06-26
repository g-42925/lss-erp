import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order';
import ServiceOrder from '@/models/ServiceOrder';
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

    const orders = await Order.find({ companyId: company._id })
      .populate('customerId', 'customerName')
      .populate('cart.productId', 'productName')
      .sort({ saleDate: -1 });

    const serviceOrders = await ServiceOrder.find({ companyId: company._id })
      .populate('customerId', 'customerName')
      .populate('productId', 'productName')
      .sort({ date: -1 });

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

    for (const sOrder of serviceOrders) {
      const pn = sOrder.productId?.productName || 'Service';
      const qty = sOrder.qty || 1;
      const subTotal = (sOrder.price || 0) * qty;

      if (!summary[pn]) summary[pn] = { qty: 0, subTotal: 0 };
      summary[pn].qty += qty;
      summary[pn].subTotal += subTotal;

      reportData.push({
        id: `${sOrder._id.toString()}`,
        transactionNumber: sOrder.salesOrderNumber,
        date: sOrder.date,
        customerName: sOrder.customerId?.customerName || sOrder.customCustomer?.name || 'Walk-in Customer',
        productName: pn,
        productType: 'Service',
        qty: qty,
        subTotal: subTotal,
        source: 'Service Order'
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

  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    });
  }
}
