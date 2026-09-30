import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Invoice from "@/models/Invoice";
import ServiceOrder from "@/models/ServiceOrder";
import Tax from "@/models/Tax";

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

    const allTaxes = await Tax.find({});
    const newSnapshotTaxes = [];
    
    for (const tax of allTaxes) {
      const isApplied = so.taxes && so.taxes.some((t: any) => t.taxName === tax.name);
      
      newSnapshotTaxes.push({
        name: tax.name,
        percentage: isApplied ? tax.value : 0
      });
    }
    
    invoice.snapshot = {
      ...invoice.snapshot,
      tax: newSnapshotTaxes,
      order: so
    };
    
    await invoice.save();

    return NextResponse.json({
      noResult: false,
      message: "Order and Tax synchronized successfully",
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
