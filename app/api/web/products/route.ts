/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import Product from '@/models/Product'
import Companie from '@/models/Companie'
import SalesCatalog from '@/models/SalesCatalog'
import "@/models/Tax"

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const formData = await request.formData()

    const _id = formData.get("xId") as string;
    const image = formData.get("image") as string;
    const file = formData.get("file") as File;
    const productName = formData.get("productName") as string;
    const barcodeType = formData.get("barcodeType") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const conversionRatioX = formData.get("conversionRatioX") as string;
    const conversionRatioY = formData.get("conversionRatioY") as string;
    const applicableTax = formData.get("applicableTax") as string;
    const sellingPriceTaxType = formData.get("sellingPriceTaxType") as string;
    const productType = formData.get("productType") as string;
    const sellingPrice = formData.get("sellingPrice") as string;
    const haveExpiredDate = formData.get("haveExpiredDate") as string;
    const discountType = formData.get("discountType") as string;
    const discountValue = formData.get("discountValue") as string;
    const conversionType = formData.get("conversionType") as string;
    const conversionValue = formData.get("conversionValue") as string;
    const packagingId = formData.get("packagingId") as string;
    const reorderPoint = formData.get("reorderPoint") as string;
    const safetyStock = formData.get("safetyStock") as string;


    if (file instanceof File && file.size > 0) {
      const buffer = await file.arrayBuffer()
      const r = await Companie.findOne({ masterAccountId: formData.get("id") })
      const originalFileName = formData.get('fileName') as string || file.name;
      const fileName = `${crypto.randomUUID()}-${originalFileName}`;
      const cdnUrl = `https://leryn-ljm-4.b-cdn.net/erp_${r.email.split('@')[0]}/product-images/${fileName}`;

      //const fileName = (formData.get("fileName") as string) ?? file.name;

      //const buffer = Buffer.from(await file.arrayBuffer());

      const s3 = new S3Client({
        forcePathStyle: true,
        region: process.env.S3_REGION!,
        endpoint: process.env.S3_ENDPOINT!,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
      });

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: `erp_${r.email.split("@")[0]}/product-images/${fileName}`,
          Body: Buffer.from(buffer),
          ContentType: file.type,
        })
      );

      const newProduct = {
        productName,
        barcodeType,
        category,
        description,
        conversionRatioX,
        conversionRatioY,
        applicableTax,
        sellingPriceTaxType,
        productType,
        sellingPrice,
        image: cdnUrl,
        haveExpiredDate,
        discountType,
        discountValue,
        conversionType,
        conversionValue,
        packagingId,
        reorderPoint: reorderPoint ? Number(reorderPoint) : 0,
        safetyStock: safetyStock ? Number(safetyStock) : 0,
        smallestUnitPrice: conversionValue && Number(conversionValue) > 0 ? Number(sellingPrice) / Number(conversionValue) : undefined
      }

      console.log("========================== new one =============================")

      const product = await Product.findByIdAndUpdate(
        _id,
        newProduct,
        { new: true }
      )

      console.log("========================== new one =============================")


      return NextResponse.json({
        noResult: false,
        message: "",
        result: product
      });
    }
    else {
      const newProduct = {
        productName,
        barcodeType,
        category,
        description,
        conversionRatioX,
        conversionRatioY,
        applicableTax,
        sellingPriceTaxType,
        productType,
        sellingPrice,
        image,
        haveExpiredDate,
        discountType,
        discountValue,
        conversionType,
        conversionValue,
        packagingId,
        reorderPoint: reorderPoint ? Number(reorderPoint) : 0,
        safetyStock: safetyStock ? Number(safetyStock) : 0,
        smallestUnitPrice: conversionValue && Number(conversionValue) > 0 ? Number(sellingPrice) / Number(conversionValue) : undefined
      }

      console.log("==========================  old one =============================")

      const product = await Product.findByIdAndUpdate(
        _id,
        newProduct
      )

      console.log("========================== old one =============================")


      return NextResponse.json({
        noResult: false,
        message: "",
        result: product
      });
    }

  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const formData = await request.formData()

    switch (formData.get('command')) {
      case 'addProduct':
        const file = formData.get("file") as File;
        const productName = formData.get("productName") as string;
        const productId = formData.get("productId") as string;
        const barcodeType = formData.get("barcodeType") as string;
        const category = formData.get("category") as string;
        const description = formData.get("description") as string;
        const conversionRatioX = formData.get("conversionRatioX") as string;
        const conversionRatioY = formData.get("conversionRatioY") as string;
        const applicableTax = formData.get("applicableTax") as string;
        const sellingPriceTaxType = formData.get("sellingPriceTaxType") as string;
        const productType = formData.get("productType") as string;
        const sellingPrice = formData.get("sellingPrice") as string;
        const haveExpiredDate = formData.get("haveExpiredDate") as string;
        const discountType = formData.get("discountType") as string;
        const discountValue = formData.get("discountValue") as string;
        const conversionType = formData.get("conversionType") as string;
        const conversionValue = formData.get("conversionValue") as string;
        const packagingId = formData.get("packagingId") as string;
        const reorderPoint = formData.get("reorderPoint") as string;
        const safetyStock = formData.get("safetyStock") as string;


        if (!file) {
          return NextResponse.json({
            noResult: true,
            message: "product image is required",
            result: null,
            error: true
          });
        }

        // === migration to bunny === //
        const buffer = await file.arrayBuffer()
        const r = await Companie.findOne({ masterAccountId: formData.get("id") })
        const fileName = (formData.get("fileName") as string) ?? file.name;
        const cdnUrl = `https://leryn-ljm-4.b-cdn.net/erp_${r.email.split('@')[0]}/product-images/${fileName}`;

        const s3 = new S3Client({
          forcePathStyle: true,
          region: process.env.S3_REGION!,
          endpoint: process.env.S3_ENDPOINT!,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY!,
            secretAccessKey: process.env.S3_SECRET_KEY!,
          },
        });

        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: `erp_${r.email.split("@")[0]}/product-images/${fileName}`,
            Body: Buffer.from(buffer),
            ContentType: file.type,
          })
        );

        const newProduct = {
          productName,
          productId,
          barcodeType,
          category,
          description,
          conversionRatioX,
          conversionRatioY,
          applicableTax,
          sellingPriceTaxType,
          productType,
          sellingPrice,
          productOf: r._id,
          image: cdnUrl,
          haveExpiredDate,
          discountType,
          discountValue,
          conversionType,
          conversionValue,
          packagingId,
          reorderPoint: reorderPoint ? Number(reorderPoint) : 0,
          safetyStock: safetyStock ? Number(safetyStock) : 0,
          smallestUnitPrice: conversionValue && Number(conversionValue) > 0 ? Number(sellingPrice) / Number(conversionValue) : undefined
        }

        await Product.create(newProduct)

        return NextResponse.json({
          noResult: false,
          message: "product added successfully",
          result: null
        });

      // ─── addVariant: create a Product variant linked to a SalesCatalog ───────
      case 'addVariant': {
        const catalogId = formData.get('catalogId') as string;
        const variantName = formData.get('variantName') as string;
        const variantSellingPrice = formData.get('sellingPrice') as string;
        const variantApplicableTax = formData.get('applicableTax') as string;
        const variantTaxType = formData.get('sellingPriceTaxType') as string;
        const variantDiscountType = formData.get('discountType') as string;
        const variantDiscountValue = formData.get('discountValue') as string;
        const variantReorderPoint = formData.get('reorderPoint') as string;
        const variantSafetyStock = formData.get('safetyStock') as string;

        if (!catalogId || !variantName) {
          return NextResponse.json({ noResult: true, message: 'catalogId and variantName are required', result: null, error: true });
        }

        const catalog = await SalesCatalog.findById(catalogId);
        if (!catalog) {
          return NextResponse.json({ noResult: true, message: 'Catalog not found', result: null, error: true });
        }

        const rCompany = await Companie.findOne({ masterAccountId: formData.get('id') });
        if (!rCompany) {
          return NextResponse.json({ noResult: true, message: 'Company not found', result: null, error: true });
        }

        const variantProductId = `VAR-${String(Date.now()).slice(-7)}`;

        const variantProduct = await Product.create({
          productName: `${catalog.name} - ${variantName}`,
          productId: variantProductId,
          category: catalog.category || '',
          subCategory: catalog.subCategory || '',
          description: catalog.description || catalog.name,
          image: catalog.image || '',
          brand: catalog.brand || '',
          conversionRatioX: catalog.unit || 'pcs',
          conversionRatioY: catalog.unit || 'pcs',
          applicableTax: variantApplicableTax || 'none',
          sellingPriceTaxType: variantTaxType || 'inclusive',
          productType: 'good',
          sellingPrice: Number(variantSellingPrice) || 0,
          productOf: rCompany._id,
          haveExpiredDate: false,
          discountType: variantDiscountType || 'none',
          discountValue: Number(variantDiscountValue) || 0,
          conversionType: 'value',
          conversionValue: 1,
          reorderPoint: Number(variantReorderPoint) || 0,
          safetyStock: Number(variantSafetyStock) || 0,
          catalogId: catalog._id,
          variantName,
        });

        return NextResponse.json({ noResult: false, message: 'Variant added', result: variantProduct, error: false });
      }
    }
  }
  catch (e: any) {
    console.log(e)
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null
    });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const xId = url.searchParams.get('xid')
  const id = url.searchParams.get("id")
  const type = url.searchParams.get("type")
  const catalogId = url.searchParams.get("catalogId")

  try {
    await connectToDatabase()

    if (!xId) {
      const company = await Companie.findOne({
        masterAccountId: id
      })

      // ─── Fetch variants for a specific catalog ─────────────────────────────
      if (catalogId) {
        const variants = await Product.aggregate([
          { $match: { productOf: company._id, catalogId: new (await import('mongoose')).default.Types.ObjectId(catalogId) } },
          {
            $lookup: {
              from: 'batches',
              localField: '_id',
              foreignField: 'productId',
              as: 'batches',
              pipeline: [{ $match: { status: 'ACTIVE' } }]
            }
          },
          { $unwind: { path: '$batches', preserveNullAndEmptyArrays: true } },
          { $group: { _id: '$_id', doc: { $first: '$$ROOT' }, accumulative: { $sum: '$batches.accumulative' }, out: { $sum: '$batches.outQty' } } },
          { $addFields: { remain: { $subtract: ['$accumulative', '$out'] } } },
          { $replaceRoot: { newRoot: { $mergeObjects: ['$doc', { remain: '$remain' }] } } },
          { $project: { batches: 0 } },
        ])
        return NextResponse.json({ noResult: false, message: '', result: variants, error: false })
      }
      // ───────────────────────────────────────────────────────────────────────

      const byType = await Product.aggregate([
        {
          $match: {
            productOf: company._id,
            productType: type
          }
        },
        {
          $lookup: {
            from: "batches",
            localField: "_id",
            foreignField: "productId",
            as: "batches",
            pipeline: [
              {
                $match: {
                  $expr: {
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
            out: { $sum: "$batches.outQty" }
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
          $lookup: {
            from: "allocations",
            localField: "_id",
            foreignField: "productId",
            as: "allocations"
          }
        },
        {
          $addFields: {
            allocated: {
              $sum: {
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
        productOf: company._id,
      })

      const products = type === 'all' ? all : byType

      console.log(products)

      return NextResponse.json(
        {
          noResult: false,
          message: "",
          result: products,
          error: false
        }
      )
    }
    else {
      const product = await Product.findById(
        xId
      )

      return NextResponse.json(
        {
          noResult: false,
          message: "",
          result: product,
          error: false
        }
      )
    }
  }
  catch (e: any) {
    return NextResponse.json(
      {
        noResult: true,
        message: e.message,
        result: null,
        error: true
      }
    )
  }
}