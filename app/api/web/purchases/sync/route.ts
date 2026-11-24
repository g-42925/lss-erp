/* eslint-disable @typescript-eslint/no-explicit-any */

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import Purchase from "@/models/Purchase";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const rawPurchases = Array.isArray(body.purchases)
      ? body.purchases
      : body.purchase
        ? [body.purchase]
        : Array.isArray(body)
          ? body
          : [];

    if (rawPurchases.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Tidak ada data purchase yang dikirim untuk disinkronkan",
        results: [],
      }, { status: 400 });
    }

    const defaultMasterAccountId = body.masterAccountId;
    const syncedResults: any[] = [];

    for (let i = 0; i < rawPurchases.length; i++) {
      const item = rawPurchases[i];
      const tmpPoNumber = item.tmpPurchaseOrderNumber;

      try {
        const masterAccountId = item.id || defaultMasterAccountId;
        if (!masterAccountId) {
          throw new Error("Master account ID tidak ditemukan");
        }

        const company = await Companie.findOne({ masterAccountId });
        if (!company) {
          throw new Error(`Perusahaan tidak ditemukan untuk account ID: ${masterAccountId}`);
        }

        // Cek idempotensi: jika tmpPurchaseOrderNumber sudah pernah disinkronkan sebelumnya
        if (tmpPoNumber) {
          const existing = await Purchase.findOne({
            companyId: company._id,
            tmpPurchaseOrderNumber: tmpPoNumber,
          }).lean() as any;

          if (existing) {
            syncedResults.push({
              tmpPurchaseOrderNumber: tmpPoNumber,
              success: true,
              alreadySynced: true,
              purchaseId: existing._id,
              purchaseOrderNumber: existing.purchaseOrderNumber,
              data: existing,
            });
            continue;
          }
        }

        const isMultiItem = Array.isArray(item.items) && item.items.length > 0;
        const purchaseType = item.purchaseType || "product";

        // Hitung total final price
        let resolvedFinalPrice = parseFloat(item.finalPrice) || 0;
        if (isMultiItem && !item.finalPrice) {
          resolvedFinalPrice = (item.items as any[]).reduce(
            (sum: number, it: any) => sum + (parseFloat(it.finalPrice) || 0),
            0
          );
        }

        // Generate PO number unik (PO - XXXXX-YYY)
        const timestampPart = String(Date.now() + i).slice(-5);
        const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
        const purchaseOrderNumber = `PO - ${timestampPart}-${randomPart}`;

        const createPayload: any = {
          companyId: company._id,
          createdBy: item.createdBy,
          purchaseOrderNumber,
          tmpPurchaseOrderNumber: tmpPoNumber || undefined,
          purchaseType,
          status: "requested",
          editable: true,
          receivedQty: 0,
          date: item.date ? new Date(item.date) : new Date(),
          finalPrice: resolvedFinalPrice,
          customSupplier: item.customSupplier || "",
        };

        if (purchaseType === "service") {
          createPayload.description = item.description || "";
          if (item.vendorId) createPayload.vendorId = item.vendorId;
        }
        else if (isMultiItem) {
          createPayload.items = item.items.map((it: any) => ({
            productId: it.productId,
            itemType: it.itemType || (purchaseType === "procurement" ? "inventory" : "product"),
            quantity: parseFloat(it.quantity) || 1,
            finalPrice: parseFloat(it.finalPrice) || 0,
            note: it.note || "",
            pricePerUnit: it.pricePerUnit || (it.quantity ? (parseFloat(it.finalPrice) || 0) / parseFloat(it.quantity) : 0),
          }));
        }
        else {
          // single item fallback
          if (item.productId) createPayload.productId = item.productId;
          if (item.quantity) createPayload.quantity = parseFloat(item.quantity) || 1;
          if (item.supplierId) createPayload.supplierId = item.supplierId;
        }

        const [created] = await Purchase.create(createPayload);

        syncedResults.push({
          tmpPurchaseOrderNumber: tmpPoNumber,
          success: true,
          purchaseId: created._id,
          purchaseOrderNumber: created.purchaseOrderNumber,
          data: created,
        });
      }
      catch (err: any) {
        syncedResults.push({
          tmpPurchaseOrderNumber: tmpPoNumber,
          success: false,
          error: err?.message || "Gagal menyimpan ke database server",
        });
      }
    }

    const successCount = syncedResults.filter((r) => r.success).length;
    const failedCount = syncedResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failedCount === 0,
      total: rawPurchases.length,
      syncedCount: successCount,
      failedCount,
      results: syncedResults,
    });
  }
  catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || "Terjadi kesalahan server saat sinkronisasi",
      error: true,
    });
  }
}

