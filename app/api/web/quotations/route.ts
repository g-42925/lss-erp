import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Quotation  from "@/models/Quotation";
import Companie from "@/models/Companie"
import Product from "@/models/Product"

export async function PUT(request:NextRequest){
  try{
    await connectToDatabase()
    const body = await request.json()
    const {_id,...rest} = body

    const product = await Product.findById(rest.productId)

    var price = product.productType === 'service' ? rest.price : product.sellingPrice * rest.qty

    const result = await Quotation.findByIdAndUpdate(
      _id,{
        ...rest,
        price:price,
        taxType:product.applicableTax
      }
    )

    const [q] = await Quotation.aggregate(
      [
        {
          $match:{
            _id:new ObjectId(_id)
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
            from:'customers',
            localField:'customerId',
            foreignField:'_id',
            as:'customer'
          }
        },
        {
          $unwind:'$customer'
        }        
      ]
    )

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:q,
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
    const company = await Companie.findOne({
      masterAccountId:params.id
    })

    const product = await Product.findById(params.productId)

    var {id,...rest} =  params

    var price = rest.productType === 'service' ? params.price : product.sellingPrice * params.qty


    var q = {
      ...rest,
      companyId:company._id,
      createdAt:Date.now(),
      taxType:product.applicableTax,
      price:price,
      quotationNumber:`Q-${String(Date.now()).slice(-5)}`
    }

    var quotation = await Quotation.create(q)

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:quotation,
        error:false
      }
    )
  }
  catch(e:any){
    console.log(e.message)
    return NextResponse.json(
      {
        noResult:true,
        message:e.message,
        result:null,
        error:false
      }
    )
  }
}

export async function GET(request:NextRequest){
  const url = new URL(request.url)
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type")

  try{
    await connectToDatabase();

    const company = await Companie.findOne({
      masterAccountId:id
    })


    const res = await Quotation.aggregate(
      [
        {
          $match:{
            companyId:company._id,
            productType:type
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
            from:'customers',
            localField:'customerId',
            foreignField:'_id',
            as:'customer'
          }
        },
        {
          $unwind:'$customer'
        }
      ]
    )
    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:res,
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