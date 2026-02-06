import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Role from '@/models/Role'
import Companie from '@/models/Companie'

export async function PUT(req: Request) {
  const body = await req.json();
	const {_id,...rest} = body

	try{
		await connectToDatabase()
		await Role.findByIdAndUpdate(
			_id,rest
		)
		return NextResponse.json(
			{
				noResult:false,
				message:"",
				result:body,
				error:false
			}
		);
	}
	catch(e:any){
		return NextResponse.json(
			{
				noResult:true,
				message:e.message,
				result:null,
				error:true
			}
		)		
	}

}

export async function DELETE(request:NextRequest){	
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
	try {
		await connectToDatabase()
		var result = await Role.findByIdAndDelete(id);
		return NextResponse.json(
			{
				noResult:false,
				message:"",
				result:id,
				error:false
			}
		)
	} 
	catch (e:any) {
		return NextResponse.json(
			{
				noResult:true,
				message:e.message,
				result:null,
				error:true
			}
		)
	}	
}

export async function GET(request:NextRequest){	
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

	try {
		await connectToDatabase()
		const company = await Companie.findOne({
			masterAccountId:id
		})
		const roles = await Role.find({
			companyId:company._id
		})
		return NextResponse.json(
			{
				noResult:false,
				message:"",
				result:roles,
				error:false
			}
		)
	} 
	catch (e:any) {
		return NextResponse.json(
			{
				noResult:true,
				message:e.message,
				result:null,
				error:true
			}
		)
	}	
}

export async function POST(request:NextRequest) {
	try {
		await connectToDatabase()
		const params = await request.json()
		const company = await Companie.findOne({
			masterAccountId:params.id
		})
		const isExist = await Role.findOne({
			companyId:company._id,
			name:params.name
		})

		const result = {
			name:params.name,
			permission:params.permission,
			page:params.page,
			companyId:company._id
		}

		if(isExist){
			return NextResponse.json(
				{
					noResult:true,
					message:"Role is exist",
					result:null,
					error:false,
				}
			)
		}
		else{
			var newRole = await Role.create({
				...result
			})
			
			return NextResponse.json(
				{
					noResult:false,
					message:"",
					result:newRole,
					error:false
				}
			)
		}
	} 
	catch (e:any) {
		return NextResponse.json(
			{
				noResult:true,
				message:e.message,
				result:null,
				error:true
			}
		)
	}
}
