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
        message: `Nomor voucher "${voucherNumber}" sudah ada`,
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

    const vouchers = await CashVoucher.find({ companyId: company._id }).sort()
      .sort({ sequence: 1 });

    return NextResponse.json({
      noResult: false,
      message: "success",
      result: vouchers,
      error: false,
    });
  }
  catch (e: any) {
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

    const { action, masterAccountId } = body;

    // ── SWAP ACTION: tukar sequence & trailing number antara dua voucher ──
    if (action === "swap") {
      const { voucherId1, voucherId2 } = body;

      if (!voucherId1 || !voucherId2 || !masterAccountId) {
        return NextResponse.json({
          noResult: true,
          message: "Field wajib tidak boleh kosong (masterAccountId, voucherId1, voucherId2)",
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

      const [v1, v2] = await Promise.all([
        CashVoucher.findOne({ _id: voucherId1, companyId: company._id }),
        CashVoucher.findOne({ _id: voucherId2, companyId: company._id }),
      ]);

      if (!v1 || !v2) {
        return NextResponse.json({
          noResult: true,
          message: "Salah satu atau kedua voucher tidak ditemukan",
          result: null,
          error: true,
        });
      }

      const seq1 = v1.sequence as number;
      const seq2 = v2.sequence as number;

      // Ganti hanya bagian angka di akhir voucherNumber (mis. /001 → /002)
      const replaceTrailing = (voucherNum: string, newSeq: number) =>
        voucherNum.replace(/\/(\d+)$/, `/${String(newSeq).padStart(3, "0")}`);

      const newNum1 = replaceTrailing(v1.voucherNumber as string, seq2);
      const newNum2 = replaceTrailing(v2.voucherNumber as string, seq1);

      await Promise.all([
        CashVoucher.findByIdAndUpdate(voucherId1, { sequence: seq2, voucherNumber: newNum1 }),
        CashVoucher.findByIdAndUpdate(voucherId2, { sequence: seq1, voucherNumber: newNum2 }),
      ]);

      return NextResponse.json({
        noResult: false,
        message: `Nomor voucher berhasil ditukar antara #${seq1} dan #${seq2}`,
        result: { swapped: [voucherId1, voucherId2] },
        error: false,
      });
    }

    // ── CHANGE SEQUENCE ACTION (default) ──
    const { _id, newSequence } = body;

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

export async function DELETE(request: NextRequest) {
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

    await CashVoucher.deleteMany({ companyId: company._id });

    return NextResponse.json({
      noResult: false,
      message: "Semua voucher berhasil dihapus",
      result: null,
      error: false,
    });
  } catch (e: any) {
    console.error("DELETE CashVoucher Error:", e);
    return NextResponse.json({
      noResult: true,
      message: e.message || "Terjadi kesalahan",
      result: null,
      error: true,
    });
  }
}
