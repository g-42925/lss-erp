import { connectToDatabase } from "@/lib/mongodb";
import { getAvailableBalance } from '@/lib/finance/balance'
import { NextRequest, NextResponse } from "next/server";
import mongoose, { PipelineStage } from "mongoose"
import BankAccount from '@/models/BankAccount'
import Purchase from '@/models/Purchase'
import Invoice from '@/models/Invoice'
import ServiceOrder from '@/models/ServiceOrder'
import Companie from '@/models/Companie'
import Log from '@/models/Log'
import Cashflow from '@/models/Cashflow'
import Vendor from '@/models/Vendor'
import "@/models/Tax"

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()

		const { searchParams } = new URL(request.url)
		const purchaseOrderNumber = decodeURIComponent(searchParams.get("po") as string)
		const purchase = await Purchase.findOne({
			purchaseOrderNumber: {
				$regex: purchaseOrderNumber,
				$options: "i"
			}
		})

		const result = purchase?.refundLog

		return NextResponse.json({
			noResult: false,
			message: "",
			result: result,
			error: false
		})
	}
	catch (e: unknown) {
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

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()
		const body = await request.json()
		const { poNumber, refundBankAccountId, ...rest } = body
		const _p = await Purchase.findOne({
			purchaseOrderNumber: poNumber
		})

		if (!_p) {
			return NextResponse.json({
				noResult: true,
				message: `Purchase dengan nomor ${poNumber} tidak ditemukan`,
				result: null,
				error: true
			})
		}

		const bankAccountId = refundBankAccountId != '' ? new mongoose.Types.ObjectId(refundBankAccountId) : null
		const refundNumber = `RF${Date.now().toString(36).toUpperCase()}`

		// Petakan nilai yang masih ada di rest
		const refundAmount = Number(rest.refundAmount)
		const refundMethod = rest.refundMethod as string   // 'Cash' | 'Bank'
		const refundDate = rest.refundDate ? new Date(rest.refundDate) : new Date()
		const refundTime = rest.refundTime as string | undefined

		await Purchase.updateOne(
			{
				_id: _p._id
			},
			{
				$push: {
					refundLog: {
						...rest,
						refundBankAccountId: bankAccountId,
						refundNumber: refundNumber
					}
				}
			}
		)

		await Cashflow.create({
			companyId: _p.companyId,
			bankAccountId: bankAccountId,
			accountType: refundMethod,       // 'Cash' atau 'Bank' (sesuai enum schema)
			type: 'in',
			amount: refundAmount,            // pakai refundAmount, bukan amount
			date: refundDate,                // pakai field 'date', bukan createdAt/updatedAt
			reference: `${refundNumber} | refund dari P.O ${_p.purchaseOrderNumber.split('-')[1]}`,
			recordedBy: null,
			source: 'Refund',
			from: _p.purchaseOrderNumber,
			time: refundTime ?? null
		})

		return NextResponse.json({
			noResult: false,
			message: "Refund berhasil disimpan",
			result: {},
			error: false
		})
	}
	catch (e: unknown) {
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

export async function PUT(request: NextRequest) {
	try {
		await connectToDatabase()
		const body = await request.json()
		const { _id, purchaseOrderNumber, refundNumber, ...rest } = body

		const purchase = await Purchase.findOne({ purchaseOrderNumber })
		const cashflow = await Cashflow.findOne({ reference: { $regex: `${refundNumber}` } })

		await Purchase.updateOne(
			{
				_id: purchase._id,
				"refundLog.refundNumber": refundNumber
			},
			{
				$set: Object.fromEntries(
					Object.entries(rest).map(([key, value]) => [
						`refundLog.$.${key}`,
						value
					])
				)
			}
		)

		await Cashflow.updateOne(
			{
				_id: cashflow._id
			},
			{
				$set: {
					amount: Number(rest.refundAmount),
					date: new Date(rest.refundDate),
					time: rest.refundTime ?? null,
					bankAccountId: rest.refundBankAccountId,
					accountType: rest.refundMethod,
				}
			}
		)

		return NextResponse.json({
			noResult: false,
			message: "Refund berhasil diupdate",
			result: {},
			error: false
		})
	}
	catch (e: unknown) {
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