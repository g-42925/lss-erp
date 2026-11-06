/* eslint-disable @typescript-eslint/no-explicit-any */

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Purchase from "@/models/Purchase";
import Companie from "@/models/Companie";

import mongoose from "mongoose"


/**
 * GET /api/web/purchases/last-price
 * Query params:
 *   - productId: ID produk / inv-item
 *   - id: masterAccountId perusahaan
 *   - purchaseType: 'product' | 'procurement'
 *
 * Returns the most recent ordered/completed Purchase for that product:
 *   { finalPrice, quantity, date, purchaseOrderNumber, customSupplier }
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const masterAccountId = url.searchParams.get("id");
  const productId = url.searchParams.get("productId");
  const purchaseType = url.searchParams.get("purchaseType") ?? "procurement";

  if (!masterAccountId || !productId) {
    return NextResponse.json({
      noResult: true,
      message: "id and productId are required",
      result: null,
      error: true,
    });
  }

  try {
    await connectToDatabase();

    const company = await Companie.findOne({ masterAccountId }).lean() as any;
    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Company not found",
        result: null,
        error: true,
      });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId!)

    const history = await Purchase.aggregate([
      {
        $match: {
          companyId: company._id,
          purchaseType,
          "items.productId": productObjectId,
          status: "ordered"
        }
      },
      {
        $sort: {
          date: -1,
          _id: -1
        }
      },
      {
        $limit: 3
      },
      {
        $project: {
          _id: 0,
          date: 1,
          item: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$items",
                  as: "item",
                  cond: {
                    $eq: ["$$item.productId", productObjectId]
                  }
                }
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: 1,
          pricePerUnit: "$item.pricePerUnit",
          quantity: "$item.quantity",
          finalPrice: "$item.finalPrice"
        }
      }
    ])

    return NextResponse.json({
      noResult: false,
      message: "",
      result: history,
      error: false,
    });
  }
  catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true,
    });
  }
}
