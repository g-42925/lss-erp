import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Batches from '@/models/Batche'
import Invoice from '@/models/Invoice'

import Order from "@/models/Order"
import Deliverie from '@/models/Deliverie'
import Companie from '@/models/Companie'
import Product from '@/models/Product'
import Reservation from '@/models/Reservation'
import Warehouse from '@/models/Warehouse'
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
	try {
		await connectToDatabase()
		const url = new URL(request.url)
		const prod = url.searchParams.get("prod")
		const pr = await Product.findById(prod)

		const locId = url.searchParams.get("locationId")

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
			message: e instanceof Error ? e.message : String(e),
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
			total: params.total,
			createdBy: params.userId
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

		// ─── Kelola stock berdasarkan pickup date ────────────────────────
		// Bandingkan tanggal saja (strip waktu) agar pickup "hari ini" = deduct langsung
		const pickupDay = new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate())
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

		if (pickupDay > today) {
			// Pickup di masa depan → reservasi (tahan stock, jangan potong outQty)
			for (const item of params.cart) {
				const productObjId = new mongoose.Types.ObjectId(item.productId)
				const warehouseObjId = item.warehouseId
					? new mongoose.Types.ObjectId(item.warehouseId)
					: null

				const batchQuery: Record<string, unknown> = {
					productId: productObjId,
					status: 'ACTIVE',
				}
				if (warehouseObjId) batchQuery.warehouseId = warehouseObjId

				const batchList = await Batches.find(batchQuery).sort({ createdAt: 1 })

				let remainingToReserve = Number(item.qty)
				for (const batch of batchList) {
					if (remainingToReserve <= 0) break
					const freeQty = batch.accumulative - batch.outQty - (batch.reserved || 0)
					if (freeQty <= 0) continue
					const toReserve = Math.min(freeQty, remainingToReserve)

					await Batches.findByIdAndUpdate(batch._id, { $inc: { reserved: toReserve } })
					await Reservation.create({
						batchId: batch._id,
						salesOrderNumber: salesOrderNumber,
						salesOrderId: result._id,
						productId: productObjId,
						warehouseId: warehouseObjId,
						qty: toReserve,
						pickupDate: pickup,
						status: 'ACTIVE',
					})
					remainingToReserve -= toReserve
				}
			}
		}
		else {
			// Pickup hari ini atau sudah lewat → langsung potong stock (deduct outQty)
			const deliveryItems: Array<{ productId: mongoose.Types.ObjectId; qty: number; batchNumber: string; locationId: mongoose.Types.ObjectId }> = []
			for (const item of params.cart) {
				const productObjId = new mongoose.Types.ObjectId(item.productId)
				const warehouseObjId = item.warehouseId
					? new mongoose.Types.ObjectId(item.warehouseId)
					: null

				const batchQuery: Record<string, unknown> = {
					productId: productObjId,
					status: 'ACTIVE',
				}
				if (warehouseObjId) batchQuery.warehouseId = warehouseObjId

				const batchList = await Batches.find(batchQuery).sort({ createdAt: 1 })

				let remainingToDeduct = Number(item.qty)
				for (const batch of batchList) {
					if (remainingToDeduct <= 0) break
					const freeQty = batch.accumulative - batch.outQty - (batch.reserved || 0)
					if (freeQty <= 0) continue
					const toDeduct = Math.min(freeQty, remainingToDeduct)

					// Potong outQty langsung
					await Batches.findByIdAndUpdate(batch._id, { $inc: { outQty: toDeduct } })

					// Tandai sebagai IMMEDIATE agar delivery tidak double-deduct
					await Reservation.create({
						batchId: batch._id,
						salesOrderNumber: salesOrderNumber,
						salesOrderId: result._id,
						productId: productObjId,
						warehouseId: warehouseObjId,
						qty: toDeduct,
						pickupDate: null,
						status: 'IMMEDIATE',
					})

					// Kumpulkan item ke delivery log
					deliveryItems.push({
						productId: productObjId,
						qty: toDeduct,
						batchNumber: batch.batchNumber,
						locationId: batch.locationId || warehouseObjId || batch.warehouseId,
					})

					remainingToDeduct -= toDeduct
				}
			}

			// Buat satu Deliverie document sebagai shipping log
			if (deliveryItems.length > 0) {
				await Deliverie.create({
					companyId: company._id,
					salesOrderNumber,
					deliveryNumber: `D-${String(Date.now()).slice(-5)}`,
					items: deliveryItems,
					date: new Date(),
					createdBy: params.userId ? new mongoose.Types.ObjectId(params.userId.toString()) : null,
					editable: false
				})
			}
		}
		// ─────────────────────────────────────────────────────────────

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
			message: e instanceof Error ? e.message : String(e),
			result: null,
			error: true
		})
	}
}