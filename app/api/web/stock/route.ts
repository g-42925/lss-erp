import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

import Batche from '@/models/Batche'
import Companie from '@/models/Companie'
import Locations from '@/models/Location'

export async function GET(request:NextRequest){
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const cmd = url.searchParams.get("cmd");

  try{
    await connectToDatabase();
    const company = await Companie.findOne({
      masterAccountId:id
    })
    const r = await Locations.aggregate([
      {
        $match: {
          locationOf: company._id
        }
      },
      {
        $lookup:{
          from:'batches',
          localField:'_id',
          foreignField:'locationId',
          as:'batches',
          pipeline:[
            {
              $match:{
                $expr:{
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
        $unwind: "$batches" 
      },
      {
        $lookup:{
          from:'products',
          localField:"batches.productId",
          foreignField:"_id",
          as:"products"
        }
      },
      { 
        $unwind: "$products" 
      },
      {
        $group: {
          _id: {
            locationId: "$_id",
            productId: "$products._id"
          },
          locationName: { $first: "$name" },
          product: { $first: "$products" },
          batches: { $push: "$batches" },
          accumulative: { $sum: "$batches.accumulative" },
          out: { $sum : "$batches.outQty" }
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
        $project: {
          batches: 0,
          accumulative:0,
          out:0
        }
      }
    ])

    console.log(r)

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:r,
        error:false
      }
    )    
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

export async function POST(request:NextRequest){
  try{
    await connectToDatabase();

    const params = await request.json()

    const isExist = await Batche.find({
      productId:params.productId,
      locationId:params.locationId,
      isOpening:true
    })

    if(isExist.length > 0){
      return NextResponse.json(
        {
          noResult:true,
          message:"Product already exist",
          result:null,
          error:false
        }
      )
    }
    else{
    
      var newBatch = await Batche.create({
        ...params,
        batchNumber:`B-${String(Date.now()).slice(-5)}`
      })
      
      const [batch] = await Batche.aggregate([
        {
          $match:{
            batchNumber:params.batchNumber
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
          $addFields: {
            remain: params.accumulative
          }
        }
      ])

      var result = {
        ...newBatch._doc,
        product:batch.product,
        locationName:batch.location.name,
        remain:params.accumulative
      }

      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:result,
          error:false
        }
      )
    }

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