import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Log from '@/models/Log'
import User from '@/models/User'
import Cashflow from '@/models/Cashflow'
import BankAccount from '@/models/BankAccount'
import Purchase from '@/models/Purchase'

import mongoose from 'mongoose'

// export async function GET(request: NextRequest) {
//   const url = new URL(request.url);
//   const purchaseId = url.searchParams.get("purchaseId");

//   try {
//     await connectToDatabase()

//     if (!purchaseId) {
//       return NextResponse.json({
//         noResult: true,
//         message: "purchaseId is required",
//         result: null,
//         error: true
//       })
//     }

//     const logs = await Log.find({ purchaseId })
//       .populate('createdBy', 'name')
//       .populate('editedBy', 'name')
//       .populate('editApprovedBy', 'name')
//       .lean()

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const filteredLogs = logs.filter((l: any) => l.amount !== 0)

//     return NextResponse.json({
//       noResult: logs.length === 0,
//       message: "",
//       result: filteredLogs,
//       error: false
//     })
//   }
//   catch (e: unknown) {
//     return NextResponse.json({
//       noResult: true,
//       message: e instanceof Error ? e.message : "Something went wrong",
//       result: null,
//       error: true
//     })
//   }
// }

// import { connectToDatabase } from "@/lib/mongodb";
// import { NextRequest, NextResponse } from "next/server";
// import Log from '@/models/Log'
// import User from '@/models/User'
// import BankAccount from '@/models/BankAccount'

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
    const {
      logId,
      approvalCode,
      userId,
      newAmount,
      newDate,
      newDateTime,
      newTime,
      newPaymentMethod,
      reference
    } = body

    if (!logId) {
      return NextResponse.json({
        noResult: true,
        message: "logId is required",
        result: null,
        error: true
      })
    }

    if (!approvalCode) {
      return NextResponse.json({
        noResult: true,
        message: "Approval code is required",
        result: null,
        error: true
      })
    }

    const approver = await User.findOne({ approvalCode })

    if (!approver) {
      return NextResponse.json({
        noResult: true,
        message: "Kode approval tidak valid",
        result: null,
        error: true
      })
    }

    const oldLog = await Log.findById(logId)
    const purchase = await Purchase.findById(oldLog.purchaseId)

    const paymentCode = purchase.purchaseOrderNumber.split("-")[1].trim()

    const [cashflowItem] = await Cashflow.aggregate([
      {
        $match: {
          reference: {
            $regex: paymentCode,
            $options: "i"
          }
        }
      }
    ])

    if (!oldLog) {
      return NextResponse.json({
        noResult: true,
        message: "Log tidak ditemukan",
        result: null,
        error: true
      })
    }

    const editor = userId ? await User.findById(userId) : null

    const updates: Record<string, unknown> = {
      editedAt: new Date(),
      editApprovedBy: approver._id
    }

    if (editor) updates.editedBy = editor._id

    if (newAmount !== undefined && newAmount !== null) {
      const amount = Number(newAmount)

      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({
          noResult: true,
          message: "Jumlah pembayaran tidak valid",
          result: null,
          error: true
        })
      }

      if (amount !== oldLog.amount) {
        updates.amount = amount

        const diff = amount - oldLog.amount
        const Purchase = (await import('@/models/Purchase')).default

        await Purchase.findByIdAndUpdate(oldLog.purchaseId, {
          $inc: { payAmount: diff }
        })
      }
    }

    const dateValue = newDateTime || newDate

    if (dateValue) {
      const date = new Date(dateValue)

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({
          noResult: true,
          message: "Tanggal atau waktu pembayaran tidak valid",
          result: null,
          error: true
        })
      }

      updates.date = date
    }

    if (reference !== undefined) {
      updates.reference = reference

      const accountNumber = typeof reference === 'string'
        ? reference.split('-')[1]?.trim()
        : undefined

      if (accountNumber) {
        const bank = await BankAccount.findOne({ accountNumber })

        if (bank) {
          updates.bankAccountId = bank._id
        }
      }
    }

    if (newPaymentMethod) {
      updates.paymentMethod = newPaymentMethod
    }

    const updated = await Log.findByIdAndUpdate(
      logId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name')
      .populate('editedBy', 'name')
      .populate('editApprovedBy', 'name')
      .lean()

    const bankId = updated.paymentMethod === 'Cash' ? null : updated.bankAccountId
    const accountType = updated.paymentMethod === 'Cash' ? 'Cash' : 'Bank'

    const newReference = `pl ${purchase.purchaseOrderNumber.split('-')[1].trim()} | pembayaran procurement senilai ${updated.amount}`

    await Cashflow.findByIdAndUpdate(
      cashflowItem._id,
      {
        $set: {
          bankAccountId: bankId,
          accountType,
          amount: updated.amount,
          reference: newReference,
          date: newDate,
          time: newTime
        }
      }
    )

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
      message: e instanceof Error ? e.message : "Something wennt wrong",
      result: null,
      error: true
    })
  }
}

// export async function PUT(request: NextRequest) {
//   try {
//     await connectToDatabase()
//     const body = await request.json()
//     const { logId, approvalCode, userId, newAmount, newDate, newPaymentMethod, reference } = body


//     if (!logId) {
//       return NextResponse.json({
//         noResult: true, message: "logId is required",
//         result: null,
//         error: true
//       })
//     }
//     if (!approvalCode) {
//       return NextResponse.json({
//         noResult: true, message: "Approval code is required",
//         result: null,
//         error: true
//       })
//     }

//     const approver = await User.findOne({ approvalCode })

//     if (!approver) {
//       return NextResponse.json({
//         noResult: true, message: "Kode approval tidak valid", result: null, error: true
//       })
//     }

//     const oldLog = await Log.findById(logId)

//     if (!oldLog) {
//       return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
//     }

//     const editor = userId ? await User.findById(userId) : null

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const updates: any = {
//       editedAt: new Date(),
//       editApprovedBy: approver._id,
//     }
//     if (editor) updates.editedBy = editor._id
//     if (newAmount !== undefined && newAmount !== null && Number(newAmount) !== oldLog.amount) {
//       updates.amount = Number(newAmount)
//       const diff = Number(newAmount) - oldLog.amount
//       await connectToDatabase() // just to be sure
//       const Purchase = (await import('@/models/Purchase')).default
//       await Purchase.findByIdAndUpdate(oldLog.purchaseId, {
//         $inc: { payAmount: diff }
//       })
//     }
//     if (newDate) updates.date = new Date(newDate)
//     if (reference) updates.reference = reference
//     if (newPaymentMethod) updates.paymentMethod = newPaymentMethod


//     const bank = await BankAccount.findOne({ accountNumber: reference.split('-')[1] })

//     if (bank) updates.bankAccountId = bank._id.toString()

//     const updated = await Log.findByIdAndUpdate(logId, updates, { new: true })
//       .populate('createdBy', 'name')
//       .populate('editedBy', 'name')
//       .populate('editApprovedBy', 'name')
//       .lean()

//     return NextResponse.json({
//       noResult: false,
//       message: "Payment log updated",
//       result: updated,
//       error: false
//     })
//   }
//   catch (e: unknown) {
//     return NextResponse.json({
//       noResult: true,
//       message: e instanceof Error ? e.message : "Something went wrong",
//       result: null,
//       error: true
//     })
//   }
// }


// export async function PUT(request: NextRequest) {
//   try {
//     await connectToDatabase()
//     const body = await request.json()
//     const { logId, approvalCode, userId, newAmount, newDate, newPaymentMethod, reference } = body


//     if (!logId) {
//       return NextResponse.json({
//         noResult: true, message: "logId is required",
//         result: null,
//         error: true
//       })
//     }
//     if (!approvalCode) {
//       return NextResponse.json({
//         noResult: true, message: "Approval code is required",
//         result: null,
//         error: true
//       })
//     }

//     const approver = await User.findOne({ approvalCode })

//     if (!approver) {
//       return NextResponse.json({
//         noResult: true, message: "Kode approval tidak valid", result: null, error: true
//       })
//     }

//     const oldLog = await Log.findById(logId)

//     if (!oldLog) {
//       return NextResponse.json({ noResult: true, message: "Log tidak ditemukan", result: null, error: true })
//     }

//     const editor = userId ? await User.findById(userId) : null

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const updates: any = {
//       editedAt: new Date(),
//       editApprovedBy: approver._id,
//     }
//     if (editor) updates.editedBy = editor._id
//     if (newAmount !== undefined && newAmount !== null && Number(newAmount) !== oldLog.amount) {
//       updates.amount = Number(newAmount)
//       const diff = Number(newAmount) - oldLog.amount
//       await connectToDatabase() // just to be sure
//       const Purchase = (await import('@/models/Purchase')).default
//       await Purchase.findByIdAndUpdate(oldLog.purchaseId, {
//         $inc: { payAmount: diff }
//       })
//     }
//     if (newDate) updates.date = new Date(newDate)
//     if (reference) updates.reference = reference
//     if (newPaymentMethod) updates.paymentMethod = newPaymentMethod


//     const bank = await BankAccount.findOne({ accountNumber: reference.split('-')[1] })

//     if (bank) updates.bankAccountId = bank._id.toString()

//     const updated = await Log.findByIdAndUpdate(logId, updates, { new: true })
//       .populate('createdBy', 'name')
//       .populate('editedBy', 'name')
//       .populate('editApprovedBy', 'name')
//       .lean()

//     return NextResponse.json({
//       noResult: false,
//       message: "Payment log updated",
//       result: updated,
//       error: false
//     })
//   }
//   catch (e: unknown) {
//     return NextResponse.json({
//       noResult: true,
//       message: e instanceof Error ? e.message : "Something went wrong",
//       result: null,
//       error: true
//     })
//   }
// }

