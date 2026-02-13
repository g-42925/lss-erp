import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

import Invoice from '@/models/Invoice'
import Companie from '@/models/Companie'

export async function  GET(request:NextRequest){
  try{
    await connectToDatabase()
    
    const url = new URL(request.url);
    const id = url.searchParams.get("id")
    const type = url.searchParams.get("type")
   
    const cmp = await Companie.findOne({
      masterAccountId:id
    })

    const invoices = await Invoice.aggregate([
      {
        $match:{
          companyId:cmp._id,
          invoiceType:type,
        }
      },
      {
        $lookup:{
          from:'orders',
          localField:'salesOrderId',
          foreignField:'_id',
          as:'order'
        }
      },
      {
        $unwind:'$order'
      },
      {
        $lookup:{
          from:'products',
          localField:'order.productId',
          foreignField:'_id',
          as:'order.product'
        }
      },
      {
        $unwind:'$order.product'
      },
      {
        $lookup:{
          from:'customers',
          localField:'order.customerId',
          foreignField:'_id',
          as:'order.customer'
        }
      },
      {
        $unwind:'$order.customer'
      },   
      {
        $addFields:{
          value:{
            $cond: {
              if: { $eq: ["$order.productType", "good"] },
              then: '$order.price',
              else:{
                $cond:{
                  if: { $eq: ["$order.frequency", "Week"] },
                  then:{
                    $subtract: [
                      { $multiply: [ { $multiply: ["$order.qty", "$order.price"] }, 4 ] },
                      { $multiply: ["$order.price", "$missing"] }
                    ]
                  },
                  else:{
                    $subtract: [
                      { $multiply: ["$order.qty", "$order.price"]  },
                      { $multiply: ["$order.price", "$missing"] }
                    ]                    
                  }
                }
              }
            }            
          }
        }
      },
      {
        $match: { $expr: { $lt: ["$payAmount", "$value"] } } // filter payAmount < value
      }
    ])

    return NextResponse.json({
      noResult:false,
      message:'success',
      result:invoices,
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