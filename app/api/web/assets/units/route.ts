
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"

import { connectToDatabase } from "@/lib/mongodb"
import Companie from "@/models/Companie"
import Asset from "@/models/Asset"

const conditions = ["good", "fair", "poor", "damaged"]
const statuses = ["active", "inactive", "disposed", "under_maintenance"]

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()

		const body = await request.json()
		const { masterAccountId, assetId, unit } = body

		const company = await Companie.findOne({ masterAccountId })

		const label = String(unit?.label || "").trim()
		const condition = unit?.condition || "good"
		const status = unit?.status || "active"
		const addedAt = unit?.addedAt ? new Date(unit.addedAt) : new Date()

		if (!label) return NextResponse.json({
			error: true,
			message: "Unit label is required",
			result: null
		}, { status: 400 })

		if (!conditions.includes(condition) || !statuses.includes(status)) {
			return NextResponse.json({
				error: true,
				message: "Invalid condition or status",
				result: null
			}, { status: 400 })
		}

		if (Number.isNaN(addedAt.getTime())) return NextResponse.json({
			error: true,
			message: "Invalid addedAt date",
			result: null
		}, { status: 400 })


		// Pastikan label unit belum digunakan di perusahaan ini.
		const duplicate = await Asset.findOne({
			companyId: company._id,
			"units.label": label
		})
			.collation({
				locale: "en",
				strength: 2
			})

		if (duplicate) {
			return NextResponse.json({
				error: true,
				message: "Unit label already exists",
				result: null
			}, { status: 409 })
		}

		// Cari asset berdasarkan ID sekaligus kepemilikan perusahaan.
		const asset = await Asset.findOneAndUpdate(
			{
				_id: assetId,
				companyId: company._id
			},
			{
				$push: {
					units: {
						label,
						condition,
						status,
						addedAt,
						purchaseId: null,
						receivingId: null
					}
				}
			},
			{
				new: true,
				runValidators: true
			}
		).populate("category", "name")

		if (!asset) {
			return NextResponse.json({
				error: true,
				message: "Asset not found",
				result: null
			}, { status: 404 })
		}

		return NextResponse.json({
			error: false,
			message: "Unit successfully added",
			result: asset
		})
	}
	catch (error) {
		console.error("ADD ASSET UNIT ERROR:", error)

		return NextResponse.json({
			error: true,
			message: "Failed to add asset unit",
			result: null
		}, { status: 500 })
	}
}

export async function PUT(request: NextRequest) {
	try {
		await connectToDatabase()

		const body = await request.json()
		const { masterAccountId, assetId, unitId, unit } = body

		if (!masterAccountId || !assetId || !unitId) {
			return NextResponse.json({
				error: true,
				message: "masterAccountId, assetId, and unitId are required",
				result: null
			}, { status: 400 })
		}

		const company = await Companie.findOne({ masterAccountId })
		if (!company) {
			return NextResponse.json({
				error: true,
				message: "Company not found",
				result: null
			}, { status: 404 })
		}

		const label = String(unit?.label || "").trim()
		const condition = unit?.condition || "good"
		const status = unit?.status || "active"
		const addedAt = unit?.addedAt ? new Date(unit.addedAt) : new Date()

		if (!label) return NextResponse.json({
			error: true,
			message: "Unit label is required",
			result: null
		}, { status: 400 })

		if (!conditions.includes(condition) || !statuses.includes(status)) {
			return NextResponse.json({
				error: true,
				message: "Invalid condition or status",
				result: null
			}, { status: 400 })
		}

		if (Number.isNaN(addedAt.getTime())) return NextResponse.json({
			error: true,
			message: "Invalid addedAt date",
			result: null
		}, { status: 400 })

		const targetUnitObjectId = mongoose.Types.ObjectId.isValid(unitId)
			? new mongoose.Types.ObjectId(unitId)
			: unitId

		// Pastikan label unit baru tidak bentrok dengan unit lain di perusahaan
		const duplicate = await Asset.findOne({
			companyId: company._id,
			units: {
				$elemMatch: {
					_id: { $ne: targetUnitObjectId },
					label: label
				}
			}
		}).collation({
			locale: "en",
			strength: 2
		})

		if (duplicate) {
			return NextResponse.json({
				error: true,
				message: "Unit label already exists",
				result: null
			}, { status: 409 })
		}

		const asset = await Asset.findOneAndUpdate(
			{
				_id: assetId,
				companyId: company._id,
				"units._id": targetUnitObjectId
			},
			{
				$set: {
					"units.$.label": label,
					"units.$.condition": condition,
					"units.$.status": status,
					"units.$.addedAt": addedAt
				}
			},
			{
				new: true,
				runValidators: true
			}
		).populate("category", "name")

		if (!asset) {
			return NextResponse.json({
				error: true,
				message: "Asset or unit not found",
				result: null
			}, { status: 404 })
		}

		return NextResponse.json({
			error: false,
			message: "Unit successfully updated",
			result: asset
		})
	}
	catch (error) {
		console.error("UPDATE ASSET UNIT ERROR:", error)

		return NextResponse.json({
			error: true,
			message: error instanceof Error ? error.message : "Failed to update asset unit",
			result: null
		}, { status: 500 })
	}
}
