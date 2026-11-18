/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose"
import { Types, PipelineStage } from 'mongoose'
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getAvailableBalance } from '@/lib/finance/balance'




import Purchase from '@/models/Purchase'

// Helper: ambil data bank untuk Log (reference: "BANK-NOMORREKENING", bankAccountId sebagai ObjectId)


export async function PUT(request: NextRequest) {
	try {
		await connectToDatabase()
		const body = await request.json()
		const { _id, link } = body

		console.log("_id", _id)
		console.log("link", link)

		const d = await Purchase.findByIdAndUpdate(
			new mongoose.Types.ObjectId(_id),
			{ link }
		)

		return NextResponse.json(
			{
				noResult: false,
				message: "Link berhasil diupdate",
				result: d,
				error: false
			}
		)
	}
	catch (e: any) {
		return NextResponse.json({
			noResult: true,
			message: e.message,
			result: null,
			error: true
		})
	}
}
