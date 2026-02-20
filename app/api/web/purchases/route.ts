import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Batche from '@/models/Batche'
import Purchase from '@/models/Purchase'
import Companie from '@/models/Companie'
import Supplier from "@/models/Supplier";
import Vendor from "@/models/Vendor";
import Log from '@/models/Log'
import { Turret_Road } from "next/font/google";


export async function PUT(request:NextRequest){
  try{
    await connectToDatabase()
    const body = await request.json()
    const {_id,...rest} = body

    
    if(rest.status != 'ordered'){

      var status = rest.status === '_approved'  || rest.status === '__approved' || rest.status === '___approved' ? 'ordered' : rest.status

      var purchase = await Purchase.findById(_id)

      // memberikan approvel atau menolak (oleh module finance)

      if(status != 'ordered'){
        await Purchase.findByIdAndUpdate(
          _id,{
            ...rest,
            status
          }
        )
      }

      // merubah supplier (melalui module purchase)

      if(rest.status == '__approved'){

        var first = await Log.findOne({
          purchaseId:_id,
          initial:true
        })

        if(first){
          await Log.findByIdAndUpdate(
            first._id,{
              amount:rest.payAmount
            }
          )
        }

        if(rest.purchaseType === 'product'){
          var spl = await Supplier.findById(rest.supplierId)
          var result =  {...body,spl}
          await Purchase.findByIdAndUpdate(
            _id,{
              finalPrice:rest.finalPrice,
              payAmount:rest.payAmount,
              supplierId:rest.supplierId,
              quantity:rest.quantity
            }
          )

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
          var vnd = await Vendor.findById(rest.vendorId)
          var result =  {...body,vnd}
          await Purchase.findByIdAndUpdate(
            _id,{
              finalPrice:rest.finalPrice,
              payAmount:rest.payAmount,
              vendorId:rest.vendorId
            }
          )
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
      
      // merubah pay amount (melalui module finance)

      if(rest.status === '___approved'){
        if(rest.type === 'adjustment'){
          var ref = await Log.findOne({paymentNumber:rest.reference})
          if(rest.newPayAmt > ref.amount || ref.type === "adjustment"){
            return NextResponse.json({
              noResult:true,
              message:"correction amount is invalid",
              result:true,
              error:false
            })
          }
          else{
            await Purchase.findByIdAndUpdate(
              _id,{ 
                $inc:{ 
                  payAmount: -rest.newPayAmt
                } 
              },
            )
          }
        }

        var reference = rest.reference ?? null

        var amt = rest.type === "adjustment" ? rest.newPayAmt - (rest.newPayAmt * 2) : rest.newPayAmt

        if(rest.purchaseType === 'product'){
          
          await Log.create({
            purchaseId:_id,
            date:new Date(),
            amount:amt,
            initial:false,
            paymentNumber:`PL-${String(Date.now()).slice(-5)}`,
            type:rest.type,
            reference,
          })
          
          if(rest.type === "payment"){
            await Purchase.findByIdAndUpdate(
              _id,{
                payAmount:rest.payAmount,
                editable:false
              }
            )            
          }
          return NextResponse.json(
            {
              noResult:false,
              message:"",
              result:body,
              error:false
            }
          )          
        }
        else{
          await Log.create({
            purchaseId:_id,
            date:new Date(),
            amount:amt,
            initial:false,
            paymentNumber:`PL-${String(Date.now()).slice(-5)}`,
            type:rest.type,
            reference
          })

          if(rest.type === "payment"){
            await Purchase.findByIdAndUpdate(
              _id,{
                payAmount:rest.payAmount,
                editable:false
              }
            )
          }

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

      // melakukan order (melalui module purchase)

      if(rest.status === '_approved'){

        await Log.create({
          purchaseId:_id,
          date:new Date(),
          amount:rest.payAmount,
          initial:true,
          paymentNumber:`PL-${String(Date.now()).slice(-5)}`,
          type:'payment'
        })

        if(rest.purchaseType === 'product'){
          var spl = await Supplier.findById(rest.supplierId)

          await Purchase.findByIdAndUpdate(_id,{
            ...rest,
            status:'ordered'
          })
          
        
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
          var vnd = await Vendor.findById(rest.vendorId)


          await Purchase.findByIdAndUpdate(_id,{
            ...rest,
            status:'ordered'
          })
          
          var result =  {...body,vnd}
          
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
      companyId:company._id,
      editable:true,
      purchaseOrderNumber:`SO-${String(Date.now()).slice(-5)}`
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
    }

    if(params.purchaseType === 'product'){
      r.product = agg.product
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
  const type = url.searchParams.get("type");

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
          $project:{
            'productId':0,
            'companyId':0
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