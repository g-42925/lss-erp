import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import Batche from '@/models/Batche'

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase()
    const { _id, ...rest } = await request.json()
    await Batche.findByIdAndUpdate(_id, rest)

    const result = { _id, ...rest }

    return NextResponse.json(
      {
        noResult: false,
        message: "",
        result: result,
        error: false
      }
    )
  }
  catch (e: unknown) {
    return NextResponse.json(
      {
        noResult: false,
        message: e instanceof Error ? e.message : "Something went wrong",
        result: null,
        error: false
      }
    )
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pId = url.searchParams.get("pId")
  const lId = url.searchParams.get("lId")
  const poNumber = url.searchParams.get("poNumber")

  try {
    await connectToDatabase()

    // ── Fetch by purchaseOrderNumber (for purchase return) ────────────────
    if (poNumber) {
      const batches = await Batche.find({ purchaseOrderNumber: poNumber }).lean()
      return NextResponse.json({ noResult: false, message: "", result: batches, error: false })
    }

    // ── Original: fetch by productId + locationId ─────────────────────────
    let batches = await Batche.aggregate([
      {
        $match: {
          productId: new ObjectId(pId as string),
          locationId: new ObjectId(lId as string)
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'suppliers'
        }
      },
      {
        $addFields: {
          remain: { $subtract: ["$accumulative", "$outQty"] }
        }
      },
    ])

    batches = batches.map((b) => ({ ...b, supplier: b.suppliers[0] }))

    return NextResponse.json({ noResult: false, message: "", result: batches, error: false })
  }
  catch (e: unknown) {
    return NextResponse.json(
      {
        noResult: true,
        message: e instanceof Error ? e.message : "Something went wrong",
        result: null,
        error: true
      }
    )
  }
}