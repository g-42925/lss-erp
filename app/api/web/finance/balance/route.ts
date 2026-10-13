/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import { getAvailableBalance } from "@/lib/finance/balance";

/**
 * GET /api/web/finance/balance
 * Query params:
 *   - id: masterAccountId
 *   - paymentMethod: string ("Cash" | "transfer from BCA" | etc)
 *   - bankAccountId: string (optional, for bank methods)
 *   - date: string (optional, ISO date, saldo dihitung sampai tanggal ini)
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const masterAccountId = url.searchParams.get("id");
    const paymentMethod = url.searchParams.get("paymentMethod") ?? "Cash";
    const bankAccountId = url.searchParams.get("bankAccountId") ?? undefined;
    const asOfDate = url.searchParams.get("date") ?? undefined;

    if (!masterAccountId) {
      return NextResponse.json({ error: true, message: "masterAccountId diperlukan", result: null });
    }

    const cmp = await Companie.findOne({ masterAccountId });
    if (!cmp) {
      return NextResponse.json({ error: true, message: "Perusahaan tidak ditemukan", result: null });
    }

    const balance = await getAvailableBalance(cmp._id, paymentMethod, bankAccountId, asOfDate);

    return NextResponse.json({ error: false, message: "", result: balance });
  } catch (e: any) {
    return NextResponse.json({
      error: true,
      message: e instanceof Error ? e.message : "Terjadi kesalahan",
      result: null,
    });
  }
}
