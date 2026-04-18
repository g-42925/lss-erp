import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Order from '@/models/Order'
import Companie from '@/models/Companie'
import Batches from '@/models/Batche'
import Deliverie from '@/models/Deliverie'
import Product from "@/models/Product";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    const params = await request.json()
    const company = await Companie.findOne({
      masterAccountId: params.id
    })

    const deliveryNumber = `D-${String(Date.now()).slice(-5)}`

    // Process each item in the delivery
    for (const item of params.items) {
      // 1. Update Batch outQty
      await Batches.updateOne(
        {
          batchNumber: item.batchNumber
        },
        {
          $inc: {
            outQty: item.qty
          }
        }
      )

      // 2. Update Product stockValue
      const batch = await Batches.findOne({ batchNumber: item.batchNumber })
      const product = await Product.findOne({ _id: batch.productId })

      const [_product] = await Product.aggregate([
        {
          $match: {
            _id: product._id
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

      if (product) {
        const current = Math.round(_product.stockValue / (_product.remain + _product.allocated))
        const modified = product.stockValue - (current * item.qty)

        await Product.findByIdAndUpdate(
          product._id,
          { stockValue: modified }
        )
      }
    }

    const delivered = await Deliverie.create({
      companyId: company._id,
      salesOrderNumber: params.salesOrderNumber,
      deliveryNumber: deliveryNumber,
      items: params.items,
      date: new Date()
    })

    // Return the created delivery with some joined info if possible
    // For now, let's keep it simple and return the document
    // We'll update the GET method to handle the complex aggregation for the list view

    return NextResponse.json({
      noResult: false,
      message: "",
      result: delivered,
      error: false
    })
  }
  catch (e: any) {
    console.error("Delivery POST Error:", e)
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}

// /delivery/get 

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    const url = new URL(request.url)
    const so = url.searchParams.get("so")
    const filter = url.searchParams.get("f")
    const id = url.searchParams.get("id")

    if (filter != 'all') {
      const order = await Order.findOne({
        salesOrderNumber: so
      }).populate('cart.productId')

      if (!order) return NextResponse.json({
        noResult: true,
        message: 'Order not found',
        result: null,
        error: false
      })

      // Get all previous deliveries for this order to calculate remaining quantities
      const existingDeliveries = await Deliverie.find({ salesOrderNumber: so })

      const results = await Promise.all(order.cart.map(async (item: any) => {
        const productId = item.productId._id || item.productId

        // Calculate how many have been delivered for this specific product
        let deliveredQty = 0
        existingDeliveries.forEach((d: any) => {
          d.items.forEach((di: any) => {
            if (di.productId.toString() === productId.toString()) {
              deliveredQty += di.qty
            }
          })
        })

        // Fetch available batches for this product
        const batches = await Batches.aggregate([
          {
            $match: {
              productId: productId
            }
          },
          {
            $lookup: {
              from: 'locations',
              localField: 'locationId',
              foreignField: '_id',
              as: 'location'
            }
          },
          {
            $unwind: '$location'
          },
          {
            $addFields: {
              remain: {
                $subtract: ["$accumulative", "$outQty"]
              }
            }
          },
          {
            $match: {
              remain: { $gt: 0 }
            }
          }
        ])

        return {
          product: item.productId,
          orderedQty: item.qty,
          deliveredQty: deliveredQty,
          limit: item.qty - deliveredQty,
          batches: batches
        }
      }))

      return NextResponse.json({
        noResult: false,
        message: "",
        result: results,
        error: false
      })
    }
    else {
      // Fetch all deliveries for the list view
      // We will unwind items to show each product in its own row, 
      // which is usually clearer for warehouse staff.
      const deliveries = await Deliverie.aggregate([
        {
          $unwind: '$items'
        },
        {
          $lookup: {
            from: 'locations',
            localField: 'items.locationId',
            foreignField: '_id',
            as: 'location'
          }
        },
        {
          $unwind: '$location'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'salesOrderNumber',
            foreignField: 'salesOrderNumber',
            as: 'order'
          }
        },
        {
          $unwind: '$order'
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'order.customerId',
            foreignField: '_id',
            as: 'customer'
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
            date: 1,
            deliveryNumber: 1,
            salesOrderNumber: 1,
            qty: '$items.qty',
            batchNumber: '$items.batchNumber',
            location: {
              name: '$location.name'
            },
            product: {
              productName: '$product.productName'
            },
            customer: {
              bussinessName: '$customer.bussinessName'
            }
          }
        },
        {
          $sort: { date: -1 }
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'salesOrderNumber',
            foreignField: 'salesOrderNumber',
            as: 'order'
          }
        },
        {
          $unwind: {
            path: '$order',
            preserveNullAndEmptyArrays: true
          }
        }
      ])

      return NextResponse.json({
        noResult: false,
        message: "",
        result: deliveries,
        error: false
      })
    }
  }
  catch (e: any) {
    console.error("Delivery GET Error:", e)
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true
    })
  }
}