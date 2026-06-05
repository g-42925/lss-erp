import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Batches from '@/models/Batche'
import Invoice from '@/models/Invoice'
import Location from '@/models/Location'
import Order from "@/models/Order"
import Companie from '@/models/Companie'
import Product from '@/models/Product'
import Reservation from '@/models/Reservation'
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()
		const url = new URL(request.url)
		const prod = url.searchParams.get("prod")
		const pr = await Product.findById(prod)

		const locId = url.searchParams.get("locationId")
		const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse');

		const result = await Warehouse.aggregate([
			{
				$match: locId ? { locationId: new mongoose.Types.ObjectId(locId) } : {}
			},
			{
				$lookup: {
					as: "batches",
					from: "batches",
					let: { warehouseId: "$_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ["$warehouseId", "$$warehouseId"] },
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
					available: {
						$subtract: [
							{ $sum: "$batches.accumulative" },
							{
								$add: [
									{ $sum: "$batches.outQty" },
									{ $sum: "$batches.reserved" }
								]
							}
						]
					}
				}
			},
			{
				$match: {
					available: { $gt: 0 }
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

	const salesOrderNumber = `SO-${String(Date.now()).slice(-5)}`

	function formatNumber(x: number) {
		return String(x).padStart(4, '0');
	}

	try {
		await connectToDatabase()
		const now = new Date()
		const params = await request.json()
		const company = await Companie.findOne({
			masterAccountId: params.id
		})

		const pickup = new Date(params.pickupDate)


		// Stock reduction is now exclusively handled by the partial movement (delivery) module

		const orders = await Order.find({
			companyId: company._id,
		})

		const result = await Order.create({
			companyId: company._id,
			salesOrderNumber: salesOrderNumber,
			cart: params.cart, // product id, qty, price
			customCustomer: params.customCustomer,
			productType: 'good',
			type: 'direct',
			discountType: params.discountType,
			discountValue: params.discountValue,
			taxValue: params.tax,
			taxes: params.taxes,
			saleDate: new Date(),
			payTerm: new Date(params.payTerm),
			pickupDate: new Date(params.pickupDate),
			total: params.total
		})

		const paid = params.debt === 'yes' ? false : true

		const shortYear = String(now.getFullYear()).slice(-2);
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const invoiceNumber = `${company.invoiceCode}${shortYear}${month}${formatNumber(orders.length + 1)}`

		const status = pickup.toLocaleDateString() === now.toLocaleDateString() ? 'active' : 'draft'

		await Invoice.create({
			status: status,
			companyId: company._id,
			invoiceNumber: invoiceNumber,
			invoiceType: 'product',
			salesOrderId: result._id,
			salesOrderNumber: result.salesOrderNumber,
			payAmount: params.payAmount,
			date: new Date(params.pickupDate),
			paid: paid,
			paymentHistory: [
				{
					amount: params.payAmount,
					method: params.paymentMethod,
					date: new Date()
				}
			]
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