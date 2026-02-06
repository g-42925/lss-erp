import { NextRequest,NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"

import Companie from "@/models/Companie"
import Categorie from "@/models/Categorie"

export async function POST(request:NextRequest){
  const body = await request.json()
  try {
    await connectToDatabase()
    
    const company = await Companie.find({
      masterAccountId:body.id,
    })

    const category = await Categorie.create(
      {
        ...body,
        addedBy:company[0]._id,
      }
    )

    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:category,
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
    await Categorie.findByIdAndUpdate(
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
  console.log({id})
    try {
      await connectToDatabase()
      const company = await Companie.find({
        masterAccountId:id
      })

      const customer = await Categorie.find(
        {
          addedBy:company[0]._id
        }
      )
      
      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:customer,
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