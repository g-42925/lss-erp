import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

import Purchase from '@/models/Purchase'
import Companie from '@/models/Companie'
import Debt from "@/models/Debt";


export async function GET(request:NextRequest){
  try{
    const url = new URL(request.url);
    const id = url.searchParams.get("id")
    const type = url.searchParams.get("type")
    const _ = await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId:id
    })
   
    const debts = await Purchase.aggregate([
      {
        $match:{
          companyId:cmp._id,
          purchaseType:type,
          $expr: { $gt: ["$finalPrice", "$payAmount"] }
        },
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
      }    
    ])

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:debts,
        error:false
      }
    )
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