import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Purchase from '@/models/Purchase';
import Companie from '@/models/Companie';
import Product from '@/models/Product';
import Supplier from '@/models/Supplier';
import Vendor from '@/models/Vendor';

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

    const purchases = await Purchase.find({ companyId: company._id, purchaseType: 'product' })
      .populate({ path: 'productId', model: Product, select: 'productName category' })
      .populate({ path: 'supplierId', model: Supplier, select: 'bussinessName name' })
      .populate({ path: 'vendorId', model: Vendor, select: 'name' })
      .sort({ date: -1 });

    const reportData: any[] = [];
    const summary: Record<string, { qty: number, subTotal: number }> = {};

    for (const purchase of purchases) {
      const pn = purchase.productId?.productName || 'Unknown Product';
      const qty = purchase.quantity || 0;
      // finalPrice could be undefined if not ordered yet, fallback to estimatedPrice
      const subTotal = purchase.finalPrice !== undefined && purchase.finalPrice !== null ? purchase.finalPrice : (purchase.estimatedPrice || 0);

      if (!summary[pn]) summary[pn] = { qty: 0, subTotal: 0 };
      summary[pn].qty += qty;
      summary[pn].subTotal += subTotal;

      let partnerName = 'Unknown Supplier';
      if (purchase.supplierId?.bussinessName) {
        partnerName = purchase.supplierId.bussinessName;
      } else if (purchase.supplierId?.name) {
        partnerName = purchase.supplierId.name;
      } else if (purchase.vendorId?.name) {
        partnerName = purchase.vendorId.name;
      }

      reportData.push({
        id: purchase._id.toString(),
        transactionNumber: purchase.purchaseOrderNumber,
        date: purchase.date,
        supplierName: partnerName,
        productName: pn,
        qty: qty,
        subTotal: subTotal,
        status: purchase.status || 'requested',
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
