import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import User from '@/models/User'
import Companie from '@/models/Companie'
import CryptoJS from "crypto-js";


export async function POST(request:NextRequest) {
  try{
    await connectToDatabase()
    const params = await request.json()
    const masterAccountId = params.secretId
    const pwd = params.password
    const _pwd = CryptoJS.MD5(pwd).toString()
    const r = await Companie.findOne({
      masterAccountId
    })

    if(!r){
		  return NextResponse.json({
        noResult: true,
        message: "invalid secret id",
        result: null
      });
      
    }
    else{
      var newUser = {
        email:params.email,
        password:_pwd,
        name:r.name,
        isSuperAdmin:true,
        roleName:"super admin",
        masterAccountId:masterAccountId
      }

      await User.create({
        email:params.email,
        password:_pwd,
        name:r.name,
        isSuperAdmin:true,
        roleName:"super admin",
        masterAccountId:masterAccountId
      })   

		  return NextResponse.json({
        noResult: false,
        message: "",
        result: newUser
      });
    }
  }
  catch(e:any){
		return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null
    });
  }
}

type Failed = {
  message:string
}