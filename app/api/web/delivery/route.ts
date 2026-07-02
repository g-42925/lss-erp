import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import User from '@/models/User'
import Order from '@/models/Order'
import Companie from '@/models/Companie'
import Batches from '@/models/Batche'
import Deliverie from '@/models/Deliverie'
import Product from "@/models/Product";
import Reservation from "@/models/Reservation";
import OutboundLog from "@/models/OutboundLog";

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
      const batch = await Batches.findOne({ batchNumber: item.batchNumber })
      const product = await Product.findOne({ _id: batch.productId })

      const reservation = await Reservation.findOne({
        salesOrderNumber: params.salesOrderNumber,
        batchId: batch._id
      });

      // Tentukan apakah perlu deduct stock dan buat OutboundLog
      let shouldCreateOutboundLog = false;

      if (reservation && reservation.status === 'IMMEDIATE') {
        // Order pickup hari ini: stock sudah dipotong & OutboundLog sudah dibuat saat order dibuat.
        // Hanya tandai reservation sebagai FULFILLED — JANGAN buat OutboundLog lagi.
        await Reservation.findByIdAndUpdate(reservation._id, { status: 'FULFILLED' })
      }
      else if (reservation && reservation.status === 'ACTIVE') {
        // Order reserved (pickup masa depan): baru sekarang dipotong stock-nya.
        await Batches.updateOne(
          { _id: batch._id },
          {
            $inc: {
              reserved: -parseFloat(item.qty),
              outQty: parseFloat(item.qty)
            }
          }
        )
        // Mark reservation as FULFILLED
        await Reservation.findByIdAndUpdate(reservation._id, { status: 'FULFILLED' })
        shouldCreateOutboundLog = true; // OutboundLog belum ada, buat sekarang
      } else {
        // Legacy / tidak ada reservation: tambah outQty seperti biasa
        await Batches.updateOne(
          { _id: batch._id },
          {
            $inc: {
              outQty: parseFloat(item.qty)
            }
          }
        )
        shouldCreateOutboundLog = true; // OutboundLog belum ada, buat sekarang
      }

      // 2. Update Product stockValue

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

      // Buat OutboundLog hanya jika belum ada dari proses order creation
      if (shouldCreateOutboundLog) {
        await OutboundLog.create({
          warehouseId: batch.warehouseId || item.locationId,
          productId: product._id,
          quantity: parseFloat(item.qty),
          referenceNumber: deliveryNumber,
          date: new Date()
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adjustment = (params.adjustment || []).map((item: any) => {
      return {
        deliveryNumber: deliveryNumber,
        ...item
      }
    })


    if (adjustment.length > 0) {
      await Order.findOneAndUpdate(
        {
          salesOrderNumber: params.salesOrderNumber
        },
        {
          $push: { adjustment: { $each: adjustment } }
        }
      )
    }


    const delivered = await Deliverie.create({
      companyId: company._id,
      salesOrderNumber: params.salesOrderNumber,
      deliveryNumber: deliveryNumber,
      items: params.items,
      date: new Date(),
      createdBy: params.createdBy
    })


    return NextResponse.json({
      noResult: false,
      message: "",
      result: delivered,
      error: false
    })
  }
  catch (e: unknown) {
    console.error("Delivery POST Error:", e)
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
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
    const fromParam = url.searchParams.get("from")
    const toParam = url.searchParams.get("to")

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

      // Get all reservations for this order
      const reservations = await Reservation.find({ salesOrderNumber: so });
      const reservedBatchIds = reservations.map(r => r.batchId);
      const reservedBatches = await Batches.find({ _id: { $in: reservedBatchIds } });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await Promise.all(order.cart.map(async (item: any) => {
        const productId = item.productId._id || item.productId

        // Calculate how many have been delivered for this specific product
        let deliveredQty = 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingDeliveries.forEach((d: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          d.items.forEach((di: any) => {
            if (di.productId.toString() === productId.toString()) {
              deliveredQty += di.qty
            }
          })
        })

        // Check if there are reservations for this product
        const productReservedBatches = reservedBatches.filter(b => b.productId.toString() === productId.toString());
        const productReservedBatchIds = productReservedBatches.map(b => b._id);
        const isReservedForProduct = productReservedBatchIds.length > 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batchMatchQuery: any = { productId: productId };
        if (isReservedForProduct) {
          batchMatchQuery._id = { $in: productReservedBatchIds };
        }

        // Fetch available batches for this product
        const batches = await Batches.aggregate([
          {
            $match: batchMatchQuery
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
          },

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

      // Build optional date match stage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateMatch: any = {}
      if (fromParam) {
        const fromDate = new Date(fromParam)
        fromDate.setHours(0, 0, 0, 0)
        dateMatch.$gte = fromDate
      }
      if (toParam) {
        const toDate = new Date(toParam)
        toDate.setHours(23, 59, 59, 999)
        dateMatch.$lte = toDate
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pipeline: any[] = []
      if (Object.keys(dateMatch).length > 0) {
        pipeline.push({ $match: { date: dateMatch } })
      }

      const deliveries = await Deliverie.aggregate([...pipeline,
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
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $unwind: {
          path: '$creator',
          preserveNullAndEmptyArrays: true
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
  catch (e: unknown) {
    console.error("Delivery GET Error:", e)
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const { _id, productId, batchNumber, newQty, adjustment, approvalCode } = await request.json()

    const user = await User.findOne({ approvalCode: approvalCode })

    if (!user) {
      return NextResponse.json({
        noResult: true,
        message: "Invalid approval code",
        result: null,
        error: true
      })
    }

    if (!_id || !productId || !batchNumber || newQty === undefined) {
      return NextResponse.json({
        error: true,
        message: 'Invalid payload'
      })
    }

    const delivery = await Deliverie.findById(_id)

    if (!delivery) throw new Error("Delivery not found")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemObj = delivery.items.find((i: any) => i.productId.toString() === productId && i.batchNumber === batchNumber)

    if (!itemObj) throw new Error("Delivery item not found")

    const diff = newQty - itemObj.qty

    if (diff !== 0) {
      const batch = await Batches.findOne({ batchNumber: batchNumber, productId: productId })
      const product = await Product.findOne({ _id: productId })

      if (batch) {
        await Batches.updateOne(
          { _id: batch._id },
          { $inc: { outQty: diff } }
        )
      }

      if (product) {
        const [_product] = await Product.aggregate([
          { $match: { _id: product._id } },
          {
            $lookup: {
              from: "batches",
              localField: "_id",
              foreignField: "productId",
              as: "batches",
              pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$status", "ACTIVE"] }] } } }]
            }
          },
          { $unwind: { path: "$batches", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$_id",
              doc: { $first: "$$ROOT" },
              accumulative: { $sum: "$batches.accumulative" },
              out: { $sum: "$batches.outQty" }
            }
          },
          { $addFields: { remain: { $subtract: ["$accumulative", "$out"] } } },
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
              allocated: { $sum: { $map: { input: "$allocations", as: "a", in: "$$a.qty" } } }
            }
          }
        ])

        const currentCost = Math.round((_product?.doc?.stockValue || 0) / (Math.max(1, (_product?.remain || 0) + (_product?.allocated || 0))))
        const modifiedStockValue = Math.max(0, (product.stockValue || 0) - (currentCost * diff))

        await Product.findByIdAndUpdate(product._id, { stockValue: modifiedStockValue })

        await OutboundLog.create({
          warehouseId: batch?.warehouseId || itemObj.locationId,
          productId: product._id,
          quantity: diff,
          referenceNumber: delivery.deliveryNumber,
          date: new Date()
        });
      }

      itemObj.qty = newQty
      await delivery.save()
    }

    if (adjustment !== undefined) {
      const order = await Order.findOne({ salesOrderNumber: delivery.salesOrderNumber })
      if (order) {
        let foundAdj = false
        for (const adj of order.adjustment) {
          if (adj.productId.toString() === productId && adj.deliveryNumber === delivery.deliveryNumber) {
            adj.qty = adjustment
            foundAdj = true
            break
          }
        }
        if (!foundAdj) {
          order.adjustment.push({
            deliveryNumber: delivery.deliveryNumber,
            productId: productId,
            qty: adjustment
          })
        }
        await order.save()
      }
    }

    return NextResponse.json({
      noResult: false,
      message: "Delivery updated successfully",
      result: delivery,
      error: false
    })

  }
  catch (e: unknown) {
    console.error("Delivery PUT Error:", e)
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    })
  }
}