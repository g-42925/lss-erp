import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import User from '@/models/User'
import Companie from '@/models/Companie'
import CryptoJS from "crypto-js";
import { noSSR } from "next/dynamic";


export async function POST(request:NextRequest) {
  try{
    await connectToDatabase()
    const params = await request.json()
    const r = await Companie.findOne({
      masterAccountId:params.secretId,
    })

    if(!r){
      return NextResponse.json({
        noResult:true,
        message:'invalid secret id',
        result:null
      });      
    }
    else{
      const q = await User.findOneAndUpdate(
        { email: params.email,masterAccountId:params.secretId },
        { $set: { password: CryptoJS.MD5(params.password).toString() } }, // perubahan
        { new: true }
      );

      if(!q){
        return NextResponse.json({
          noResult:true,
          message:'invalid email',
          result:null
        });    
      }
      else{
        return NextResponse.json({
          noResult:false,
          message:'',
          result:q
        });  
      }
    }
  }
  catch(e:any){
    return NextResponse.json(
      {
				noResult:true,
				message:e.message,
				result:null
			}
    )
  }
}
