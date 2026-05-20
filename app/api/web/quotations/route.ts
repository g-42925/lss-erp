import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import ProductQuotation from "@/models/ProductQuotation";
import ServiceQuotation from "@/models/ServiceQuotation";
import Companie from "@/models/Companie"

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const body = await request.json()
    const { _id, ...rest } = body

    const price = rest.productType === 'service' ? rest.price : body.cart.map((c: any) => c.subTotal).reduce((p: number, c: number) => p + c, 0)

    const Model: any = rest.productType === 'service' ? ServiceQuotation : ProductQuotation
    await Model.findByIdAndUpdate(_id, {
      ...rest,
      price: price,
    })

    const pipeline: any[] = [
      {
        $match: { _id: new ObjectId(_id) }
      }
    ]

    if (rest.productType === 'service') {
      pipeline.push(
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "p"
          }
        },
        {
          $addFields: {
            product: { $arrayElemAt: ["$p", 0] },
            variousItem: false
          }
        }
      )
    } else {
      pipeline.push(
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
            },
            variousItem: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                true,
                false
              ]
            }
          }
        }
      )
    }

    pipeline.push(
      {
        $project: { 'p': 0 }
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
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      }
    )

    const [q] = await Model.aggregate(pipeline)

    return NextResponse.json({
      noResult: false,
      message: "",
      result: q,
      error: false
    })
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()

    const params = await request.json()
    const company = await Companie.findOne({ masterAccountId: params.id })
    const price = params.productType === 'service' ? params.price : params.cart.map((c: any) => c.subTotal).reduce((p: number, c: number) => p + c, 0)

    const _cart = [
      {
        productId: params.productId,
        qty: params.qty,
        subTotal: params.price,
        tax: false
      }
    ]

    const cart = params.productType === 'service' ? _cart : params.cart

    let result;
    if (params.productType === 'service') {
      result = await ServiceQuotation.create({
        quotationNumber: `Q-${String(Date.now()).slice(-5)}`,
        date: new Date(),
        price: params.price,
        expiredAt: params.expiredDate ? new Date(params.expiredDate) : new Date(),
        customerId: params.customerId,
        companyId: company._id,
        productType: params.productType,
        range: params.range,
        frequency: params.frequency,
        contractType: params.contractType,
        productId: params.productId,
        qty: params.qty,
        taxes: params.cart?.[0]?.taxes || []
      })
    } else {
      result = await ProductQuotation.create({
        cart: params.cart,
        quotationNumber: `Q-${String(Date.now()).slice(-5)}`,
        createdAt: new Date(),
        price: price,
        expiredAt: params.expiredDate ? new Date(params.expiredDate) : new Date(),
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
    }

    return NextResponse.json({
      noResult: false,
      message: "",
      result: result,
      error: false
    })
  }
  catch (e: any) {
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
  const qNumber = url.searchParams.get("qNumber")

  try {
    await connectToDatabase();

    const query: any = { productType: type }

    if (qNumber) {
      query.quotationNumber = qNumber
    } else {
      const company = await Companie.findOne({ masterAccountId: id })
      query.companyId = company._id
    }

    const Model: any = type === 'service' ? ServiceQuotation : ProductQuotation
    const pipeline: any[] = [
      {
        $match: query
      }
    ]

    if (type === 'service') {
      pipeline.push(
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "p"
          }
        },
        {
          $addFields: {
            product: { $arrayElemAt: ["$p", 0] },
            variousItem: false
          }
        }
      )
    } else {
      pipeline.push(
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
            },
            variousItem: {
              $cond: [
                { $gt: [{ $size: "$cart" }, 1] },
                true,
                false
              ]
            }
          }
        }
      )
    }

    pipeline.push(
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
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      }
    )

    const res = await Model.aggregate(pipeline)
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