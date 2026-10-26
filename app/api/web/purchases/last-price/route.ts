/* eslint-disable @typescript-eslint/no-explicit-any */

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Purchase from "@/models/Purchase";
import Companie from "@/models/Companie";

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

    // Find the most recent purchase (ordered or completed) for this product
    const lastPurchase = await Purchase.findOne({
      companyId: company._id,
      productId,
      purchaseType,
      status: { $in: ["ordered", "completed"] },
    })
      .sort({ date: -1 })
      .lean() as any;

    if (!lastPurchase) {
      return NextResponse.json({
        noResult: true,
        message: "Belum ada riwayat pembelian untuk item ini",
        result: null,
        error: false,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "",
      result: {
        finalPrice: lastPurchase.finalPrice ?? 0,
        quantity: lastPurchase.quantity ?? 0,
        date: lastPurchase.date,
        purchaseOrderNumber: lastPurchase.purchaseOrderNumber,
        customSupplier: lastPurchase.customSupplier ?? null,
      },
      error: false,
    });
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message,
      result: null,
      error: true,
    });
  }
}
