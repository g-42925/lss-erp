import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Companie from "@/models/Companie";
import Batche from "@/models/Batche";

// ─── GET /api/web/inventory/exit-items/products ───────────────────────────────
// Returns products with available stock in a given warehouse.
// Query: id (masterAccountId), warehouseId
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get("id");
    const warehouseId = url.searchParams.get("warehouseId");

    if (!masterAccountId || !warehouseId) {
      return NextResponse.json({ error: true, message: "id and warehouseId are required", result: null });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", result: null });
    }

    // Aggregate batches in this warehouse and join with products
    const stockItems = await Batche.aggregate([
      {
        $match: {
          warehouseId: new mongoose.Types.ObjectId(warehouseId),
          status: "ACTIVE",
        },
      },
      {
        $group: {
          _id: "$productId",
          accumulative: { $sum: "$accumulative" },
          outQty: { $sum: "$outQty" },
          reserved: { $sum: "$reserved" },
        },
      },
      {
        $addFields: {
          available: {
            $subtract: [
              "$accumulative",
              { $add: ["$outQty", "$reserved"] },
            ],
          },
        },
      },
      {
        $match: { available: { $gt: 0 } },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      // Only products belonging to this company
      {
        $match: { "product.productOf": company._id },
      },
      {
        $project: {
          _id: "$product._id",
          productName: "$product.productName",
          productId: "$product.productId",
          saleUnit: "$product.saleUnit",
          warehouseUnit: "$product.warehouseUnit",
          category: "$product.category",
          available: 1,
        },
      },
      { $sort: { productName: 1 } },
    ]);

    return NextResponse.json({ error: false, message: "", result: stockItems });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: true, message: (e as Error).message, result: null }, { status: 500 });
  }
}
