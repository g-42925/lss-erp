import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Invoice from '@/models/Invoice'
import ServiceOrder from '@/models/ServiceOrder'

export async function GET() {
  try {
    await connectToDatabase();
    
    // Find all invoices
    const invoices = await Invoice.find({ invoiceType: 'service' });
    let migratedCount = 0;

    for (const invoice of invoices) {
      // Only migrate if snapshot fields are missing
      if (invoice.price == null || invoice.qty == null) {
        if (invoice.salesOrderId) {
          const so = await ServiceOrder.findById(invoice.salesOrderId);
          if (so) {
            invoice.price = so.price;
            invoice.qty = so.qty;
            invoice.taxes = so.taxes || [];
            await invoice.save();
            migratedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      totalInvoices: invoices.length
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
