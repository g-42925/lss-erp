import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Invoice from '@/models/Invoice'
import Companie from '@/models/Companie'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const url = new URL(request.url);
    const id = url.searchParams.get("id")
    const type = url.searchParams.get("type")

    const cmp = await Companie.findOne({
      masterAccountId: id
    })

    const invoices = await Invoice.aggregate([
      {
        $match: {
          companyId: cmp._id,
          invoiceType: type,
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'salesOrderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      {
        $unwind: '$order'
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: { $arrayElemAt: ["$order.cart.productId", 0] }
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
              { $gt: [{ $size: "$order.cart" }, 1] },
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
              { $gt: [{ $size: "$order.cart" }, 1] },
              true,
              false
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'order.customerId',
          foreignField: '_id',
          as: 'order.customer'
        }
      },
      {
        $unwind: {
          path: '$order.customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          value: {
            $cond: {
              if: { $eq: ["$order.productType", "good"] },
              then: '$order.total',
              else: {
                $cond: {
                  if: { $eq: ["$order.frequency", "Week"] },
                  then: {
                    $subtract: [
                      {
                        $multiply: [
                          {
                            $getField: {
                              field: "qty",
                              input: { $arrayElemAt: ["$order.cart", 0] }
                            }
                          },
                          {
                            $getField: {
                              field: "subTotal",
                              input: { $arrayElemAt: ["$order.cart", 0] }
                            }
                          },
                          4
                        ]
                      },
                      {
                        $multiply: [
                          {
                            $getField: {
                              field: "subTotal",
                              input: { $arrayElemAt: ["$order.cart", 0] }
                            }
                          },
                          "$missing"
                        ]
                      }
                    ]
                  },
                  else: {
                    $subtract: [
                      {
                        $multiply: [
                          {
                            $getField: {
                              field: "qty",
                              input: { $arrayElemAt: ["$order.cart", 0] }
                            }
                          },
                          {
                            $getField: {
                              field: "subTotal",
                              input: { $arrayElemAt: ["$order.cart", 0] }
                            }
                          }
                        ]
                      },
                      {
                        $multiply: [
                          {
                            $getField: {
                              field: "subTotal",
                              input: { $arrayElemAt: ["$order.cart", 0] }
                            }
                          },
                          "$missing"
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: { $expr: { $lt: ["$payAmount", "$value"] } } // filter payAmount < value
      },
      {
        $project: {
          'p': 0
        }
      }
    ])

    return NextResponse.json({
      noResult: false,
      message: 'success',
      result: invoices,
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

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()

    const body = await request.json()
    const { id, payAmount, date, method, action, historyDate, historyAmount } = body

    if (action === 'revert') {
      if (!id || !historyDate || typeof historyAmount !== 'number') {
        return NextResponse.json({
          noResult: true,
          message: 'Invalid data for revert',
          error: true
        })
      }

      await Invoice.findOneAndUpdate(
        { _id: id, "paymentHistory.date": new Date(historyDate) },
        {
          $set: { "paymentHistory.$.reverted": true },
          $inc: { payAmount: -historyAmount }
        },
        { strict: false }
      )

      return NextResponse.json({
        noResult: false,
        message: 'Payment reverted successfully',
        error: false
      })
    }

    if (!id || typeof payAmount !== 'number' || !method) {
      return NextResponse.json({
        noResult: true,
        message: 'Invalid data',
        error: true
      })
    }

    await Invoice.findByIdAndUpdate(id, {
      $inc: { payAmount: payAmount },
      $push: { paymentHistory: { amount: payAmount, method: method, date: date, reverted: false } }
    }, { strict: false })

    return NextResponse.json({
      noResult: false,
      message: 'success',
      error: false
    })
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      error: true
    })
  }
}