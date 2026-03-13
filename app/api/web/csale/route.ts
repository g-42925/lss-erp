import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Location from '@/models/Location'
import Batche from "@/models/Batche";
import Order from "@/models/Order"
import Companie from '@/models/Companie'
import Product from '@/models/Product'
import mongoose from "mongoose";

export async function GET(request:NextRequest){
	try{
		await connectToDatabase()
		const url = new URL(request.url)
		const prod = url.searchParams.get("prod")
		const pr = await Product.findById(prod)
		
		var result = await Location.aggregate([
			{
				$match:{
					locationOf:pr.productOf
				}
			},
			{
				$lookup:{
					as:"allocations",
					from:"allocations",
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
			noResult:false,
			message:"success",
			result:result,
			error:false
		})

	}
	catch(e:any){
		return NextResponse.json({
			noResult:true,
			message:e.message,
			result:null,
			error:true
		})
	}
}

export async function POST(request:NextRequest){
  try{
		await connectToDatabase()
		const params = await request.json()
		const company = await Companie.findOne({
			masterAccountId:params.id
		})

		var product = await Product.findById(params.productId)


		var result = await Order.create({
			companyId:company._id,
			salesOrderNumber:`SO-${String(Date.now()).slice(-5)}`,
			productId:params.productId,
			customerName:params.customerName,
			qty:params.qty,
			price:parseInt(params.qty) * product.sellingPrice,
			taxType:product.applicableTax,
			saleDate:new Date(),
			productType:'good',
			type:'direct'
		})

		return NextResponse.json({
			noResult:false,
			message:"success",
			result:result,
			error:false
		})
  }
  catch(e:any){
    return NextResponse.json({
			noResult:true,
			message:e.message,
			result:null,
			error:true
    })
  }
}