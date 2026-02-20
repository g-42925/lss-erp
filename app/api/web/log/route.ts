import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from '@/models/Companie'
import Purchase from '@/models/Purchase'

export async function GET(request:NextRequest){
  const url = new URL(request.url);
  const id = url.searchParams.get("id");  
  const type = url.searchParams.get("type");  

  
  try{
    await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId:id
    })

    const purchases = await Purchase.aggregate([
      {
        $match:{
          companyId:cmp._id,
          purchaseType:type
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
        $unwind:{
          path:'$product',
          preserveNullAndEmptyArrays:true
        }
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
        $unwind:{
          path:'$supplier',
          preserveNullAndEmptyArrays:true
        }
      },      
      {
        $lookup:{
          from:'vendors',
          localField:'vendorId',
          foreignField:'_id',
          as:'vendor'
        }
      },
      {
        $unwind:{
          path:'$vendor',
          preserveNullAndEmptyArrays:true
        }
      },
      {
        $lookup:{
          from:'logs',
          foreignField:'purchaseId',
          localField:'_id',
          as:'log'
        }
      },
      {
        $unwind:'$log'
      }
    ])

    return NextResponse.json({
      noResult:false,
      message:"",
      result:purchases,
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