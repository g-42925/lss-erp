import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import Purchase from '@/models/Purchase'
import Invoice from '@/models/Invoice'
import ServiceOrder from '@/models/ServiceOrder'
import Companie from '@/models/Companie'
import Log from '@/models/Log'
import Cashflow from '@/models/Cashflow'


export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")
    // filterType: 'barang' | 'jasa' | 'vendor'
    const filterType = url.searchParams.get("filterType") ?? 'barang'
    const status = url.searchParams.get("status") ?? 'unpaid' // 'unpaid' | 'paid'
    const month = url.searchParams.get("month") // format 'YYYY-MM'
    const vendorId = url.searchParams.get("vendorId")

    await connectToDatabase()
    const cmp = await Companie.findOne({ masterAccountId: id })

    // ─── Hutang Barang: Purchase produk ───────────────────────────
    if (filterType === 'barang') {
      const matchQuery: any = {
        companyId: cmp._id,
        purchaseType: { $in: ['product', 'procurement'] },
      }
      if (status === 'unpaid') {
        matchQuery.$expr = { $gt: ["$finalPrice", "$payAmount"] }
      } else if (status === 'paid') {
        matchQuery.$expr = { $lte: ["$finalPrice", "$payAmount"] }
      }
      if (month) {
        const [yearStr, monthStr] = month.split('-')
        const y = parseInt(yearStr), m = parseInt(monthStr)
        const nextMonth = m === 12 ? 1 : m + 1
        const nextYear = m === 12 ? y + 1 : y
        const startDate = new Date(`${yearStr}-${monthStr}-01T00:00:00+07:00`)
        const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+07:00`)
        matchQuery.date = { $gte: startDate, $lt: endDate }
      }
      if (vendorId) {
        matchQuery.$or = [
          { vendorId: new mongoose.Types.ObjectId(vendorId) },
          { supplierId: new mongoose.Types.ObjectId(vendorId) }
        ]
      }

      const debts = await Purchase.aggregate([
        { $match: matchQuery },
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

    // ─── Hutang Jasa: Purchase service ───────────────────────────
    if (filterType === 'jasa') {
      const matchQuery: any = {
        companyId: cmp._id,
        purchaseType: 'service',
      }
      if (status === 'unpaid') {
        matchQuery.$expr = { $gt: ["$finalPrice", "$payAmount"] }
      } else if (status === 'paid') {
        matchQuery.$expr = { $lte: ["$finalPrice", "$payAmount"] }
      }
      if (month) {
        const [yearStr, monthStr] = month.split('-')
        const y = parseInt(yearStr), m = parseInt(monthStr)
        const nextMonth = m === 12 ? 1 : m + 1
        const nextYear = m === 12 ? y + 1 : y
        const startDate = new Date(`${yearStr}-${monthStr}-01T00:00:00+07:00`)
        const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+07:00`)
        matchQuery.date = { $gte: startDate, $lt: endDate }
      }
      if (vendorId) {
        matchQuery.$or = [
          { vendorId: new mongoose.Types.ObjectId(vendorId) },
          { supplierId: new mongoose.Types.ObjectId(vendorId) }
        ]
      }

      const debts = await Purchase.aggregate([
        { $match: matchQuery },
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

    // ─── Hutang Vendor: Invoice yg memiliki invoiceType === 'vendor_manual' ──
    if (filterType === 'vendor') {
      const matchQuery: any = {
        companyId: cmp._id,
        invoiceType: 'vendor_manual',
        void: { $ne: true }
      }
      if (month) {
        const [yearStr, monthStr] = month.split('-')
        const y = parseInt(yearStr), m = parseInt(monthStr)
        const nextMonth = m === 12 ? 1 : m + 1
        const nextYear = m === 12 ? y + 1 : y
        const startDate = new Date(`${yearStr}-${monthStr}-01T00:00:00+07:00`)
        const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+07:00`)
        matchQuery.date = { $gte: startDate, $lt: endDate }
      }
      if (vendorId) {
        matchQuery.vendorId = new mongoose.Types.ObjectId(vendorId)
      }

      const invoices = await Invoice.aggregate([
        { $match: matchQuery },
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
            from: 'invoices',
            let: { manualInvoiceNumber: '$invoiceNumber' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$vendorInvoiceNumber', '$$manualInvoiceNumber'] },
                  void: { $ne: true }
                }
              }
            ],
            as: 'relatedInvoices'
          }
        },
        {
          $lookup: {
            from: 'taxes',
            localField: 'vendor.taxes',
            foreignField: '_id',
            as: 'vendor.populatedTaxes'
          }
        },
        {
          $addFields: {
            vendorPaid: { $ifNull: ['$vendorPaid', 0] },
            baseVendorAmount: {
              $sum: '$relatedInvoices.debt'
            }
          }
        },
        {
          $addFields: {
            taxRatePct: {
              $reduce: {
                input: { $ifNull: ['$vendor.populatedTaxes', []] },
                initialValue: 0,
                in: {
                  $cond: {
                    if: '$$this.isPPh',
                    then: { $subtract: ['$$value', '$$this.value'] },
                    else: { $add: ['$$value', '$$this.value'] }
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            totalVendorAmount: '$baseVendorAmount'
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
        // Filter status lunas / belum lunas
        {
          $match: status === 'unpaid'
            ? { $expr: { $gt: ['$totalVendorAmount', '$vendorPaid'] } }
            : { $expr: { $lte: ['$totalVendorAmount', '$vendorPaid'] } }
        },
        {
          $addFields: {
            debt: {
              $add: [
                '$debt',
                { $divide: [{ $multiply: ['$totalVendorAmount', '$taxRatePct'] }, 100] }
              ]
            }
          }
        }
      ])

      console.log(invoices)

      if (invoices.length === 0) {
        return NextResponse.json({ noResult: true, message: "Tidak ada hutang vendor", result: [], error: false })
      }

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

// ─── POST: Bayar hutang vendor (update Invoice.vendorPaid + catat Log + Cashflow) ────────
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { invoiceId, payAmount, paymentMethod, payDate, userId, bankAccountId, masterAccountId, description, voucher } = body

    if (!invoiceId || !payAmount || payAmount <= 0) {
      return NextResponse.json({ noResult: true, message: "Parameter tidak valid", result: null, error: true })
    }

    const invoice = await Invoice.findById(invoiceId).lean() as any
    if (!invoice) return NextResponse.json({ noResult: true, message: "Invoice tidak ditemukan", result: null, error: true })

    // Hitung total hutang vendor dari Invoice lain (akumulatif debt)
    const relatedInvoices = await Invoice.find({ vendorInvoiceNumber: invoice.invoiceNumber, void: { $ne: true } }).lean()
    const baseVendorAmount = relatedInvoices.reduce((sum, inv: any) => sum + (inv.debt || 0), 0);

    let totalVendorAmount = baseVendorAmount;
    if (invoice.vendorId) {
      const Vendor = (await import('@/models/Vendor')).default;
      const vendor = await Vendor.findById(invoice.vendorId).populate('taxes').lean() as any;
      if (vendor && vendor.taxes && vendor.taxes.length > 0) {
        let taxRatePct = 0;
        for (const tax of vendor.taxes) {
          if (tax.isPPh) {
            taxRatePct -= tax.value;
          } else {
            taxRatePct += tax.value;
          }
        }
        totalVendorAmount = baseVendorAmount + (baseVendorAmount * taxRatePct / 100);
      }
    }

    const currentVendorPaid = (invoice.vendorPaid ?? 0)
    const amt = Number(payAmount)
    const newVendorPaid = currentVendorPaid + amt

    if (newVendorPaid > totalVendorAmount) {
      return NextResponse.json({ noResult: true, message: `Jumlah bayar melebihi hutang (max: ${totalVendorAmount - currentVendorPaid})`, result: null, error: true })
    }

    await Invoice.findByIdAndUpdate(invoiceId, {
      vendorPaid: newVendorPaid,
      ...(voucher ? { bankVoucher: voucher } : {})
    })

    const refText = [description, voucher ? `Voucher: ${voucher}` : null].filter(Boolean).join(' - ')

    const logEntry = await Log.create({
      purchaseId: new mongoose.Types.ObjectId(invoiceId),
      date: payDate ? new Date(payDate) : new Date(),
      amount: amt,
      initial: false,
      paymentNumber: `VL-${String(Date.now()).slice(-6)}`,
      type: 'payment',
      paymentMethod: paymentMethod || 'Cash',
      createdBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      reference: refText || undefined
    })

    // ─── Catat Cashflow ──────────────────────────────────────────────────────
    const isCash = !paymentMethod || paymentMethod === 'Cash'
    const cmp = masterAccountId ? await Companie.findOne({ masterAccountId }) : null

    if (cmp) {
      await Cashflow.create({
        companyId: cmp._id,
        accountType: isCash ? 'Cash' : 'Bank',
        bankAccountId: isCash ? null : (bankAccountId || null),
        type: 'out',
        amount: amt,
        reference: `Pembayaran hutang vendor - ${invoice.invoiceNumber || invoiceId}${refText ? ` | ${refText}` : ''}`,
        date: payDate ? new Date(payDate) : new Date(),
        recordedBy: userId ? new mongoose.Types.ObjectId(userId) : null,
        to: 'Vendor'
      })
    }

    return NextResponse.json({
      noResult: false,
      message: "Pembayaran berhasil dicatat",
      result: { invoiceId, newVendorPaid, remaining: totalVendorAmount - newVendorPaid, logId: logEntry._id },
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

// ─── PUT: Edit pembayaran hutang vendor (tanggal & jumlah) ─────────────────────
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { logId, approvalCode, userId, newAmount, newDate, newPaymentMethod } = body

    if (!logId) {
      return NextResponse.json({ noResult: true, message: "logId is required", result: null, error: true })
    }
    if (!approvalCode) {
      return NextResponse.json({ noResult: true, message: "Approval code is required", result: null, error: true })
    }

    const User = (await import('@/models/User')).default

    const approver = await User.findOne({ approvalCode })
    if (!approver) {
      return NextResponse.json({ noResult: true, message: "Kode approval tidak valid", result: null, error: true })
    }

    const oldLog = await Log.findById(logId)
    if (!oldLog) {
      return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
    }

    const editor = userId ? await User.findById(userId) : null

    const updates: any = {
      editedAt: new Date(),
      editApprovedBy: approver._id,
    }
    if (editor) updates.editedBy = editor._id
    if (newDate) updates.date = new Date(newDate)
    if (newPaymentMethod) updates.paymentMethod = newPaymentMethod

    // Jika amount berubah, update Invoice.vendorPaid
    if (newAmount !== undefined && newAmount !== null && Number(newAmount) !== oldLog.amount) {
      const diff = Number(newAmount) - oldLog.amount
      updates.amount = Number(newAmount)

      // Update vendorPaid di Invoice
      await Invoice.findByIdAndUpdate(oldLog.purchaseId, {
        $inc: { vendorPaid: diff }
      })

      // Update Cashflow jika ada
      const invoice = await Invoice.findById(oldLog.purchaseId).lean() as any
      if (invoice) {
        const cmp = await Companie.findOne({ _id: invoice.companyId })
        if (cmp) {
          // Cari cashflow terkait dan update amount-nya
          const cfQuery: any = {
            companyId: cmp._id,
            type: 'out',
            reference: { $regex: invoice.invoiceNumber || oldLog.purchaseId.toString() }
          }
          // Update cashflow terdekat berdasarkan tanggal log lama
          await Cashflow.findOneAndUpdate(
            { ...cfQuery, amount: oldLog.amount, date: oldLog.date },
            { amount: Number(newAmount), ...(newDate ? { date: new Date(newDate) } : {}) }
          )
        }
      }
    }

    const updated = await Log.findByIdAndUpdate(logId, updates, { new: true })
      .populate('createdBy', 'name')
      .populate('editedBy', 'name')
      .populate('editApprovedBy', 'name')
      .lean()

    return NextResponse.json({
      noResult: false,
      message: "Payment log updated",
      result: updated,
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

// ─── DELETE: Hapus pembayaran hutang vendor ─────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase()
    const url = new URL(request.url)
    const logId = url.searchParams.get("logId")
    const approvalCode = url.searchParams.get("approvalCode")

    if (!logId) {
      return NextResponse.json({ noResult: true, message: "logId is required", result: null, error: true })
    }
    if (!approvalCode) {
      return NextResponse.json({ noResult: true, message: "Approval code is required", result: null, error: true })
    }

    const User = (await import('@/models/User')).default

    const approver = await User.findOne({ approvalCode })
    if (!approver) {
      return NextResponse.json({ noResult: true, message: "Kode approval tidak valid", result: null, error: true })
    }

    const log = await Log.findById(logId)
    if (!log) {
      return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
    }

    const logAmount = log.amount ?? 0

    // Rollback vendorPaid di Invoice
    await Invoice.findByIdAndUpdate(log.purchaseId, {
      $inc: { vendorPaid: -logAmount }
    })

    // Hapus Cashflow terkait
    const invoice = await Invoice.findById(log.purchaseId).lean() as any
    if (invoice) {
      const cmp = await Companie.findOne({ _id: invoice.companyId })
      if (cmp) {
        await Cashflow.findOneAndDelete({
          companyId: cmp._id,
          type: 'out',
          amount: logAmount,
          reference: { $regex: invoice.invoiceNumber || log.purchaseId.toString() }
        })
      }
    }

    // Hapus log
    await Log.findByIdAndDelete(logId)

    return NextResponse.json({
      noResult: false,
      message: "Pembayaran berhasil dihapus",
      result: { logId, rolledBackAmount: logAmount },
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