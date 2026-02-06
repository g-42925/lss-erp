import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Batche from '@/models/Batche'
import Purchase from '@/models/Purchase'
import Companie from '@/models/Companie'
import { connect } from "http2";
import Supplier from "@/models/Supplier";

export async function PUT(request:NextRequest){
  try{
    await connectToDatabase()
    const body = await request.json()
    const {_id,...rest} = body

    // make approved status

    if(rest.status != 'ordered'){
      var status = rest.status === '_approved' ? 'ordered' : rest.status
      
      await Purchase.findByIdAndUpdate(
        _id,{
          ...rest,
          status
        }
      )

      if(rest.status === '_approved'){
        var spl = await Supplier.findById(rest.supplierId)
        var result =  {...body,spl}
        return NextResponse.json(
          {
            noResult:false,
            message:"",
            result:result,
            error:false
          }
        )
      }
      else{
        return NextResponse.json(
          {
            noResult:false,
            message:"",
            result:body,
            error:false
          }
        )
      }
    }

    if(rest.status === "ordered"){
      await Purchase.findByIdAndUpdate(
        _id,{
          status:'completed'
        }
      )

      var newBatch = await Batche.create({
        ...rest,
        status:'ACTIVE',
        batchNumber:`B-${String(Date.now()).slice(-5)}`
      })

      return NextResponse.json({
        noResult:false,
        message:"",
        result:{},
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

export async function POST(request:NextRequest){
  try{
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId:params.id
    })

    var result = await Purchase.create({
      ...params,
      companyId:company._id
    })

    var requested = result._doc

    var [agg] = await Purchase.aggregate(
      [
        {
          $match:{
            _id:requested._id
          }
        },
        {
          $lookup:{
            from:'products',
            localField:'productId',
            foreignField:'_id',
            as:'product'
          },

        },
        {
          $unwind:'$product'
        },
      ]
    )

    var r = {
      ...requested,
      product:agg.product
    }


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

export async function GET(request:NextRequest){	
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  try {
    await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId:id
    })
    
    const prs = await Purchase.aggregate(
      [
        {
          $match:{
            companyId:cmp._id,
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
          $project:{
            'productId':0,
            'companyId':0
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
      ]
    )

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:prs,
        error:false
      }
    )
  } 
  catch (e:any) {
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