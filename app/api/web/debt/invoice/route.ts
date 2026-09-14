import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Invoice from '@/models/Invoice'
import Companie from '@/models/Companie'

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { vendorId, nominal, tanggal, keterangan, invoiceNumber, masterAccountId } = body

    if (!vendorId || !nominal || nominal <= 0 || !tanggal || !masterAccountId) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: null, error: true })
    }

    const cmp = await Companie.findOne({ masterAccountId })
    if (!cmp) {
      return NextResponse.json({ noResult: true, message: "Perusahaan tidak ditemukan", result: null, error: true })
    }

    // Generate unique invoice number: VINV-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const finalInvoiceNumber = invoiceNumber || `VINV-${dateStr}-${randomSuffix}`;

    const newInvoice = await Invoice.create({
      companyId: cmp._id,
      invoiceType: 'vendor_manual',
      invoiceNumber: finalInvoiceNumber,
      date: new Date(tanggal),
      payAmount: 0, 
      paid: false,
      handledBy: 'vendor',
      debt: Number(nominal),
      vendorPaid: 0,
      vendorId: new mongoose.Types.ObjectId(vendorId),
      description: keterangan
    })

    return NextResponse.json({
      noResult: false,
      message: "Invoice vendor berhasil dibuat",
      result: newInvoice,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    
    await connectToDatabase();
    const cmp = await Companie.findOne({ masterAccountId: id });
    if (!cmp) {
      return NextResponse.json({ noResult: true, message: "Perusahaan tidak ditemukan", result: [], error: true });
    }

    const invoices = await Invoice.aggregate([
      { 
        $match: { 
          companyId: cmp._id,
          invoiceType: 'vendor_manual' 
        } 
      },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
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
    const { id, vendorId, nominal, tanggal, keterangan, invoiceNumber } = body;

    if (!id || !vendorId || !nominal || nominal <= 0 || !tanggal) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: null, error: true });
    }

    const updateData: any = {
      vendorId: new mongoose.Types.ObjectId(vendorId),
      debt: Number(nominal),
      date: new Date(tanggal),
      description: keterangan
    };
    if (invoiceNumber) updateData.invoiceNumber = invoiceNumber;

    const updated = await Invoice.findOneAndUpdate(
      { _id: id, invoiceType: 'vendor_manual' },
      updateData,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ noResult: true, message: "Invoice tidak ditemukan", result: null, error: true });
    }

    return NextResponse.json({ noResult: false, message: "Invoice berhasil diupdate", result: updated, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: null, error: true });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ noResult: true, message: "ID tidak valid", result: null, error: true });
    }

    const deleted = await Invoice.findOneAndDelete({ _id: id, invoiceType: 'vendor_manual' });
    if (!deleted) {
      return NextResponse.json({ noResult: true, message: "Invoice tidak ditemukan", result: null, error: true });
    }

    return NextResponse.json({ noResult: false, message: "Invoice berhasil dihapus", result: deleted, error: false });
  } catch (e: unknown) {
    return NextResponse.json({ noResult: true, message: e instanceof Error ? e.message : "Error", result: null, error: true });
  }
}
