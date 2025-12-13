import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import User from '@/models/User'
import CryptoJS from "crypto-js";

export async function POST(request:NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const password = params.password
    console.log(password)
    const pwd = CryptoJS.MD5(password)
    console.log(pwd.toString())
    const r = await User.findOne({
      email:params.email,
      password:pwd.toString()
    })

    if(!r){
      return NextResponse.json({
        noResult: true,
        message: "no account found",
        result: null
      });
    }
		
		return NextResponse.json({
      noResult: false,
      message: "",
      result: r
    });

  } 
	catch (e:any) {
    return NextResponse.json(
      {
				noResult:true,
				message:e.message,
				result:null
			}
    )
  }
}
