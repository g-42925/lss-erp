import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

import mongoose from 'mongoose';


import User from "@/models/User";
import CryptoJS from "crypto-js";

export async function DELETE(request:NextRequest){	
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  try {
    await connectToDatabase()
    var result = await User.findByIdAndDelete(id);
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
    const users = await User.find({
      masterAccountId:id,
      isSuperAdmin:false
    })
    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:users,
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

export async function PUT(req: Request) {
  const body = await req.json();
  const {_id,...rest} = body

  try{
    await connectToDatabase()
    await User.findByIdAndUpdate(
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


export async function POST(request:NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const pwd = params.password
    const _pwd = CryptoJS.MD5(pwd).toString()
    
    const result = await User.create({
      ...params,
      password:_pwd,
    })

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:result,
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
