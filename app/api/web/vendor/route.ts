import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

import Companie from "@/models/Companie"
import Vendor from "@/models/Vendor"

export async function POST(request:NextRequest){
  const body = await request.json()
  
  try {
    await connectToDatabase()
    
    const company = await Companie.find({
      masterAccountId:body.masterAccountId,
    })

    const vendor = await Vendor.create(
      {
        ...body,
        vendorOf:company[0]._id,
      }
    )

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:vendor,
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
    await Vendor.findByIdAndUpdate(
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

      const vendors = await Vendor.find(
        {
          vendorOf:company[0]._id
        }
      )
      
      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:vendors,
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