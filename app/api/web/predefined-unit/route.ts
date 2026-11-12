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
	catch (e: unknown) {
		return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
	}
}

export async function POST(req: any) {
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

	}
	catch (e: unknown) {
		return NextResponse.json({ noResult: true, message: (e as Error).message, result: null, error: true });
	}
}