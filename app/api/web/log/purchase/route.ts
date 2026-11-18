import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Log from '@/models/Log'
import User from '@/models/User'
import Cashflow from '@/models/Cashflow'
import BankAccount from '@/models/BankAccount'
import Purchase from '@/models/Purchase'
import InvItem from '@/models/InvItem'
import PredefinedUnit from '@/models/PredefinedUnit'

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
      reference,
      destinationAccountNumber,
      destinationDescription
    } = body

    // 1. Validasi logId
    if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
      return NextResponse.json({
        noResult: true,
        message: "logId tidak valid",
        result: null,
        error: true
      })
    }

    // 2. Ambil log dan editor
    const [oldLog, editor] = await Promise.all([
      Log.findById(logId).lean(),
      userId ? User.findById(userId).lean() : null
    ])

    if (!oldLog) {
      throw new Error("Log tidak ditemukan")
    }

    if (!editor) {
      throw new Error("User tidak ditemukan")
    }

    // 3. Validasi approval
    const isSuperAdmin = editor.role === "super admin"

    let approver = null

    if (approvalCode) {
      approver = await User.findOne({ approvalCode }).lean()

      if (!approver) {
        throw new Error("Kode approval tidak valid")
      }
    }

    if (!isSuperAdmin && !approver) {
      throw new Error("Approval code wajib diisi")
    }

    // 4. Ambil purchase
    const purchase = await Purchase.findById(oldLog.purchaseId).lean()

    if (!purchase) {
      throw new Error("Purchase tidak ditemukan")
    }

    const paymentCode = purchase.purchaseOrderNumber
      ?.split("-")[1]
      ?.trim()

    if (!paymentCode) {
      throw new Error("Purchase order number tidak valid")
    }

    // 5. Siapkan perubahan Log
    const updates: Record<string, any> = {
      editedAt: new Date(),
      editedBy: editor._id
    }

    if (approver) {
      updates.editApprovedBy = approver._id
    }

    // 6. Validasi nominal
    let amount = oldLog.amount

    if (newAmount !== undefined && newAmount !== null) {
      amount = Number(newAmount)

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Jumlah pembayaran tidak valid")
      }

      if (amount !== oldLog.amount) {
        updates.amount = amount
      }
    }

    const difference = amount - oldLog.amount

    // 7. Validasi tanggal
    const dateValue = newDateTime || newDate

    if (dateValue) {
      const date = new Date(dateValue)

      if (Number.isNaN(date.getTime())) {
        throw new Error("Tanggal pembayaran tidak valid")
      }

      updates.date = date
    }

    if (newTime !== undefined) {
      updates.time = newTime
    }

    // 8. Update metode pembayaran
    if (newPaymentMethod) {
      updates.paymentMethod = newPaymentMethod
    }

    const paymentMethod = newPaymentMethod || oldLog.paymentMethod

    // 9. Update reference dan rekening bank
    if (reference !== undefined) {
      updates.reference = reference

      const accountNumber = typeof reference === "string"
        ? reference.split("-")[1]?.trim()
        : undefined

      if (accountNumber) {
        const bank = await BankAccount.findOne({
          accountNumber
        }).lean()

        if (bank) {
          updates.bankAccountId = bank._id
        }
      }
    }

    // 10. Update tujuan transaksi non-tunai
    if (paymentMethod !== "Cash") {
      const oldDestination = oldLog.nonCashDst || {}

      updates.nonCashDst = {
        accountNumber: destinationAccountNumber !== undefined
          ? destinationAccountNumber
          : oldDestination.accountNumber,

        description: destinationDescription !== undefined
          ? destinationDescription
          : oldDestination.description
      }
    } else {
      updates.nonCashDst = null
    }

    // 11. Ambil item purchase
    const itemIds = purchase.items.map(
      (item: any) => item.productId
    )

    const items = await InvItem.find({
      _id: { $in: itemIds }
    }).lean()

    const unitIds = items.map(item => item.unit)

    const units = await PredefinedUnit.find({
      _id: { $in: unitIds }
    }).lean()

    const itemParts = purchase.items.map((purchaseItem: any) => {
      const item = items.find(
        item => item._id.toString() === purchaseItem.productId.toString()
      )

      if (!item) return null

      const unit = units.find(
        unit => unit._id.toString() === item.unit.toString()
      )

      return `${item.name} ${purchaseItem.quantity} ${unit?.symbol || ""}`.trim()
    })

    const message = itemParts.filter(Boolean).join(", ")

    // 12. Hitung total pembayaran terbaru
    const updatedPayAmount = purchase.payAmount + difference

    const newReference = `pl ${paymentCode} | ${message} | ${updatedPayAmount}`

    // 13. Cari cashflow terkait
    const escapedPaymentCode = paymentCode.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    )

    const cashflow = await Cashflow.findOne({
      reference: {
        $regex: escapedPaymentCode,
        $options: "i"
      }
    }).lean()

    if (!cashflow) {
      throw new Error("Cashflow terkait pembayaran tidak ditemukan")
    }

    // 14. Siapkan data cashflow
    const bankId = paymentMethod === "Cash"
      ? null
      : updates.bankAccountId ?? oldLog.bankAccountId ?? null

    const cashflowDate = updates.date ?? oldLog.date

    const cashflowTime = updates.time ?? oldLog.time

    const nonCashDst = paymentMethod === "Cash"
      ? null
      : updates.nonCashDst ?? oldLog.nonCashDst ?? null

    // 15. Update cashflow terlebih dahulu
    const cashflowUpdate = await Cashflow.updateOne(
      { _id: cashflow._id },
      {
        $set: {
          bankAccountId: bankId,
          accountType: paymentMethod === "Cash" ? "Cash" : "Bank",
          amount,
          reference: newReference,
          date: cashflowDate,
          time: cashflowTime,
          nonCashDst
        }
      }
    )

    if (cashflowUpdate.matchedCount === 0) {
      throw new Error("Gagal memperbarui cashflow")
    }

    // 16. Update purchase.payAmount
    if (difference !== 0) {
      const purchaseUpdate = await Purchase.updateOne(
        { _id: purchase._id },
        {
          $inc: {
            payAmount: difference
          }
        }
      )

      if (purchaseUpdate.matchedCount === 0) {
        throw new Error("Gagal memperbarui purchase")
      }
    }

    // 17. Update log
    const updated = await Log.findByIdAndUpdate(
      logId,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    )
      .populate("createdBy", "name")
      .populate("editedBy", "name")
      .populate("editApprovedBy", "name")
      .lean()

    if (!updated) {
      throw new Error("Gagal memperbarui payment log")
    }

    return NextResponse.json({
      noResult: false,
      message: "Payment log updated",
      result: updated,
      error: false
    })

  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error
        ? e.message
        : "Something went wrong",
      result: null,
      error: true
    })
  }
}



// export async function PUT(request: NextRequest) {
//   const session = await mongoose.startSession()

//   try {
//     await connectToDatabase()

//     const body = await request.json()
//     const {
//       logId,
//       approvalCode,
//       userId,
//       newAmount,
//       newDate,
//       newDateTime,
//       newTime,
//       newPaymentMethod,
//       reference,
//       destinationAccountNumber,
//       destinationDescription
//     } = body

//     if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
//       return NextResponse.json({
//         noResult: true,
//         message: "logId tidak valid",
//         result: null,
//         error: true
//       })
//     }

//     let result: any = null

//     await session.withTransaction(async () => {
//       // 1. Ambil log dan user
//       const oldLog = await Log.findById(logId).session(session)

//       if (!oldLog) {
//         throw new Error("Log tidak ditemukan")
//       }

//       const editor = userId
//         ? await User.findById(userId).session(session)
//         : null

//       // Sesuaikan role === 1 jika struktur User menggunakan nama field berbeda
//       const isSuperAdmin = Number(editor?.role) === 1

//       // 2. Validasi approval
//       let approver = null

//       if (approvalCode) {
//         approver = await User.findOne({ approvalCode }).session(session)

//         if (!approver) {
//           throw new Error("Kode approval tidak valid")
//         }
//       }

//       if (!isSuperAdmin && !approver) {
//         throw new Error("Approval code wajib diisi")
//       }

//       // 3. Ambil purchase
//       const purchase = await Purchase.findById(oldLog.purchaseId)
//         .session(session)

//       if (!purchase) {
//         throw new Error("Purchase tidak ditemukan")
//       }

//       const paymentCode = purchase.purchaseOrderNumber
//         ?.split("-")[1]
//         ?.trim()

//       if (!paymentCode) {
//         throw new Error("Purchase order number tidak valid")
//       }

//       // 4. Siapkan perubahan log
//       const updates: Record<string, unknown> = {
//         editedAt: new Date()
//       }

//       if (editor) {
//         updates.editedBy = editor._id
//       }

//       if (approver) {
//         updates.editApprovedBy = approver._id
//       }

//       // 5. Validasi dan update nominal pembayaran
//       if (newAmount !== undefined && newAmount !== null) {
//         const amount = Number(newAmount)

//         if (!Number.isFinite(amount) || amount < 0) {
//           throw new Error("Jumlah pembayaran tidak valid")
//         }

//         if (amount !== oldLog.amount) {
//           updates.amount = amount

//           const difference = amount - oldLog.amount

//           await Purchase.updateOne(
//             { _id: purchase._id },
//             { $inc: { payAmount: difference } },
//             { session }
//           )
//         }
//       }

//       // 6. Update tanggal dan waktu
//       const dateValue = newDateTime || newDate

//       if (dateValue) {
//         const date = new Date(dateValue)

//         if (Number.isNaN(date.getTime())) {
//           throw new Error("Tanggal pembayaran tidak valid")
//         }

//         updates.date = date
//       }

//       if (newPaymentMethod) {
//         updates.paymentMethod = newPaymentMethod
//       }

//       if (reference !== undefined) {
//         updates.reference = reference

//         const accountNumber = typeof reference === "string"
//           ? reference.split("-")[1]?.trim()
//           : undefined

//         if (accountNumber) {
//           const bank = await BankAccount.findOne({ accountNumber })
//             .session(session)

//           if (bank) {
//             updates.bankAccountId = bank._id
//           }
//         }
//       }

//       // 7. Update tujuan transaksi non-tunai
//       const paymentMethod = newPaymentMethod || oldLog.paymentMethod

//       if (paymentMethod !== "Cash") {
//         const oldDestination = oldLog.nonCashDst || {}

//         updates.nonCashDst = {
//           accountNumber: destinationAccountNumber !== undefined
//             ? destinationAccountNumber
//             : oldDestination.accountNumber,
//           description: destinationDescription !== undefined
//             ? destinationDescription
//             : oldDestination.description
//         }
//       } else {
//         updates.nonCashDst = null
//       }

//       // 8. Simpan perubahan log
//       const updated = await Log.findByIdAndUpdate(
//         logId,
//         { $set: updates },
//         {
//           new: true,
//           runValidators: true,
//           session
//         }
//       )
//         .populate("createdBy", "name")
//         .populate("editedBy", "name")
//         .populate("editApprovedBy", "name")
//         .lean()

//       if (!updated) {
//         throw new Error("Gagal memperbarui payment log")
//       }

//       // 9. Siapkan reference cashflow
//       const itemIds = purchase.items.map((item: any) => item.productId)

//       const items = await InvItem.find({
//         _id: { $in: itemIds }
//       }).session(session).lean()

//       const unitIds = items.map(item => item.unit)

//       const units = await PredefinedUnit.find({
//         _id: { $in: unitIds }
//       }).session(session).lean()

//       const itemParts = purchase.items.map((purchaseItem: any) => {
//         const item = items.find(
//           item => item._id.toString() === purchaseItem.productId.toString()
//         )

//         if (!item) return null

//         const unit = units.find(
//           unit => unit._id.toString() === item.unit.toString()
//         )

//         return `${item.name} ${purchaseItem.quantity} ${unit?.symbol || ""}`.trim()
//       })

//       const message = itemParts.filter(Boolean).join(", ")

//       // Hitung ulang nilai payAmount setelah perubahan
//       const updatedPayAmount = purchase.payAmount +
//         (
//           newAmount !== undefined && newAmount !== null
//             ? Number(newAmount) - oldLog.amount
//             : 0
//         )

//       const newReference = `pl ${paymentCode} | ${message} | ${updatedPayAmount}`

//       // 10. Cari cashflow terkait
//       const escapedPaymentCode = paymentCode.replace(
//         /[.*+?^${}()|[\]\\]/g,
//         "\\$&"
//       )

//       const cashflow = await Cashflow.findOne({
//         reference: {
//           $regex: escapedPaymentCode,
//           $options: "i"
//         }
//       }).session(session)

//       if (!cashflow) {
//         throw new Error("Cashflow terkait pembayaran tidak ditemukan")
//       }

//       // 11. Sinkronisasi cashflow
//       const bankId = paymentMethod === "Cash"
//         ? null
//         : updates.bankAccountId || oldLog.bankAccountId

//       const cashflowDate = updates.date || oldLog.date

//       const cashflowTime = newTime !== undefined
//         ? newTime
//         : oldLog.time

//       const nonCashDst = paymentMethod === "Cash"
//         ? null
//         : updates.nonCashDst || oldLog.nonCashDst

//       await Cashflow.updateOne(
//         { _id: cashflow._id },
//         {
//           $set: {
//             bankAccountId: bankId,
//             accountType: paymentMethod === "Cash" ? "Cash" : "Bank",
//             amount: updated.amount,
//             reference: newReference,
//             date: cashflowDate,
//             time: cashflowTime,
//             nonCashDst
//           }
//         },
//         { session }
//       )

//       result = updated
//     })

//     return NextResponse.json({
//       noResult: false,
//       message: "Payment log updated",
//       result,
//       error: false
//     })
//   }
//   catch (e: unknown) {
//     return NextResponse.json({
//       noResult: true,
//       message: e instanceof Error
//         ? e.message
//         : "Something went wrong",
//       result: null,
//       error: true
//     })
//   }
//   finally {
//     await session.endSession()
//   }
// }


// export async function PUT(request: NextRequest) {
//   try {
//     await connectToDatabase()

//     const body = await request.json()
//     const {
//       logId,
//       approvalCode,
//       userId,
//       newAmount,
//       newDate,
//       newDateTime,
//       newTime,
//       newPaymentMethod,
//       reference,
//       destinationAccountNumber,
//       destinationDescription,
//     } = body

//     if (!logId) {
//       return NextResponse.json({
//         noResult: true,
//         message: "logId is required",
//         result: null,
//         error: true
//       })
//     }

//     if (!approvalCode) {
//       return NextResponse.json({
//         noResult: true,
//         message: "Approval code is required",
//         result: null,
//         error: true
//       })
//     }

//     const approver = await User.findOne({ approvalCode })

//     if (!approver) {
//       return NextResponse.json({
//         noResult: true,
//         message: "Kode approval tidak valid",
//         result: null,
//         error: true
//       })
//     }

//     const oldLog = await Log.findById(logId)
//     const purchase = await Purchase.findById(oldLog.purchaseId)

//     const paymentCode = purchase.purchaseOrderNumber.split("-")[1].trim()

//     const [cashflowItem] = await Cashflow.aggregate([
//       {
//         $match: {
//           reference: {
//             $regex: paymentCode,
//             $options: "i"
//           }
//         }
//       }
//     ])

//     if (!oldLog) {
//       return NextResponse.json({
//         noResult: true,
//         message: "Log tidak ditemukan",
//         result: null,
//         error: true
//       })
//     }

//     const editor = userId ? await User.findById(userId) : null

//     const updates: Record<string, unknown> = {
//       editedAt: new Date(),
//       editApprovedBy: approver._id
//     }

//     if (editor) updates.editedBy = editor._id

//     if (newAmount !== undefined && newAmount !== null) {
//       const amount = Number(newAmount)

//       if (!Number.isFinite(amount) || amount < 0) {
//         return NextResponse.json({
//           noResult: true,
//           message: "Jumlah pembayaran tidak valid",
//           result: null,
//           error: true
//         })
//       }

//       if (amount !== oldLog.amount) {
//         updates.amount = amount

//         const diff = amount - oldLog.amount
//         const Purchase = (await import('@/models/Purchase')).default

//         await Purchase.findByIdAndUpdate(oldLog.purchaseId, {
//           $inc: { payAmount: diff }
//         })
//       }
//     }

//     const dateValue = newDateTime || newDate

//     if (dateValue) {
//       const date = new Date(dateValue)

//       if (Number.isNaN(date.getTime())) {
//         return NextResponse.json({
//           noResult: true,
//           message: "Tanggal atau waktu pembayaran tidak valid",
//           result: null,
//           error: true
//         })
//       }

//       updates.date = date
//     }

//     if (reference !== undefined) {
//       updates.reference = reference

//       const accountNumber = typeof reference === 'string'
//         ? reference.split('-')[1]?.trim()
//         : undefined

//       if (accountNumber) {
//         const bank = await BankAccount.findOne({ accountNumber })

//         if (bank) {
//           updates.bankAccountId = bank._id
//         }
//       }
//     }

//     if (newPaymentMethod) {
//       updates.paymentMethod = newPaymentMethod
//     }

//     if (updates.paymentMethod != 'Cash') {
//       updates.nonCashDst = {
//         accountNumber: destinationAccountNumber,
//         description: destinationDescription
//       }
//     }

//     const updated = await Log.findByIdAndUpdate(
//       logId,
//       { $set: updates },
//       { new: true, runValidators: true }
//     )
//       .populate('createdBy', 'name')
//       .populate('editedBy', 'name')
//       .populate('editApprovedBy', 'name')
//       .lean()

//     const bankId = updated.paymentMethod === 'Cash' ? null : updated.bankAccountId
//     const accountType = updated.paymentMethod === 'Cash' ? 'Cash' : 'Bank'

//     //const paymentCode = purchase?.purchaseOrderNumber?.split("-")[1]?.trim() || ''

//     const itemParts = await Promise.all(
//       (purchase?.items || []).map(async (i: any) => {
//         const item = await InvItem.findById(i.productId)
//         if (!item) return ''

//         const unit = await PredefinedUnit.findById(item.unit)

//         return `${item.name} ${i.quantity} ${unit?.symbol || ''}`.trim()
//       })
//     )

//     const message = itemParts.filter(Boolean).join(', ')

//     //const newReference = `pl ${purchase.purchaseOrderNumber.split('-')[1].trim()} | pembayaran procurement senilai ${updated.amount}`

//     const updatedPurchase = await Purchase.findById(oldLog.purchaseId)

//     const newReference = `pl ${paymentCode} | ${message} | ${updatedPurchase?.payAmount}`

//     const nonCashDst = updated.paymentMethod == 'Cash' ? null : {
//       accountNumber: destinationAccountNumber,
//       description: destinationDescription
//     }

//     await Cashflow.findByIdAndUpdate(
//       cashflowItem._id,
//       {
//         $set: {
//           bankAccountId: bankId,
//           accountType,
//           amount: updated.amount,
//           reference: newReference,
//           date: newDate,
//           time: newTime,
//           nonCashDst
//         }
//       }
//     )

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
//       message: e instanceof Error ? e.message : "Something wennt wrong",
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

