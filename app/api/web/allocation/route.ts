import Product from '@/models/Product'
import Companie from '@/models/Companie'
import Allocation from '@/models/Allocation'
import Batches from '@/models/Batche'

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
	try {
		await connectToDatabase()
		const params = await request.json()

		const a = await Allocation.findById(
			params._id
		)

		await Allocation.findByIdAndUpdate(
			params._id, {
			$inc: {
				qty: params.qty
			}
		}
		)

		await Batches.findOneAndUpdate(
			{ batchNumber: a.from },
			{ $inc: { outQty: params.qty } }
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

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const id = url.searchParams.get("id")


	try {
		await connectToDatabase()

		const company = await Companie.findOne({
			masterAccountId: id
		})

		const result = await Product.aggregate([
			{
				$match: {
					productOf: company._id,
					productType: "good"
				}
			},
			{
				$lookup: {
					from: "allocations",
					let: { productId: "$_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$productId", "$$productId"]
								}
							}
						},
						{
							$lookup: {
								from: "locations",
								localField: "locationId",
								foreignField: "_id",
								as: "location"
							}
						},
						{
							$unwind: {
								path: "$location",
								preserveNullAndEmptyArrays: true
							}
						}
					],
					as: "allocations"
				}
			}
		])

		return NextResponse.json({
			noResult: false,
			message: "",
			result: result,
			error: false
		})

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

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()
		const params = await request.json()
		const { id, ...rest } = params

		await Allocation.create(params)

		await Batches.findOneAndUpdate(
			{ batchNumber: rest.from },
			{ $inc: { outQty: rest.qty } }
		)

		var company = await Companie.findOne({
			masterAccountId: id
		})

		const result = await Product.aggregate([
			{
				$match: {
					productOf: company._id,
					productType: "good"
				}
			},
			{
				$lookup: {
					from: "allocations",
					let: { productId: "$_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ["$productId", "$$productId"]
								}
							}
						},
						{
							$lookup: {
								from: "locations",
								localField: "locationId",
								foreignField: "_id",
								as: "location"
							}
						},
						{
							$unwind: {
								path: "$location",
								preserveNullAndEmptyArrays: true
							}
						}
					],
					as: "allocations"
				}
			}
		])

		return NextResponse.json({
			noResult: false,
			message: "",
			result: result,
			error: false
		})

	}
	catch (e: any) {
		return NextResponse.json({
			noResult: true,
			message: "123",
			result: null,
			error: true
		})
	}
}