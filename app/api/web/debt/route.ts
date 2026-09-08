import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Purchase from '@/models/Purchase'
import Invoice from '@/models/Invoice'
import ServiceOrder from '@/models/ServiceOrder'
import Companie from '@/models/Companie'
import Log from '@/models/Log'


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")
    // filterType: 'barang' | 'jasa' | 'vendor'
    const filterType = url.searchParams.get("filterType") ?? 'barang'
    await connectToDatabase()
    const cmp = await Companie.findOne({ masterAccountId: id })

    // ─── Hutang Barang: Purchase produk belum lunas ───────────────────────────
    if (filterType === 'barang') {
      const debts = await Purchase.aggregate([
        {
          $match: {
            companyId: cmp._id,
            purchaseType: 'product',
            $expr: { $gt: ["$finalPrice", "$payAmount"] }
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier'
          }
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'vendors',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
      ])

      return NextResponse.json({ noResult: false, message: "", result: debts, error: false })
    }

    // ─── Hutang Jasa: Purchase service belum lunas ───────────────────────────
    if (filterType === 'jasa') {
      const debts = await Purchase.aggregate([
        {
          $match: {
            companyId: cmp._id,
            purchaseType: 'service',
            $expr: { $gt: ["$finalPrice", "$payAmount"] }
          },
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
        {
          $lookup: {
            from: 'suppliers',
            localField: 'supplierId',
            foreignField: '_id',
            as: 'supplier'
          }
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      ])

      return NextResponse.json({ noResult: false, message: "", result: debts, error: false })
    }

    // ─── Hutang Vendor: dari Invoice yg berasal dari ServiceOrder handledBy != internal ──
    if (filterType === 'vendor') {
      const vendorOrders = await ServiceOrder.find({
        companyId: cmp._id,
        handledBy: { $ne: 'internal' }
      }).select('_id vendorId').lean()

      if (vendorOrders.length === 0) {
        return NextResponse.json({ noResult: true, message: "Tidak ada hutang vendor", result: [], error: false })
      }

      const orderIds = vendorOrders.map((o: any) => o._id)

      const invoices = await Invoice.aggregate([
        {
          $match: {
            companyId: cmp._id,
            salesOrderId: { $in: orderIds },
            void: { $ne: true }
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
        { $unwind: { path: '$serviceOrder', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'vendors',
            localField: 'serviceOrder.vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } },
        {
          // Hitung total hutang vendor dari ServiceOrder: price × qty × max(range, 1)
          $addFields: {
            vendorPaid: { $ifNull: ['$vendorPaid', 0] },
            totalVendorAmount: {
              $multiply: [
                { $ifNull: ['$serviceOrder.price', 0] },
                { $ifNull: ['$serviceOrder.qty', 1] }
              ]
            }
          }
        },
        {
          $addFields: {
            remaining: {
              $subtract: [
                '$totalVendorAmount',
                '$vendorPaid'
              ]
            }
          }
        },
        // Hanya tampilkan yang belum lunas
        {
          $match: {
            $expr: { $gt: ['$totalVendorAmount', '$vendorPaid'] }
          }
        }
      ])

      return NextResponse.json({ noResult: false, message: "", result: invoices, error: false })
    }

    return NextResponse.json({ noResult: true, message: "filterType tidak valid", result: null, error: true })
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

// ─── POST: Bayar hutang vendor (update Invoice.vendorPaid + catat Log) ────────
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { invoiceId, payAmount, paymentMethod, payDate, userId } = body

    if (!invoiceId || !payAmount || payAmount <= 0) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: null, error: true })
    }

    const invoice = await Invoice.findById(invoiceId).lean() as any
    if (!invoice) return NextResponse.json({ noResult: true, message: "Invoice tidak ditemukan", result: null, error: true })

    // Hitung total hutang vendor dari ServiceOrder
    const serviceOrder = await ServiceOrder.findById(invoice.salesOrderId).lean() as any
    if (!serviceOrder) return NextResponse.json({ noResult: true, message: "ServiceOrder tidak ditemukan", result: null, error: true })

    const totalVendorAmount = (serviceOrder.price ?? 0) * (serviceOrder.qty ?? 1)

    const currentVendorPaid = (invoice.vendorPaid ?? 0)
    const newVendorPaid = currentVendorPaid + Number(payAmount)

    if (newVendorPaid > totalVendorAmount) {
      return NextResponse.json({ noResult: true, message: `Jumlah bayar melebihi hutang (max: ${totalVendorAmount - currentVendorPaid})`, result: null, error: true })
    }

    await Invoice.findByIdAndUpdate(invoiceId, { vendorPaid: newVendorPaid })

    await Log.create({
      purchaseId: new mongoose.Types.ObjectId(invoiceId),
      date: payDate ? new Date(payDate) : new Date(),
      amount: Number(payAmount),
      initial: false,
      paymentNumber: `VL-${String(Date.now()).slice(-6)}`,
      type: 'payment',
      paymentMethod: paymentMethod || 'Cash',
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined
    })

    return NextResponse.json({
      noResult: false,
      message: "Pembayaran berhasil dicatat",
      result: { invoiceId, newVendorPaid, remaining: totalVendorAmount - newVendorPaid },
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