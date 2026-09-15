import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from '@/models/Invoice';
import Companie from '@/models/Companie';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vendorId = url.searchParams.get("vendorId");
    const masterAccountId = url.searchParams.get("masterAccountId");

    await connectToDatabase();

    if (!vendorId || !masterAccountId) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: [], error: true });
    }

    const cmp = await Companie.findOne({ masterAccountId });
    if (!cmp) {
      return NextResponse.json({ noResult: true, message: "Perusahaan tidak ditemukan", result: [], error: true });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

    const invoices = await Invoice.aggregate([
      {
        $match: {
          companyId: cmp._id,
          invoiceType: { $ne: 'vendor_manual' },
          handledBy: 'vendor',
          void: { $ne: true },
          $or: [
            { vendorInvoiceNumber: { $exists: false } },
            { vendorInvoiceNumber: null },
            { vendorInvoiceNumber: "" }
          ]
        }
      },
      // Join ke ServiceOrder untuk dapat vendorId, customer, product
      {
        $lookup: {
          from: 'serviceorders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'serviceOrder'
        }
      },
      {
        $unwind: {
          path: '$serviceOrder',
          preserveNullAndEmptyArrays: false
        }
      },
      // Filter hanya invoice yang vendor-nya cocok
      {
        $match: {
          'serviceOrder.vendorId': vendorObjectId
        }
      },
      // Join ke Customer
      {
        $lookup: {
          from: 'customers',
          localField: 'serviceOrder.customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      // Join ke Product
      {
        $lookup: {
          from: 'products',
          localField: 'serviceOrder.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          invoiceNumber: 1,
          invoiceType: 1,
          date: 1,
          debt: 1,
          description: 1,
          salesOrderNumber: 1,
          price: 1,
          qty: 1,
          'serviceOrder._id': 1,
          'serviceOrder.salesOrderNumber': 1,
          'serviceOrder.price': 1,
          'serviceOrder.qty': 1,
          'serviceOrder.vendorPrice': 1,
          'serviceOrder.customCustomer': 1,
          'customer._id': 1,
          'customer.name': 1,
          'customer.bussinessName': 1,
          'product._id': 1,
          'product.productName': 1,
        }
      },
      { $sort: { date: -1, _id: -1 } }
    ]);

    return NextResponse.json({ noResult: false, message: "", result: invoices, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: [], error: true });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { invoiceIds, vendorInvoiceNumber } = body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0 || !vendorInvoiceNumber) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: null, error: true });
    }

    const objectIds = invoiceIds.map((id: string) => new mongoose.Types.ObjectId(id));

    const updated = await Invoice.updateMany(
      { _id: { $in: objectIds } },
      { $set: { vendorInvoiceNumber } }
    );

    return NextResponse.json({ noResult: false, message: "Invoices berhasil diasosiasikan", result: updated, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: null, error: true });
  }
}
