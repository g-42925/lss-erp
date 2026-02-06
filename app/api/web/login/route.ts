import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Role from '@/models/Role'
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

    if(!r.isSuperAdmin){
      var role = await Role.findOne({
       _id:r.roleId
      })
      
      return NextResponse.json({
        noResult: false,
        message: "",
        result: {
          ...r,
          role:role
        }
      });  
    }
    else{
      return NextResponse.json({
        noResult: false,
        message: "",
        result: {
          ...r,
          role:{}
        }
      });
    }
  } 
	catch (e:any) {
    console.log(e)
    return NextResponse.json(
      {
				noResult:true,
				message:e.message,
				result:null
			}
    )
  }
}
