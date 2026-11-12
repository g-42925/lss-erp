import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb";
import PredefinedUnit from "@/models/PredefinedUnit"

export async function GET() {
	try {
		await connectToDatabase()

		const units = await PredefinedUnit.find()
			.sort({ category: 1, name: 1 })
			.lean()

		return NextResponse.json({
			noResult: false,
			message: '',
			result: units,
			error: false
		});

		//return NextResponse.json(units)
	}
	catch (error) {
		return NextResponse.json(
			{ message: error.message },
			{ status: 500 }
		)
	}
}

export async function POST(req) {
	try {
		await connectToDatabase()

		const body = await req.json()

		const unit = await PredefinedUnit.create({
			name: body.name,
			symbol: body.symbol,
			category: body.category,
			factorToBase: body.factorToBase,
			isActive: body.isActive ?? true
		})

		return NextResponse.json({
			noResult: false,
			message: '',
			result: unit,
			error: false
		});

		return NextResponse.json(unit, { status: 201 })
	}
	catch (error) {
		if (error.code === 11000) return NextResponse.json(
			{ message: "Simbol satuan sudah digunakan" },
			{ status: 409 }
		)

		if (error.name === "ValidationError") return NextResponse.json(
			{ message: error.message },
			{ status: 400 }
		)

		return NextResponse.json(
			{ message: error.message },
			{ status: 500 }
		)
	}
}