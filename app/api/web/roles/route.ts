import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Role from '@/models/Role'
import Companie from '@/models/Companie'
import Assignment from '@/models/Assignment'

export async function PUT(req: Request) {
	const body = await req.json();
	const { _id, name, pages } = body

	try {
		await connectToDatabase()
		await Role.findByIdAndUpdate(_id, { name })

		// Update assignments: delete old ones and create new ones
		await Assignment.deleteMany({ roleId: _id })

		if (pages && Array.isArray(pages)) {
			for (const p of pages) {
				await Assignment.create({
					roleId: _id,
					link: p.link,
					permissions: p.permissions
				})
			}
		}

		return NextResponse.json(
			{
				noResult: false,
				message: "Role updated successfully",
				result: body,
				error: false
			}
		);
	}
	catch (e: any) {
		return NextResponse.json(
			{
				noResult: true,
				message: e.message,
				result: null,
				error: true
			}
		)
	}

}

export async function DELETE(request: NextRequest) {
	const url = new URL(request.url);
	const id = url.searchParams.get("id")?.trim();
	try {
		await connectToDatabase()
		await Role.findByIdAndDelete(id);
		await Assignment.deleteMany({ roleId: id })
		return NextResponse.json(
			{
				noResult: false,
				message: "",
				result: id,
				error: false
			}
		)
	}
	catch (e: any) {
		return NextResponse.json(
			{
				noResult: true,
				message: e.message,
				result: null,
				error: true
			}
		)
	}
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const id = url.searchParams.get("id");

	try {
		await connectToDatabase()
		if (!id) {
			return NextResponse.json(
				{
					noResult: true,
					message: "ID is required",
					result: null,
					error: true
				}
			)
		}

		const company = await Companie.findOne({
			masterAccountId: id
		})

		if (!company) {
			return NextResponse.json(
				{
					noResult: true,
					message: "Company not found",
					result: null,
					error: true
				}
			)
		}

		const roles = await Role.find({
			companyId: company._id
		})

		// Fetch assignments for each role
		const rolesWithPages = await Promise.all(roles.map(async (role) => {
			const assignments = await Assignment.find({ roleId: role._id })
			return {
				...role._doc,
				pages: assignments.map(a => ({
					link: a.link,
					permissions: a.permissions
				}))
			}
		}))

		return NextResponse.json(
			{
				noResult: false,
				message: "",
				result: rolesWithPages,
				error: false
			}
		)
	}
	catch (e: any) {
		return NextResponse.json(
			{
				noResult: true,
				message: e.message,
				result: null,
				error: true
			}
		)
	}
}

export async function POST(request: NextRequest) {
	try {
		await connectToDatabase()
		const params = await request.json()

		if (!params.id) {
			return NextResponse.json(
				{
					noResult: true,
					message: "ID is required",
					result: null,
					error: true
				}
			)
		}

		const company = await Companie.findOne({
			masterAccountId: params.id
		})

		if (!company) {
			return NextResponse.json(
				{
					noResult: true,
					message: "Company not found",
					result: null,
					error: true
				}
			)
		}

		const isExist = await Role.findOne({
			companyId: company._id,
			name: params.name
		})

		if (isExist) {
			return NextResponse.json(
				{
					noResult: true,
					message: "Role already exists",
					result: null,
					error: false,
				}
			)
		}
		else {
			const newRole = await Role.create({
				companyId: company._id,
				name: params.name
			})

			if (params.pages && Array.isArray(params.pages)) {
				for (const p of params.pages) {
					await Assignment.create({
						roleId: newRole._id,
						link: p.link,
						permissions: p.permissions
					})
				}
			}

			return NextResponse.json(
				{
					noResult: false,
					message: "",
					result: newRole,
					error: false
				}
			)
		}
	}
	catch (e: any) {
		return NextResponse.json(
			{
				noResult: true,
				message: e.message,
				result: null,
				error: true
			}
		)
	}
}
