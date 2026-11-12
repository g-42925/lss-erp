import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectToDatabase } from "@/lib/mongodb"
import PredefinedUnit from "@/models/PredefinedUnit"

export async function GET(req, { params }: any) {
	try {
		await connectToDatabase()

		const { id } = await params

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return NextResponse.json(
				{ message: "ID satuan tidak valid" },
				{ status: 400 }
			)
		}

		const unit = await PredefinedUnit.findById(id).lean()

		if (!unit) return NextResponse.json(
			{ message: "Satuan tidak ditemukan" },
			{ status: 404 }
		)

		return NextResponse.json(unit)
	}
	catch (error) {
		return NextResponse.json(
			{ message: error.message },
			{ status: 500 }
		)
	}
}

export async function PUT(req, { params }: any) {
	try {
		await connectToDatabase()

		const { id } = awaist params

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return NextResponse.json(
				{ message: "ID satuan tidak valid" },
				{ status: 400 }
			)
		}

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

		if (!unit) {
			return NextResponse.json(
				{ message: "Satuan tidak ditemukan" },
				{ status: 404 }
			)
		}

		return NextResponse.json(unit)
	} catch (error) {
		if (error.code === 11000) {
			return NextResponse.json(
				{ message: "Simbol satuan sudah digunakan" },
				{ status: 409 }
			)
		}

		if (error.name === "ValidationError") {
			return NextResponse.json(
				{ message: error.message },
				{ status: 400 }
			)
		}

		return NextResponse.json(
			{ message: error.message },
			{ status: 500 }
		)
	}
}