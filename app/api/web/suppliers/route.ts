import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

import Companie from "@/models/Companie"
import Suppliers from "@/models/Supplier"

export async function POST(request:NextRequest){
  const body = await request.json()
  try {
    await connectToDatabase()
    
    const company = await Companie.find({
      masterAccountId:body.masterAccountId,
    })

    const suppliers = await Suppliers.create(
      {
        ...body,
        supplierOf:company[0]._id,
        addedOn:new Date()
      }
    )

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:suppliers,
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

export async function PUT(request:NextRequest){
  const body = await request.json()
  const {_id,...rest} = body
  try {
    await connectToDatabase()
    await Suppliers.findByIdAndUpdate(
      _id,rest
    )
    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:body,
        error:false
      }
    );     
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
      const company = await Companie.find({
        masterAccountId:id
      })

      const suppliers = await Suppliers.find(
        {
          supplierOf:company[0]._id
        }
      )
      
      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:suppliers,
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