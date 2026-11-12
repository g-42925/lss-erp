import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"
import PredefinedUnit from "@/models/PredefinedUnit"

export async function GET(req: any, { params }: any) {
	try {
		await connectToDatabase()

		const { id } = await params

		if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ noResult: true, message: "ID satuan tidak valid", result: null, error: true });

		const unit = await PredefinedUnit.findById(id).lean()

		if (!unit) return NextResponse.json({ noResult: true, message: "Unit tidak ditemukan", result: null, error: true });

		return NextResponse.json({ noResult: false, message: "Unit ditemukan", result: unit, error: false });
	}
	catch (e: unknown) {
		return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
	}
}

export async function PUT(req: any, { params }: any) {
	try {
		await connectToDatabase()

		const { id } = await params

		if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ noResult: true, message: "ID satuan tidak valid", result: null, error: true });

		const body = await req.json()

		const unit = await PredefinedUnit.findByIdAndUpdate(
			id,
			{
				name: body.name,
				symbol: body.symbol,
				category: body.category,
				factorToBase: body.factorToBase,
				isActive: body.isActive
			},
			{
				new: true,
				runValidators: true
			}
		)

		if (!unit) return NextResponse.json({ noResult: true, message: "Unit tidak ditemukan", result: null, error: true });

		return NextResponse.json({ noResult: false, message: "Unit berhasil diperbarui", result: unit, error: false });
	}
	catch (e: unknown) {
		return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
	}
}