import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Invoice from "@/models/Invoice";
import ServiceOrder from "@/models/ServiceOrder";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const params = await request.json();

    const invoice = await Invoice.findOne({
      _id: params.invoiceId
    });

    if (!invoice) throw new Error("Invoice not found");

    const so = await ServiceOrder.findOne({
      salesOrderNumber: invoice.salesOrderNumber
    });

    if (!so) throw new Error("Service Order not found");

    if (so.handledBy === 'internal') {
      throw new Error("Service Order is handled internally, sync not allowed");
    }

    invoice.debt = so.vendorPrice || 0;
    invoice.handledBy = so.handledBy;
    await invoice.save();

    return NextResponse.json({
      noResult: false,
      message: "Debt synchronized successfully",
      result: invoice,
      error: false
    });
  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Unknown error",
      result: null,
      error: true
    });
  }
}
