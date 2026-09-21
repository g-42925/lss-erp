import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order';
import ServiceOrder from '@/models/ServiceOrder';
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

    // 1. Fetch non-void Orders with populated fields
    const orders = await Order.find({ companyId: company._id, void: { $ne: true } })
      .populate('customerId', 'customerName')
      .populate('cart.productId', 'productName')
      .sort({ saleDate: -1 });

    // 2. Fetch non-void ServiceOrders to build a map for customerName and productName
    const serviceOrders = await ServiceOrder.find({ companyId: company._id })
      .populate('customerId', 'customerName')
      .populate('productId', 'productName')
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceOrderMap = new Map<string, any>();
    for (const sOrder of serviceOrders) {
      serviceOrderMap.set(sOrder._id.toString(), sOrder);
    }

    // 3. Fetch all active invoices of type 'service'
    const serviceInvoices = await Invoice.find({
      companyId: company._id,
      void: { $ne: true },
      invoiceType: 'service'
    }).lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportData: any[] = [];
    const taxSummary: Record<string, number> = {};

    // ── Process Sales Orders (Barang) ──────────────────────────────────────────
    for (const order of orders) {
      if (!order.cart || order.cart.length === 0) continue;

      for (let i = 0; i < order.cart.length; i++) {
        const item = order.cart[i];
        if (!item.productId) continue;

        if (item.taxes && item.taxes.length > 0) {
          for (const t of item.taxes) {
            // tax base = item subTotal (already stored per cart item)
            const taxBase = item.subTotal ?? 0;
            const taxVal = t.taxValue ?? 0;
            // taxAmount is stored directly; fall back to calculating from base
            const taxAmount = (t.taxAmount != null && t.taxAmount > 0)
              ? t.taxAmount
              : Math.round((taxBase * taxVal) / 100);

            if (taxAmount <= 0) continue;

            const tn = t.taxName || 'Unknown Tax';
            if (!taxSummary[tn]) taxSummary[tn] = 0;
            taxSummary[tn] += taxAmount;


            reportData.push({
              id: `${order._id.toString()}-${i}-${tn}`,
              transactionNumber: order.salesOrderNumber,
              date: order.saleDate,
              customerName: order.customerId?.customerName || order.customCustomer?.name || 'Walk-in Customer',
              productName: item.productId.productName || 'Unknown Product',
              taxName: tn,
              taxValue: taxVal,
              taxAmount,
              subTotal: taxBase,
              source: 'Sales Order',
              taxInvoiceNumber: order.taxInvoiceNumber || '',
            });
          }
        }
      }
    }

    // ── Process Service Invoices (Jasa) ────────────────────────────────────────
    for (const inv of serviceInvoices) {
      if (!inv.taxes || inv.taxes.length === 0) continue;

      const sOrderId = inv.salesOrderId ? inv.salesOrderId.toString() : null;
      const sOrder = sOrderId ? serviceOrderMap.get(sOrderId) : null;

      const customerName = sOrder?.customerId?.customerName || sOrder?.customCustomer?.name || 'Walk-in Customer';
      const productName = sOrder?.productId?.productName || 'Service';

      // tax base calculation: literally just invoice.price
      const taxBase = inv.price ?? 0;

      for (let i = 0; i < inv.taxes.length; i++) {
        const t = inv.taxes[i];

        // nominal pajak literally based on t.taxValue
        const taxAmount = t.taxValue ?? 0;
        if (taxAmount <= 0) continue;

        const tn = t.taxName || 'Unknown Tax';
        if (!taxSummary[tn]) taxSummary[tn] = 0;
        taxSummary[tn] += taxAmount;

        function recalculateBase(invoice: any, taxBase: number) {
          if (invoice.missing < 1) return taxBase;
          return (invoice.price / invoice.qty) * (invoice.qty - invoice.missing)
        }

        function recalculateTax(base: any, invoice: any, taxValue: number) {
          if (invoice.missing < 1) return taxValue

          const taxPercentage = taxValue / invoice.price

          return base * taxPercentage
        }

        reportData.push({
          id: `${inv._id.toString()}-${i}-${tn}`,
          transactionNumber: inv.salesOrderNumber || inv.invoiceNumber,
          date: inv.date,
          customerName,
          productName,
          taxName: tn,
          source: 'Service Order',
          taxInvoiceNumber: '',
          taxAmount: recalculateTax(recalculateBase(inv, taxBase), inv, taxAmount),
          subTotal: recalculateBase(inv, taxBase)
        });
      }
    }

    // Sort combined records by date descending
    reportData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      noResult: false,
      message: "Success",
      result: {
        summary: taxSummary,
        data: reportData,
      },
      error: false,
    });

  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true,
    });
  }
}
