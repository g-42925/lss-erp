import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

import Quotation from '@/models/Quotation'
import Order from '@/models/Order'
import Companie from '@/models/Companie'
import Invoice from '@/models/Invoice'


export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    let contractUploadUrl: string | null = null
    let attachmentUploadUrl: string | null = null
    const formData = await request.formData()
    const contractFile = formData.get("contract") as File
    const attachmentFile = formData.get("attachment") as File
    const payTerm = formData.get("payTerm") as string
    const qNumber = formData.get("qNumber") as string
    const id = formData.get("id") as string

    const company = await Companie.findOne({
      masterAccountId: id
    })

    const s3 = new S3Client({
      region: "us-east-1",
      endpoint: "https://s3.filebase.com",
      credentials: {
        accessKeyId: "B8F0135956143AE0685E",
        secretAccessKey: "gKrbIZJnzLWBXZ0VGQvnlAumvngpBH35PsXN5zUp",
      },
    });

    if (contractFile) {
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

      await s3.send(contractUploadCmd);

      const h1 = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: contractFileName,
        })
      );

      contractUploadUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${h1.Metadata?.cid}`
    }
    if (attachmentFile) {
      const attachmentFileName = attachmentFile.name;
      const attachmentFileBuffer = Buffer.from(await attachmentFile.arrayBuffer());

      const attachmentUploadCmd = new PutObjectCommand({
        Bucket: "leryn-storage",
        Key: attachmentFileName,
        Body: attachmentFileBuffer,
        ContentType: attachmentFile.type,
        Metadata: {
          cid: "true", // 👈 sama seperti PHP
        },
      });

      await s3.send(attachmentUploadCmd);

      const h2 = await s3.send(
        new HeadObjectCommand({
          Bucket: "leryn-storage",
          Key: attachmentFileName,
        })
      );

      attachmentUploadUrl = `https://wooden-plum-woodpecker.myfilebase.com/ipfs/${h2.Metadata?.cid}`
    }

    // ─── DIRECT SERVICE ORDER (no quotation) ─────────────────────────────
    const directOrder = formData.get("directOrder") as string
    if (directOrder === "true") {
      const productRaw = formData.get("productId") as string // "id/sellingPrice"
      const [productId, defaultPrice] = productRaw ? productRaw.split("/") : ["", "0"]
      const customerName = formData.get("customerName") as string
      const price = parseFloat(formData.get("price") as string) || parseFloat(defaultPrice) || 0
      const contractType = formData.get("contractType") as string
      const frequency = formData.get("frequency") as string
      const range = parseInt(formData.get("range") as string) || 0
      const so = `SO-${String(Date.now()).slice(-5)}`

      const order = await Order.create({
        salesOrderId: Date.now(),
        salesOrderNumber: so,
        saleDate: new Date(),
        companyId: company._id,
        customerName: customerName,
        productType: "service",
        contractType,
        frequency,
        range,
        payTerm: parseInt(payTerm) || 0,
        total: price,
        taxValue: 0,
        discountType: "none",
        discountValue: 0,
        contract: contractUploadUrl,
        attachment: attachmentUploadUrl,
        type: "direct",
        cart: [
          {
            productId: new ObjectId(productId),
            qty: 1,
            subTotal: price,
          }
        ]
      })

      const [_o] = await Order.aggregate([
        { $match: { _id: new ObjectId(order._id) } },
        {
          $lookup: {
            from: "products",
            localField: "cart.productId",
            foreignField: "_id",
            as: "productArr"
          }
        },
        {
          $addFields: {
            product: { $arrayElemAt: ["$productArr", 0] }
          }
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customerArr"
          }
        },
        {
          $addFields: {
            customer: { $arrayElemAt: ["$customerArr", 0] }
          }
        },
        {
          $project: { productArr: 0, customerArr: 0 }
        }
      ])

      return NextResponse.json({
        noResult: false,
        message: "",
        result: _o,
        error: false
      })
    }
    // ─────────────────────────────────────────────────────────────────────

    const quotation = await Quotation.findOne({
      quotationNumber: qNumber
    })


    if (!quotation) {
      return NextResponse.json(
        {
          noResult: true,
          message: "quotation not found",
          result: null,
          error: true
        }
      )
    }
    else {
      const { _id, __v, createdAt, expiredDate, ...rest } = quotation._doc

      const total = rest.cart.reduce((acc, item) => acc + item.subTotal, 0)

      const so = `SO-${String(Date.now()).slice(-5)}`


      const order = {
        ...rest,
        salesOrderId: Date.now(),
        saleDate: new Date(),
        contract: contractUploadUrl,
        attachment: attachmentUploadUrl,
        salesOrderNumber: so,
        type: 'withQuotation',
        payTerm,
        total: total,
        taxValue: rest.taxValue,
      }

      const _order = await Order.create(order)

      const [_o] = await Order.aggregate(
        [
          {
            $match: {
              _id: new ObjectId(
                _order._id
              )
            }
          },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "product"
            }
          },
          {
            $unwind: '$product'
          },
          {
            $lookup: {
              from: "customers",
              localField: "customerId",
              foreignField: "_id",
              as: "customer"
            }
          },
          {
            $unwind: '$customer'
          }
        ]
      )

      const paid = formData.get("debt") === 'yes' ? false : true


      if (rest.productType === "good") {
        await Invoice.create({
          companyId: company._id,
          invoiceNumber: `INV-${String(Date.now()).slice(-5)}`,
          invoiceType: 'product',
          salesOrderId: _order._id,
          salesOrderNumber: so,
          payAmount: formData.get("payAmt"),
          paid: paid,
          date: new Date()
        })
      }

      return NextResponse.json(
        {
          noResult: false,
          message: "",
          result: _o,
          error: false
        }
      )
    }
  }
  catch (e: any) {
    console.log(e)
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

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const type = url.searchParams.get("type")
    const company = await Companie.findOne({
      masterAccountId: id
    })
    const orders = await Order.aggregate(
      [
        {
          $match: {
            companyId: company._id,
            productType: type
          }
        },
        {
          $lookup: {
            from: "products",
            let: {
              productId: { $arrayElemAt: ["$cart.productId", 0] }
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$_id", "$$productId"]
                  }
                }
              }
            ],
            as: "p"
          }
        },
        {
          $addFields: {
            product: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                "various items",
                { $arrayElemAt: ["$p", 0] }
              ]
            }
          }
        },
        {
          $addFields: {
            variousItem: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                true,
                false
              ]
            }
          }
        },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer"
          }
        },
        {
          $unwind: {
            path: '$customer',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            'p': 0
          }
        }
      ]
    )
    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: orders,
        error: false
      }
    )
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