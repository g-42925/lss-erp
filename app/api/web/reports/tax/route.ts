import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order';
import ServiceOrder from '@/models/ServiceOrder';
import Companie from '@/models/Companie';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id"); 0

    if (!id) {
      return NextResponse.json({ error: true, message: "Company Master Account ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    // 1. Fetch Orders with populated fields
    const orders = await Order.find({ companyId: company._id })
      .populate('customerId', 'customerName')
      .populate('cart.productId', 'productName')
      .sort({ saleDate: -1 });

    const serviceOrders = await ServiceOrder.find({ companyId: company._id })
      .populate('customerId', 'customerName')
      .populate('productId', 'productName')
      .sort({ date: -1 });

    // 2. Process data into transactions per item tax
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportData: any[] = [];
    const taxSummary: Record<string, number> = {};

    for (const order of orders) {
      if (!order.cart || order.cart.length === 0) continue;

      for (let i = 0; i < order.cart.length; i++) {
        const item = order.cart[i];
        if (!item.productId) continue;

        if (item.taxes && item.taxes.length > 0) {
          for (const t of item.taxes) {
            if (t.taxAmount > 0) {
              const tn = t.taxName || 'Unknown Tax';

              if (!taxSummary[tn]) taxSummary[tn] = 0;
              taxSummary[tn] += t.taxAmount;

              reportData.push({
                id: `${order._id.toString()}-${i}-${tn}`,
                transactionNumber: order.salesOrderNumber,
                date: order.saleDate,
                customerName: order.customerId?.customerName || order.customCustomer?.name || 'Walk-in Customer',
                productName: item.productId.productName || 'Unknown Product',
                taxName: tn,
                taxValue: t.taxValue,
                taxAmount: t.taxAmount,
                subTotal: item.subTotal, // base amount for this item
                source: 'Sales Order',
                taxInvoiceNumber: order.taxInvoiceNumber || ''
              });
            }
          }
        }
      }
    }

    for (const sOrder of serviceOrders) {
      if (sOrder.taxes && sOrder.taxes.length > 0) {
        // ServiceOrder `taxes` array typically holds taxName and taxValue (as percentage) but not taxAmount natively.
        const price = sOrder.price || 0;
        const qty = sOrder.qty || 1;
        const subTotal = price * qty;

        for (let i = 0; i < sOrder.taxes.length; i++) {
          const t = sOrder.taxes[i];
          const tVal = t.taxValue || 0;
          if (tVal > 0) {
            const tAmount = (subTotal * tVal) / 100;
            if (tAmount > 0) {
              const tn = t.taxName || 'Unknown Tax';

              if (!taxSummary[tn]) taxSummary[tn] = 0;
              taxSummary[tn] += Math.round(tAmount);

              reportData.push({
                id: `${sOrder._id.toString()}-${i}-${tn}`,
                transactionNumber: sOrder.salesOrderNumber,
                date: sOrder.date,
                customerName: sOrder.customerId?.customerName || sOrder.customCustomer?.name || 'Walk-in Customer',
                productName: sOrder.productId?.productName || 'Service',
                taxName: tn,
                taxValue: tVal,
                taxAmount: Math.round(tAmount),
                subTotal: subTotal,
                source: 'Service Order'
              });
            }
          }
        }
      }
    }

    // Sort combined records by date descending
    reportData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      noResult: false,
      message: "Success",
      result: {
        summary: taxSummary,
        data: reportData
      },
      error: false
    });

  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    });
  }
}
