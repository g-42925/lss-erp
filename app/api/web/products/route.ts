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
    const unit = formData.get("unit") as string;
    const altUnit = formData.get("altUnit") as string;
    const applicableTax = formData.get("applicableTax") as string;
    const sellingPriceTaxType = formData.get("sellingPriceTaxType") as string;
    const productType = formData.get("productType") as string;
    const sellingPrice = formData.get("sellingPrice") as string;

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
        unit,
        altUnit,
        applicableTax,
        sellingPriceTaxType,
        productType,
        sellingPrice,
        image:productImage
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
        unit,
        altUnit,
        applicableTax,
        sellingPriceTaxType,
        productType,
        sellingPrice,
        image
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
        const unit = formData.get("unit") as string;
        const altUnit = formData.get("altUnit") as string;
        const applicableTax = formData.get("applicableTax") as string;
        const sellingPriceTaxType = formData.get("sellingPriceTaxType") as string;
        const productType = formData.get("productType") as string;
        const sellingPrice = formData.get("sellingPrice") as string;

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
          unit,
          altUnit,
          applicableTax,
          sellingPriceTaxType,
          productType,
          sellingPrice,
          productOf:r._id,
          image:productImage
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
      
      const byType = await Product.find({
        productOf:company._id,
        productType:type
      })
      
      const all = await Product.find({
        productOf:company._id,
      })
  
      const products = type === 'all' ? all : byType
  
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