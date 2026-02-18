import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

import Order from '@/models/Order'
import Companie from '@/models/Companie'
import Batches from '@/models/Batche'
import Deliverie from '@/models/Deliverie'

export async function POST(request:NextRequest){
  try{
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId:params.id
    })

    await Batches.updateOne(
      {
        batchNumber:params.batchNumber
      },
      {
        $inc: { 
          outQty: params.qty 
        } 
      }
    )

    const deliveryNumber = `D-${String(Date.now()).slice(-5)}`

    const delivered = await Deliverie.create({
      ...params,
      companyId:company._id,
      deliveryNumber:deliveryNumber
    })

    const [_d] = await Deliverie.aggregate([
      {
        $match:{
          deliveryNumber:deliveryNumber
        }
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
          from:'orders',
          localField:'salesOrderNumber',
          foreignField:'salesOrderNumber',
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
      }
    ])

    return NextResponse.json({
      noResult:false,
      message:"",
      result:_d,
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

// /delivery/get 

export async function GET(request:NextRequest){
  try{
    await connectToDatabase()
    const url = new URL(request.url)
    const so = url.searchParams.get("so")
    const filter = url.searchParams.get("f")
    const id = url.searchParams.get("id")

    if(filter != 'all'){
      const order = await Order.findOne({
        salesOrderNumber:so
      })
  
      const emptyResult = {
        batches:[],
        limit:-1
      }
      
      if(!order) return NextResponse.json({
        noResult:false,
        message:'',
        result:emptyResult,
        error:false
      })
  
      const deliveries = await Deliverie.aggregate([
        {
          $match:{
            salesOrderNumber:so,
          }
        }
      ])
  
      const batches = await Batches.aggregate([
        {
          $match:{
            productId:order.productId
          }
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
            remain: {
              $subtract: ["$accumulative", "$outQty"]
            }
          }
        }
      ])
  
      if(deliveries.length > 0){
        const deliveredQty = deliveries.reduce((prev,cur) => {
          return prev + cur.qty
        },0)
  
        const result = {
          batches:batches,
          limit:order.qty - deliveredQty,
        }
  
        return NextResponse.json({
          noResult:false,
          message:"",
          result:result,
          error:false
        })
      }
      else{      
        const result = {
          batches:batches,
          limit:order.qty,
        }
  
        return NextResponse.json({
          noResult:false,
          message:"",
          result:result,
          error:false
        })
      }  
    }
    else{
      const cmp = await Companie.findOne({
        masterAccountId:id
      })

      const deliveries = await Deliverie.aggregate([
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
            from:'orders',
            localField:'salesOrderNumber',
            foreignField:'salesOrderNumber',
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
        }
      ]) 
      
      return NextResponse.json({
        noResult:false,
        message:"",
        result:deliveries,
        error:false
      })
    }
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