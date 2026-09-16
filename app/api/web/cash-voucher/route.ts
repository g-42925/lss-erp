import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CashVoucher from "@/models/CashVoucher";
import Companie from "@/models/Companie";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      masterAccountId,
      voucherNumber,
      voucherType,
      dibayarDiterima,
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

    // Check duplicate voucherNumber per company
    const existing = await CashVoucher.findOne({
      companyId: company._id,
      voucherNumber,
    });

    if (existing) {
      return NextResponse.json({
        noResult: true,
        message: shiftResult.message || `Nomor voucher "${voucherNumber}" sudah ada`,
        result: null,
        error: true,
      });
    }

    const count = await CashVoucher.countDocuments({
      companyId: company._id
    });

    const voucher = await CashVoucher.create({
      companyId: company._id,
      voucherNumber,
      voucherType,
      dibayarDiterima: dibayarDiterima || "",
      date: new Date(date),
      items: (items || []).map((item: any, i: number) => ({
        no: i + 1,
        keterangan: item.keterangan || "",
        customer: item.customer || "",
        jumlah: Number(item.jumlah) || 0,
      })),
      total: Number(total) || 0,
      terbilang: terbilang || "",
      sequence: count + 1
    });

    return NextResponse.json({
      noResult: false,
      message: "Voucher berhasil disimpan",
      result: voucher,
      error: false,
    });
  } catch (e: any) {
    console.error("POST CashVoucher Error:", e);
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

    const vouchers = await CashVoucher.find({ companyId: company._id })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: vouchers,
      error: false,
    });
  } catch (e: any) {
    console.error("GET CashVoucher Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Terjadi kesalahan",
      result: null,
      error: true,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const {
      _id,
      masterAccountId,
      voucherNumber,
      voucherType,
      dibayarDiterima,
      date,
      items,
      total,
      terbilang,
    } = body;

    if (!_id || !masterAccountId || !voucherNumber || !voucherType || !date) {
      return NextResponse.json({
        noResult: true,
        message: "Field wajib tidak boleh kosong (_id, masterAccountId, voucherNumber, voucherType, date)",
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

    // Check duplicate voucherNumber per company
    const existing = await CashVoucher.findOne({
      companyId: company._id,
      voucherNumber,
      _id: { $ne: _id }
    });

    if (existing) {
      return NextResponse.json({
        noResult: true,
        message: `Nomor voucher "${voucherNumber}" sudah dipakai oleh voucher lain`,
        result: null,
        error: true,
      });
    }

    const voucher = await CashVoucher.findByIdAndUpdate(
      _id,
      {
        voucherNumber,
        voucherType,
        dibayarDiterima: dibayarDiterima || "",
        date: new Date(date),
        items: (items || []).map((item: any, i: number) => ({
          no: i + 1,
          keterangan: item.keterangan || "",
          customer: item.customer || "",
          jumlah: Number(item.jumlah) || 0,
        })),
        total: Number(total) || 0,
        terbilang: terbilang || "",
      },
      { new: true }
    );

    if (!voucher) {
      return NextResponse.json({
        noResult: true,
        message: "Voucher tidak ditemukan",
        result: null,
        error: true,
      });
    }

    return NextResponse.json({
      noResult: false,
      message: "Voucher berhasil diupdate",
      result: voucher,
      error: false,
    });
  } catch (e: any) {
    console.error("PUT CashVoucher Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Terjadi kesalahan",
      result: null,
      error: true,
    });
  }
}


export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const { _id, masterAccountId, newSequence } = body;

    if (!_id || !masterAccountId || newSequence === undefined || newSequence === null) {
      return NextResponse.json({
        noResult: true,
        message: "Field wajib tidak boleh kosong (_id, masterAccountId, newSequence)",
        result: null,
        error: true,
      });
    }

    const seqNum = Number(newSequence);
    if (!Number.isInteger(seqNum) || seqNum < 1) {
      return NextResponse.json({
        noResult: true,
        message: "newSequence harus berupa bilangan bulat positif",
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

    // Fetch the target voucher to get its current sequence
    const targetVoucher = await CashVoucher.findById(_id);
    if (!targetVoucher) {
      return NextResponse.json({
        noResult: true,
        message: "Voucher tidak ditemukan",
        result: null,
        error: true,
      });
    }

    const currentSequence = targetVoucher.sequence;

    // Increment sequence of ALL vouchers with sequence < currentSequence
    // (semua entitas yang lebih kecil dari sequence target saat ini)
    await CashVoucher.updateMany(
      {
        companyId: company._id,
        _id: { $ne: _id },
        sequence: { $lt: currentSequence },
      },
      { $inc: { sequence: 1 } }
    );

    // Set the target voucher's sequence to newSequence
    const voucher = await CashVoucher.findByIdAndUpdate(
      _id,
      { sequence: seqNum },
      { new: true }
    );

    if (!voucher) {
      return NextResponse.json({
        noResult: true,
        message: "Voucher tidak ditemukan setelah update",
        result: null,
        error: true,
      });
    }


    return NextResponse.json({
      noResult: false,
      message: `Sequence voucher berhasil diubah ke ${seqNum}`,
      result: voucher,
      error: false,
    });
  } catch (e: any) {
    console.error("PATCH CashVoucher Sequence Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Terjadi kesalahan",
      result: null,
      error: true,
    });
  }
}
