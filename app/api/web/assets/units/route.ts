
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
