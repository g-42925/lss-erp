import Batche from "@/models/Batche";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest){
  try{
		const url = new URL(request.url)
		const so = url.searchParams.get("so")

		const batches = await Batche.aggregate([
			{
				$match:{
					purchaseOrderNumber:so
				}
			},
			{
				$lookup:{
					from:'products',
					localField:'productId',
					foreignField:'_id',
					as:'product'
				}
			},
			{
				$unwind:'$product'
			},
			{
				$lookup:{
					from:'locations',
					localField:'locationId',
					foreignField:'_id',
					as:'location'
				}
			},
			{
				$unwind:'$location'
			},
			{
				$lookup:{
					from:'suppliers',
					localField:'supplierId',
					foreignField:'_id',
					as:'supplier'
				}
			},
			{
				$unwind:'$supplier'
			}
		])

		return NextResponse.json({
			noResult:false,
			message:"",
			result:batches,
			error:false
		})
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