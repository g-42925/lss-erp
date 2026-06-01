import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

import Batche from '@/models/Batche'

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  try {
    await connectToDatabase();
    const locId = url.searchParams.get("locationId");
    const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse');

    const r = await Warehouse.aggregate([
      {
        $match: locId ? { locationId: new mongoose.Types.ObjectId(locId) } : {}
      },
      {
        $lookup: {
          from: 'batches',
          localField: '_id',
          foreignField: 'warehouseId',
          as: 'batches',
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
        $unwind: "$batches"
      },
      {
        $lookup: {
          from: 'products',
          localField: "batches.productId",
          foreignField: "_id",
          as: "products"
        }
      },
      {
        $unwind: "$products"
      },
      {
        $group: {
          _id: {
            warehouseId: "$_id",
            productId: "$products._id"
          },
          locationName: { $first: "$name" },
          product: { $first: "$products" },
          batches: { $push: "$batches" },
          accumulative: { $sum: "$batches.accumulative" },
          out: { $sum: "$batches.outQty" },
          reserved: { $sum: "$batches.reserved" },
        }
      },
      {
        $addFields: {
          remain: {
            $subtract: [
              "$accumulative",
              { $add: ["$out", "$reserved"] }
            ]
          }
        }
      },
      {
        $project: {
          batches: 0,
          accumulative: 0,
          out: 0
        }
      }
    ])

    console.log(r)

    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: r,
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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const params = await request.json()

    const isExist = await Batche.find({
      productId: params.productId,
      locationId: params.locationId,
      isOpening: true
    })

    if (isExist.length > 0) {
      return NextResponse.json(
        {
          noResult: true,
          message: "Product already exist",
          result: null,
          error: false
        }
      )
    }
    else {
      const batchNumber = `B-${String(Date.now()).slice(-5)}`

      const newBatch = await Batche.create({
        ...params,
        batchNumber,
        qty: 1,
        reserved: 0,

      })

      const [batch] = await Batche.aggregate([
        {
          $match: {
            batchNumber: batchNumber
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
            remain: params.accumulative
          }
        }
      ])

      const result = {
        ...newBatch._doc,
        product: batch.product,
        locationName: batch.location.name,
        remain: params.accumulative
      }

      return NextResponse.json(
        {
          noResult: false,
          message: "",
          result: result,
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