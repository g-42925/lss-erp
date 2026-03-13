import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest,NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import Product from '@/models/Product'
import Companie from '@/models/Companie'

export async function PUT(request:NextRequest){
  try{
    await connectToDatabase()
    const formData = await request.formData()

    const _id = formData.get("xId") as string;
    const image = formData.get("image") as string;
    const file = formData.get("file") as File;
    const productName = formData.get("productName") as string;
    const barcodeType = formData.get("barcodeType") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const purchaseUnit = formData.get("purchaseUnit") as string;
    const warehouseUnit = formData.get("warehouseUnit") as string;
    const saleUnit = formData.get("saleUnit") as string;
    const applicableTax = formData.get("applicableTax") as string;
    const sellingPriceTaxType = formData.get("sellingPriceTaxType") as string;
    const productType = formData.get("productType") as string;
    const sellingPrice = formData.get("sellingPrice") as string;
    const haveExpiredDate = formData.get("haveExpiredDate") as string;
    const discountType = formData.get("discountType") as string;
    const discountValue = formData.get("discountValue") as string;


    if(file){
      const fileName = (formData.get("fileName") as string) ?? file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
  
      const s3 = new S3Client({
        region: "us-east-1",
        endpoint: "https://s3.filebase.com",
        credentials: {
          accessKeyId: "B8F0135956143AE0685E",
          secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
        },
      });
  
      const putCommand = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });
  
      const result = await s3.send(putCommand);
      
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: fileName,
        })
      );
  
      const cid = head.Metadata?.cid;
  
      const productImage = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${cid}`;
  
      const newProduct = {
        productName,
        barcodeType,
        category,
        description,
        purchaseUnit,
        warehouseUnit,
        saleUnit,
        applicableTax,
        sellingPriceTaxType,
        productType,
        sellingPrice,
        image:productImage,
        haveExpiredDate,
        discountType,
        discountValue
      }
  
      const product = await Product.findByIdAndUpdate(
        _id,
        newProduct
      )
  
      return NextResponse.json({
        noResult: false,
        message: "",
        result: product
      });
    }
    else{
      const newProduct = {
        productName,
        barcodeType,
        category,
        description,
        purchaseUnit,
        warehouseUnit,
        saleUnit,
        applicableTax,
        sellingPriceTaxType,
        productType,
        sellingPrice,
        image,
        haveExpiredDate,
        discountType,
        discountValue
      }
  
      const product = await Product.findByIdAndUpdate(
        _id,
        newProduct
      )
  
      return NextResponse.json({
        noResult: false,
        message: "",
        result: product
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

export async function POST(request:NextRequest){
  try{
    await connectToDatabase()
    const formData = await request.formData()

    switch(formData.get('command')){
      case 'addProduct':
        const file = formData.get("file") as File;
        const productName = formData.get("productName") as string;
        const productId = formData.get("productId") as string;
        const barcodeType = formData.get("barcodeType") as string;
        const category = formData.get("category") as string;
        const description = formData.get("description") as string;
        const purchaseUnit = formData.get("purchaseUnit") as string;
        const warehouseUnit = formData.get("warehouseUnit") as string;
        const saleUnit = formData.get("saleUnit") as string;
        const applicableTax = formData.get("applicableTax") as string;
        const sellingPriceTaxType = formData.get("sellingPriceTaxType") as string;
        const productType = formData.get("productType") as string;
        const sellingPrice = formData.get("sellingPrice") as string;
        const haveExpiredDate = formData.get("haveExpiredDate") as string;
        const discountType = formData.get("discountType") as string;
        const discountValue = formData.get("discountValue") as string;


        if (!file) {
          return NextResponse.json({
            noResult: true,
            message: "product image is required",
            result: null
          });
        }

        const fileName = (formData.get("fileName") as string) ?? file.name;
        const buffer = Buffer.from(await file.arrayBuffer());

        const s3 = new S3Client({
          region: "us-east-1",
          endpoint: "https://s3.filebase.com",
          credentials: {
            accessKeyId: "B8F0135956143AE0685E",
            secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
          },
        });

        const putCommand = new PutObjectCommand({
          Bucket: "leryn-storage",
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
          Metadata: {
            cid: "true", // 👈 sama seperti PHP
          },
        });

        const result = await s3.send(putCommand);
        
        const head = await s3.send(
          new HeadObjectCommand({
            Bucket: "leryn-storage",
            Key: fileName,
          })
        );

        const cid = head.Metadata?.cid;

        const productImage = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${cid}`;

        const r = await Companie.findOne({
          masterAccountId:formData.get("id")
        })
        
        const newProduct = {
          productName,
          productId,
          barcodeType,
          category,
          description,
          purchaseUnit,
          warehouseUnit,
          saleUnit,
          applicableTax,
          sellingPriceTaxType,
          productType,
          sellingPrice,
          productOf:r._id,
          image:productImage,
          haveExpiredDate,
          discountType,
          discountValue
        }

        const product = await Product.create(newProduct)

        return NextResponse.json({
          noResult: false,
          message: "",
          result: product
        });
      break;
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

export async function GET(request:NextRequest){	
  const url = new URL(request.url);
  const xId = url.searchParams.get('xid')
  const id = url.searchParams.get("id")
  const type = url.searchParams.get("type")
  
  try {
    await connectToDatabase()

    if(!xId){
      const company = await Companie.findOne({
        masterAccountId:id
      })

      const byType = await Product.aggregate([
        {
          $match:{
            productOf:company._id,
            productType:type
          }
        },
        {
          $lookup:{
            from:"batches",
            localField:"_id",
            foreignField:"productId",
            as:"batches",
            pipeline:[
              {
                $match:{
                  $expr:{
                    $and: [
                      { $eq: ["$status", "ACTIVE"] }
                    ]
                  }
                }
              }
            ]
          }
        },
        { 
          $unwind: {
            path: "$batches",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: "$_id",
            doc: { $first: "$$ROOT" },
            accumulative: { $sum: "$batches.accumulative" },
            out: { $sum : "$batches.outQty" }
          }
        },
        {
          $addFields: {
            remain: {
              $subtract: ["$accumulative", "$out"]
            }
          }
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                "$doc",
                {
                  remain: "$remain",
                }
              ]
            }
          }
        },        
        {
          $project: {
            batches: 0,
          }
        },
        {
          $lookup:{
            from:"allocations",
            localField:"_id",
            foreignField:"productId",
            as:"allocations"
          }
        },
        {
          $addFields:{
            allocated:{
              $sum:{
                $map: {
                  input: "$allocations",
                  as: "a",
                  in: "$$a.qty"
                }
              }
            }
          }
        },
        {
          $project: {
            allocations: 0,
          }
        }
      ])

      
      const all = await Product.find({
        productOf:company._id,
      })
  
      const products = type === 'all' ? all : byType

      console.log(products)
  
      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:products,
          error:false
        }
      )
    }
    else{
      const product = await Product.findById(
        xId
      )

      return NextResponse.json(
        {
          noResult:false,
          message:"",
          result:product,
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