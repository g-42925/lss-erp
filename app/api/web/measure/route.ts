import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from '@/models/Companie'
import Measurement from '@/models/Measurement'


export async function GET(request:NextResponse){
	try{
		await connectToDatabase()
		const url = new URL(request.url);
		const id = url.searchParams.get("id");

		const company = await Companie.findOne({
			masterAccountId:id
		})

		const result = await Measurement.aggregate([
			{
				$match:{
					supplierOf:company._id
				}
			},
			{
				$lookup:{
					from:"suppliers",
					localField:"supplierId",
					foreignField:"_id",
					as:"supplier"
				}
			},
			{
				$unwind:'$supplier'
			},
			{
				$lookup:{
					from:"products",
					localField:"productId",
					foreignField:"_id",
					as:"product"
				}
			},
			{
				$unwind:'$product'
			}
		])

		return NextResponse.json({
			noResult: false,
			message: "",
			result:result,
			error:false
	  })
  }
	catch(e:any){
		return NextResponse.json({
			noResult: true,
			message: e.message,
			result: null,
			error:true
		})
	}
}

export async function PUT(request:NextRequest){
  try{
		await connectToDatabase()
	
		const params = await request.json()

		await Measurement.findByIdAndUpdate(
			params._id,
			params
		)

		return NextResponse.json({
			noResult: false,
			message: "",
			result:params,
			error:false
		})
	}	
	catch(e:any){
		return NextResponse.json({
			noResult: true,
			message: e.message,
			result: null,
			error:true
		})
	}
}

export async function POST(request:NextRequest){
	try{
		await connectToDatabase()
		const params = await request.json()
		const masterAccountId = params.id
	  
		const company = await Companie.findOne({
			masterAccountId
		})

		const result = await Measurement.create({
			productId:params.productId,
      supplierId:params.supplierId,
			supplierOf:company._id,
			unit:params.unit,
			ratio:params.ratio
		})

		return NextResponse.json({
			noResult: false,
			message: "",
			result:result,
			error:false
		})

	}
	catch(e:any){
		return NextResponse.json({
			noResult: true,
			message: e.message,
			result: null,
			error:true
		})
	}
}