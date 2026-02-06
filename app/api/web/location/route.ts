import mongoose from 'mongoose';

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Location from '@/models/Location'
import Companie from '@/models/Companie'

export async function PUT(req: Request) {
  const body = await req.json();
  const {_id,...rest} = body

  try{
    await connectToDatabase()
    await Location.findByIdAndUpdate(
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

export async function DELETE(request:NextRequest){	
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  try {
    await connectToDatabase()
    var result = await Location.findByIdAndDelete(id);
    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:id,
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

export async function GET(request:NextRequest){	
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    await connectToDatabase()
    const company = await Companie.findOne({
      masterAccountId:id
    })
    const location = await Location.find({
      locationOf:company._id
    })
    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:location,
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

export async function POST(request:NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId:params.id
    })
    const isExist = await Location.findOne({
      locationOf:company._id,
      code:params.code,
    })

    const result = {
      name:params.name,
      code:params.code,
      locationOf:company._id,
    }

    if(isExist){
      return NextResponse.json(
        {
          noResult:true,
          message:"Role is exist",
          result:null,
          error:false,
        }
      )
    }
    else{
      var newLocation = await Location.create({
        ...result,
      })
      
      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:newLocation,
          error:false
        }
      )
    }
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
