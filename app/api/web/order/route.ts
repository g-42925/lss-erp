import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import Quotation from '@/models/Quotation'
import Order from '@/models/Order'
import Companie from '@/models/Companie'


export async function POST(request:NextRequest){
  try{
    await connectToDatabase()
    var contractUploadUrl:string|null = null
    var attachmentUploadUrl:string|null = null
    const formData = await request.formData()
    const contractFile = formData.get("contract") as File
    const attachmentFile = formData.get("attachment") as File
    const payTerm = formData.get("payTerm") as String
    const qNumber = formData.get("qNumber") as String

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint: "https://s3.filebase.com",
      credentials: {
        accessKeyId: "B8F0135956143AE0685E",
        secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
      },
    });

    if(contractFile){
      const contractFileName = contractFile.name;
      const contractFileBuffer = Buffer.from(await contractFile.arrayBuffer());

      const contractUploadCmd = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: contractFileName,
        Body: contractFileBuffer,
        ContentType: contractFile.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });

      const r1 = await s3.send(contractUploadCmd);
              
      const h1 = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: contractFileName,
        })
      );

      contractUploadUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${h1.Metadata?.cid}`
    }
    if(attachmentFile){
      const attachmentFileName = contractFile.name;
      const attachmentFileBuffer = Buffer.from(await contractFile.arrayBuffer());

      const attachmentUploadCmd = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: attachmentFileName,
        Body: attachmentFileBuffer,
        ContentType: contractFile.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });

      const r2 = await s3.send(attachmentUploadCmd);
              
      const h2= await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: attachmentFileName,
        })
      );
      
      attachmentUploadUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${h2.Metadata?.cid}`
    }

    const quotation = await Quotation.findOne({
      quotationNumber:qNumber
    })

    if(!quotation){
      return NextResponse.json(
        {
          noResult:true,
          message:"quotation not found",
          result:null,
          error:true
        }
      )
    }
    else{
      var {_id,__v,createdAt,expiredDate,...rest} = quotation._doc
      
      var order = {
        ...rest,
        salesOrderId:Date.now(),
        saleDate:new Date(),
        contract:contractUploadUrl,
        attachment:attachmentUploadUrl,
        salesOrderNumber:`SO-${String(Date.now()).slice(-5)}`,
        payTerm
      }

      var _order = await Order.create(order)

      const [_o] = await Order.aggregate(
        [
          {
            $match:{
              _id:new ObjectId(
                _order._id
              )
            }
          },
          {
            $lookup:{
              from:"products",
              localField:"productId",
              foreignField:"_id",
              as:"product"
            }
          },
          {
            $unwind:'$product'
          },
          {
            $lookup:{
              from:"customers",
              localField:"customerId",
              foreignField:"_id",
              as:"customer"
            }
          },
          {
            $unwind:'$customer'
          }
        ]
      )


      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:_o,
          error:false
        }
      )
    }



    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:{},
        error:false
      }
    )
  }
  catch(e:any){
    console.log('ok')
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
  try{
    await connectToDatabase()
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const type = url.searchParams.get("type")
    const company = await Companie.findOne({
      masterAccountId:id
    })
    const orders = await Order.aggregate(
      [
        {
          $match:{
            companyId:company._id,
            productType:type
          }
        },
        {
          $lookup:{
            from:"products",
            localField:"productId",
            foreignField:"_id",
            as:"product"
          }
        },
        {
          $unwind:'$product'
        },
        {
          $lookup:{
            from:"customers",
            localField:"customerId",
            foreignField:"_id",
            as:"customer"
          }
        },
        {
          $unwind:'$customer'
        }
      ]
    )
    return NextResponse.json(
      {
        noResult:false,
        message:"",
        result:orders,
        error:false
      }
    )
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