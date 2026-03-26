import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Invoice from '@/models/Invoice'
import Location from '@/models/Location'
import Order from "@/models/Order"
import Companie from '@/models/Companie'
import Product from '@/models/Product'
import Allocation from '@/models/Allocation'
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()
		const url = new URL(request.url)
		const prod = url.searchParams.get("prod")
		const pr = await Product.findById(prod)

		const result = await Location.aggregate([
			{
				$match: {
					locationOf: pr.productOf
				}
			},
			{
				$lookup: {
					as: "allocations",
					from: "allocations",
					let: { locationId: "$_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$locationId", "$$locationId"] },
										{ $eq: ["$productId", pr._id] }
									]
								}
							}
						}
					],
				}
			},
			{
				$addFields: {
					allocated: { $sum: "$allocations.qty" }
				}
			},
			{
				$match: {
					allocated: { $gt: 0 }
				}
			}
		])

		return NextResponse.json({
			noResult: false,
			message: "success",
			result: result,
			error: false
		})

	}
	catch (e: unknown) {
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
		const company = await Companie.findOne({
			masterAccountId: params.id
		})

		await Promise.all(
			params.cart.map(async c => {

				let quantity = c.qty
				const location = c.loc

				const [product] = await Product.aggregate([
					{
						$match: {
							_id: new mongoose.Types.ObjectId(c.productId)
						}
					},
					{
						$lookup: {
							from: "batches",
							localField: "_id",
							foreignField: "productId",
							as: "batches",
							pipeline: [
								{
									$match: {
										$expr: {
											$and: [
												{ $eq: ["$status", "ACTIVE"] }
											]
										}
									}
								}
							]
						}
					},
					{
						$unwind: {
							path: "$batches",
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$group: {
							_id: "$_id",
							doc: { $first: "$$ROOT" },
							accumulative: { $sum: "$batches.accumulative" },
							out: { $sum: "$batches.outQty" }
						}
					},
					{
						$addFields: {
							remain: {
								$subtract: ["$accumulative", "$out"]
							}
						}
					},
					{
						$replaceRoot: {
							newRoot: {
								$mergeObjects: [
									"$doc",
									{
										remain: "$remain",
									}
								]
							}
						}
					},
					{
						$project: {
							batches: 0,
						}
					},
					{
						$lookup: {
							from: "allocations",
							localField: "_id",
							foreignField: "productId",
							as: "allocations"
						}
					},
					{
						$addFields: {
							allocated: {
								$sum: {
									$map: {
										input: "$allocations",
										as: "a",
										in: "$$a.qty"
									}
								}
							}
						}
					},
					{
						$project: {
							allocations: 0,
						}
					}
				])

				const unitCost = product.stockValue / (product.remain + product.allocated)

				const stock = await Allocation.find({
					productId: c.productId,
					locationId: location
				})

				for (const n of stock) {

					if (quantity <= 0) break

					if (n.qty >= quantity) {

						await Allocation.findByIdAndUpdate(
							n._id,
							{ $inc: { qty: -quantity } }
						)

						quantity = 0
						break
					}
					else {

						quantity = quantity - n.qty

						await Allocation.findByIdAndUpdate(n._id, {
							qty: 0
						})
					}

				}

				await Product.findByIdAndUpdate(
					product._id, {
					$inc: {
						stockValue: -(unitCost * c.qty)
					}
				}
				)
			})
		)

		const result = await Order.create({
			companyId: company._id,
			salesOrderNumber: `SO-${String(Date.now()).slice(-5)}`,
			cart: params.cart, // product id, qty, price
			customerName: params.customerName,
			productType: 'good',
			type: 'direct',
			discountType: params.discountType,
			discountValue: params.discountValue,
			taxValue: params.tax,
			saleDate: new Date(),
			payTerm: params.payTerm,
			total: params.total
		})

		const paid = params.debt === 'yes' ? false : true

		await Invoice.create({
			companyId: company._id,
			invoiceNumber: `INV-${String(Date.now()).slice(-5)}`,
			invoiceType: 'product',
			salesOrderId: result._id,
			salesOrderNumber: result.salesOrderNumber,
			payAmount: params.payAmount,
			paid: paid,
			date: new Date()
		})

		return NextResponse.json({
			noResult: false,
			message: "success",
			result: result,
			error: false
		})
	}
	catch (e: unknown) {
		return NextResponse.json({
			noResult: true,
			message: e.message,
			result: null,
			error: true
		})
	}
}