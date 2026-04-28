import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Companie from '@/models/Companie'
import Invoice from '@/models/Invoice'
import Order from '@/models/Order'

export async function POST(request: NextRequest) {

  function formatNumber(x: number) {
    return String(x).padStart(4, '0');
  }

  try {
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId: params.id
    })

    const orders = await Order.find({
      companyId: company._id,
    })

    const order = await Order.findOne({
      salesOrderNumber: params.salesOrderNumber
    })

    const now = new Date();
    const shortYear = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const invoiceNumber = `${company.invoiceCode}${shortYear}${month}${formatNumber(orders.length + 1)}`


    const result = await Invoice.create({
      ...params,
      companyId: company._id,
      salesOrderId: order._id,
      date: new Date(),
      invoiceNumber: invoiceNumber,
      paid: false,
      payAmount: 0,
    })

    const requested = result._doc

    const [agg] = await Invoice.aggregate([
      {
        $match: {
          _id: requested._id
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
          from: "customers",
          localField: "order.customerId",
          foreignField: "_id",
          as: "order.customer",
        },
      },
      {
        $unwind: "$order.customer"
      },
      {
        $lookup: {
          from: "products",
          localField: "order.productId",
          foreignField: "_id",
          as: "order.product",
        },
      },
      {
        $unwind: "$order.product"
      },
    ])


    return NextResponse.json({
      noResult: false,
      message: "",
      result: agg,
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
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type");
  try {
    await connectToDatabase()
    const cmp = await Companie.findOne({
      masterAccountId: id
    })

    const invoices = await Invoice.aggregate([
      {
        $match: {
          companyId: cmp._id,
          invoiceType: type
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
          from: "customers",
          localField: "order.customerId",
          foreignField: "_id",
          as: "order.customer",
        },
      },
      {
        $unwind: {
          path: "$order.customer",
          preserveNullAndEmptyArrays: true,
        }
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
        $project: {
          'p': 0
        }
      }
    ])

    return NextResponse.json({
      noResult: false,
      message: "",
      result: invoices,
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