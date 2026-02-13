import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from '@/models/Companie'
import Invoice from '@/models/Invoice'
import Order from '@/models/Order'

export async function POST(request:NextRequest){
  try{
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId:params.id
    })

    var order = await Order.findOne({
      salesOrderNumber:params.salesOrderNumber
    })


    var result = await Invoice.create({
      ...params,
      companyId:company._id,
      salesOrderId:order._id,
      date:new Date(),
      invoiceNumber:`I-${String(Date.now()).slice(-5)}`
    })

    var requested = result._doc

    const [agg] = await Invoice.aggregate([
      {
        $match:{
          _id:requested._id
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
        $lookup: {
          from: "customers",
          localField: "order.customerId",
          foreignField: "_id",
          as: "order.customer",
        },
      },
      { 
        $unwind: "$order.customer" 
      },
      {
        $lookup: {
          from: "products",
          localField: "order.productId",
          foreignField: "_id",
          as: "order.product",
        },
      },
      { 
        $unwind: "$order.product" 
      },
    ])


    return NextResponse.json({
      noResult:false,
      message:"",
      result:agg,
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

export async function GET(request:NextRequest){
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type");
  try {
    await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId:id
    })

    const invoices = await Invoice.aggregate([
      {
        $match:{
          companyId:cmp._id,
          invoiceType:type
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
        $lookup: {
          from: "customers",
          localField: "order.customerId",
          foreignField: "_id",
          as: "order.customer",
        },
      },
      { 
        $unwind: "$order.customer" 
      },
      {
        $lookup: {
          from: "products",
          localField: "order.productId",
          foreignField: "_id",
          as: "order.product",
        },
      },
      { 
        $unwind: "$order.product" 
      },
    ])

    return NextResponse.json({
      noResult:false,
      message:"",
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