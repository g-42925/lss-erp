import Product from '@/models/Product'

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";

export async function GET(request:NextRequest){
  try{
    const url = new URL(request.url)
    const _id = url.searchParams.get("_id")
    const conn = await connectToDatabase()
    const result = await Product.findById(_id)
   
    return NextResponse.json({
      noResult:false,
			message:"",
			result:result,
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