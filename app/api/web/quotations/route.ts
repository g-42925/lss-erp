import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Quotation from "@/models/Quotation";
import Companie from "@/models/Companie"
import Product from "@/models/Product"

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { _id, ...rest } = body

    const product = await Product.findById(rest.productId)
    const price = body.cart.map((c) => c.subTotal).reduce((p, c) => p + c)

    //const price = product.productType === 'service' ? rest.price : product.sellingPrice * rest.qty

    const result = await Quotation.findByIdAndUpdate(
      _id, {
      ...rest,
      price: price,
    })

    const [q] = await Quotation.aggregate(
      [
        {
          $match: {
            _id: new ObjectId(_id)
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: '$customer'
        }
      ]
    )

    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: q,
        error: false
      }
    )
  }
  catch (e: unknown) {
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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()

    const params = await request.json()
    const company = await Companie.findOne({ masterAccountId: params.id })
    const price = params.productType === 'service' ? params.price : params.cart.map((c) => c.subTotal).reduce((p, c) => p + c)

    const _cart = [
      {
        productId: params.productId,
        qty: params.qty,
        subTotal: params.price,
        tax: false
      }
    ]

    const cart = params.productType === 'service' ? _cart : params.cart

    const result = await Quotation.create({
      cart: cart,
      quotationNumber: `Q-${String(Date.now()).slice(-5)}`,
      createdAt: new Date(),
      price: price,
      expiredAt: new Date(),
      discountType: params.discountType,
      discountValue: params.discountValue,
      customerId: params.customerId,
      companyId: company._id,
      taxValue: params.taxValue,
      productType: params.productType,
      range: params.range,
      frequency: params.frequency,
      contractType: params.contractType,
    })

    return NextResponse.json({
      noResult: false,
      message: "",
      result: result,
      error: false
    })
  }
  catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type")

  try {
    await connectToDatabase();

    const company = await Companie.findOne({
      masterAccountId: id
    })

    const res = await Quotation.aggregate(
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
            let: { productId: { $arrayElemAt: ["$cart.productId", 0] } },
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
          $project: {
            'p': 0
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: '$customer'
        }
      ]
    )
    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: res,
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