import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BankVoucher from "@/models/BankVoucher";
import Companie from "@/models/Companie";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      masterAccountId,
      voucherNumber,
      voucherType,
      bankAccountId,
      dibayarDiterima,
      noRekening,
      date,
      items,
      total,
      terbilang,
    } = body;

    if (!masterAccountId || !voucherNumber || !voucherType || !date) {
      return NextResponse.json({
        noResult: true,
        message: "Field wajib tidak boleh kosong (masterAccountId, voucherNumber, voucherType, date)",
        result: null,
        error: true,
      });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Perusahaan tidak ditemukan",
        result: null,
        error: true,
      });
    }

    const voucherCount = await BankVoucher.countDocuments({
      companyId: company._id,
    });

    // Check duplicate voucherNumber per company
    const existing = await BankVoucher.findOne({
      companyId: company._id,
      voucherNumber,
    });
    if (existing) {
      return NextResponse.json({
        noResult: true,
        message: `Nomor voucher "${voucherNumber}" sudah ada`,
        result: null,
        error: true,
      });
    }

    const voucher = await BankVoucher.create({
      companyId: company._id,
      voucherNumber,
      voucherType,
      bankAccountId: bankAccountId || null,
      dibayarDiterima: dibayarDiterima || "",
      noRekening: noRekening || "",
      date: new Date(date),
      items: (items || []).map((item: any, i: number) => ({
        no: i + 1,
        keterangan: item.keterangan || "",
        customer: item.customer || "",
        jumlah: Number(item.jumlah) || 0,
      })),
      total: Number(total) || 0,
      terbilang: terbilang || "",
    });

    return NextResponse.json({
      noResult: false,
      message: "Voucher berhasil disimpan",
      result: voucher,
      error: false,
    });
  } catch (e: any) {
    console.error("POST BankVoucher Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Terjadi kesalahan",
      result: null,
      error: true,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const id = url.searchParams.get("id"); // masterAccountId

    if (!id) {
      return NextResponse.json({
        noResult: true,
        message: "masterAccountId wajib diisi",
        result: null,
        error: true,
      });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({
        noResult: true,
        message: "Perusahaan tidak ditemukan",
        result: null,
        error: true,
      });
    }

    const vouchers = await BankVoucher.find({ companyId: company._id })
      .populate("bankAccountId", "bank accountName accountNumber")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: vouchers,
      error: false,
    });
  } catch (e: any) {
    console.error("GET BankVoucher Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Terjadi kesalahan",
      result: null,
      error: true,
    });
  }
}
