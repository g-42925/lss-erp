import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Log from '@/models/Log'
import User from '@/models/User'

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const purchaseId = url.searchParams.get("purchaseId");

  try {
    await connectToDatabase()

    if (!purchaseId) {
      return NextResponse.json({
        noResult: true,
        message: "purchaseId is required",
        result: null,
        error: true
      })
    }

    const logs = await Log.find({ purchaseId })
      .populate('createdBy', 'name')
      .populate('editedBy', 'name')
      .populate('editApprovedBy', 'name')
      .lean()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredLogs = logs.filter((l: any) => l.amount !== 0)

    return NextResponse.json({
      noResult: logs.length === 0,
      message: "",
      result: filteredLogs,
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

    const approver = await User.findOne({ approvalCode })
    if (!approver) {
      return NextResponse.json({ noResult: true, message: "Kode approval tidak valid", result: null, error: true })
    }

    const oldLog = await Log.findById(logId)
    if (!oldLog) {
      return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
    }

    const editor = userId ? await User.findById(userId) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {
      editedAt: new Date(),
      editApprovedBy: approver._id,
    }
    if (editor) updates.editedBy = editor._id
    if (newAmount !== undefined && newAmount !== null && Number(newAmount) !== oldLog.amount) {
      updates.amount = Number(newAmount)
      const diff = Number(newAmount) - oldLog.amount
      await connectToDatabase() // just to be sure
      const Purchase = (await import('@/models/Purchase')).default
      await Purchase.findByIdAndUpdate(oldLog.purchaseId, {
        $inc: { payAmount: diff }
      })
    }
    if (newDate) updates.date = new Date(newDate)
    if (newPaymentMethod) updates.paymentMethod = newPaymentMethod

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
