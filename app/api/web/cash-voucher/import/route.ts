import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import CashVoucher from "@/models/CashVoucher";
import Companie from "@/models/Companie";
import Invoice from "@/models/Invoice";
import * as XLSX from "xlsx";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Indonesian number-to-words */
function terbilang(angka: number): string {
  angka = Math.abs(Math.round(angka));
  const bilangan = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima",
    "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
  ];
  let r = "";
  if (angka < 12)             r = bilangan[angka];
  else if (angka < 20)        r = terbilang(angka - 10) + " Belas";
  else if (angka < 100)       r = terbilang(Math.floor(angka / 10)) + " Puluh " + terbilang(angka % 10);
  else if (angka < 200)       r = "Seratus " + terbilang(angka - 100);
  else if (angka < 1000)      r = terbilang(Math.floor(angka / 100)) + " Ratus " + terbilang(angka % 100);
  else if (angka < 2000)      r = "Seribu " + terbilang(angka - 1000);
  else if (angka < 1_000_000) r = terbilang(Math.floor(angka / 1000)) + " Ribu " + terbilang(angka % 1000);
  else if (angka < 1_000_000_000) r = terbilang(Math.floor(angka / 1_000_000)) + " Juta " + terbilang(angka % 1_000_000);
  else                        r = terbilang(Math.floor(angka / 1_000_000_000)) + " Miliar " + terbilang(angka % 1_000_000_000);
  return r.trim().replace(/\s+/g, " ");
}

/** Parse a cell value to a JS Date */
function parseExcelDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") return new Date((val - 25569) * 86400 * 1000);
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    const parts = val.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number);
      if (a > 12) return new Date(c, b - 1, a); // DD/MM/YYYY
      return new Date(c, a - 1, b);
    }
  }
  return null;
}

/** Normalize a raw cell to a lowercase, trimmed string */
const norm = (v: unknown) => String(v ?? "").toLowerCase().trim();

/** Parse a numeric-ish cell to a number */
function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  return Number(String(v ?? "").replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
}

/**
 * Try to extract an invoice number from a description like:
 *   "Pelunasan Toko ABC : LR251200056"
 *   "Pelunasan PT Sumber : LR251200056"
 * Returns the invoice number string, or null if pattern not found.
 */
function extractInvoiceNumber(deskripsi: string): string | null {
  // Pattern: "Pelunasan <anything> : <invoice>"
  const match = deskripsi.match(/pelunasan\s+.+?\s*:\s*(\S+)/i);
  return match ? match[1].trim() : null;
}

// ─── main handler ────────────────────────────────────────────────────────────

/**
 * POST /api/web/cash-voucher/import
 *
 * Accepts multipart/form-data:
 *   - file            : Excel file (.xlsx / .xls)
 *   - masterAccountId : string
 *
 * Excel layout (auto-detected, tolerates title rows before the header):
 *
 *   [Title row - optional, e.g. "ARUS KAS JANUARI 2026"]
 *   No | Tanggal | No. Voucher         | (merged) | Deskripsi | Debit | …
 *                | Kas Masuk | Kas Keluar |
 *   1  | date    | KM-KAS/…            |          | desc      | 100   |
 *
 * Rules:
 *  - "No" column is display-only; item.no is auto-generated.
 *  - "Kas Masuk" column → voucherType = "masuk"; "Kas Keluar" → "keluar".
 *  - Rows without a voucher number are grouped as extra items for the last voucher.
 *  - If deskripsi matches "Pelunasan <outlet> : <invoiceNo>", the saved voucher's
 *    _id is written into Invoice.paymentHistory[i].voucherId where the amount matches.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await request.formData();
    const masterAccountId = formData.get("masterAccountId") as string;
    const file = formData.get("file") as File | null;

    if (!masterAccountId || !file) {
      return NextResponse.json({ noResult: true, message: "masterAccountId dan file wajib diisi", result: null, error: true });
    }

    const company = await Companie.findOne({ masterAccountId });
    if (!company) {
      return NextResponse.json({ noResult: true, message: "Perusahaan tidak ditemukan", result: null, error: true });
    }

    // ── read Excel ────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // sheet_to_json with header:1 → array-of-arrays; keep blank rows so indices stay correct
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: true,   // keep blank rows → indices reliable
    });

    if (rawRows.length < 2) {
      return NextResponse.json({ noResult: true, message: "File Excel kosong atau tidak memiliki data", result: null, error: true });
    }

    // ── auto-detect header rows ───────────────────────────────────────────
    // Scan up to MAX_SCAN rows to find:
    //   mainHeaderIdx  – row containing "tanggal" keyword
    //   subHeaderIdx   – row containing "kas masuk" or "kas keluar"
    const MAX_SCAN = 15;

    const rowContains  = (row: unknown[], kw: string) => row.map(norm).some(c => c.includes(kw));
    const isMainHeader = (row: unknown[]) => rowContains(row, "tanggal");
    const isSubHeader  = (row: unknown[]) => rowContains(row, "kas masuk") || rowContains(row, "kas keluar");

    let mainHeaderIdx = -1;
    let subHeaderIdx  = -1;

    for (let i = 0; i < Math.min(MAX_SCAN, rawRows.length); i++) {
      const row = rawRows[i] as unknown[];
      if (mainHeaderIdx === -1 && isMainHeader(row)) { mainHeaderIdx = i; continue; }
      if (mainHeaderIdx !== -1 && subHeaderIdx === -1 && isSubHeader(row)) { subHeaderIdx = i; break; }
      // edge: sub-header appears before (or without) a tanggal header
      if (mainHeaderIdx === -1 && isSubHeader(row)) { subHeaderIdx = i; break; }
    }

    // Build debug snapshot of first few rows to help diagnose problems
    const debugRows = rawRows.slice(0, Math.min(MAX_SCAN, rawRows.length)).map((r, i) => ({
      idx: i,
      cells: (r as unknown[]).map(norm).filter(Boolean),
    }));

    if (mainHeaderIdx === -1 && subHeaderIdx === -1) {
      return NextResponse.json({
        noResult: true,
        message: "Baris header tidak ditemukan. Pastikan ada baris dengan kolom: Tanggal, Kas Masuk / Kas Keluar",
        result: { debugRows },
        error: true,
      });
    }

    // ── resolve column indices ────────────────────────────────────────────
    let colTanggal  = -1;
    let colKasMasuk = -1;
    let colKasKeluar= -1;
    let colDeskripsi= -1;
    let colDebit    = -1;
    let colKredit   = -1;
    let colCustomer = -1;
    let dataStartRow: number;

    if (mainHeaderIdx !== -1 && subHeaderIdx !== -1) {
      // Two-row header (main + sub)
      dataStartRow = subHeaderIdx + 1;
      const hdr = (rawRows[mainHeaderIdx] as unknown[]).map(norm);
      const sub = (rawRows[subHeaderIdx]  as unknown[]).map(norm);

      hdr.forEach((h, i) => {
        if (h.includes("tanggal"))                         colTanggal   = i;
        if (h.includes("deskripsi") || h.includes("keterangan")) colDeskripsi = i;
        if (h.includes("debit"))                           colDebit     = i;
        if (h.includes("kredit"))                          colKredit    = i;
        if (h.includes("customer"))                        colCustomer  = i;
      });
      sub.forEach((h, i) => {
        if (h.includes("kas masuk"))  colKasMasuk  = i;
        if (h.includes("kas keluar")) colKasKeluar = i;
      });

    } else if (mainHeaderIdx !== -1) {
      // Single-row header
      dataStartRow = mainHeaderIdx + 1;
      const hdr = (rawRows[mainHeaderIdx] as unknown[]).map(norm);

      hdr.forEach((h, i) => {
        if (h.includes("tanggal"))                         colTanggal   = i;
        if (h.includes("kas masuk"))                       colKasMasuk  = i;
        if (h.includes("kas keluar"))                      colKasKeluar = i;
        if (h.includes("deskripsi") || h.includes("keterangan")) colDeskripsi = i;
        if (h.includes("debit"))                           colDebit     = i;
        if (h.includes("kredit"))                          colKredit    = i;
        if (h.includes("customer"))                        colCustomer  = i;
      });

    } else {
      // Only sub-header found
      dataStartRow = subHeaderIdx + 1;
      const sub = (rawRows[subHeaderIdx] as unknown[]).map(norm);
      sub.forEach((h, i) => {
        if (h.includes("kas masuk"))  colKasMasuk  = i;
        if (h.includes("kas keluar")) colKasKeluar = i;
        if (h.includes("debit"))      colDebit     = i;
        if (h.includes("kredit"))     colKredit    = i;
        if (h.includes("tanggal"))    colTanggal   = i;
        if (h.includes("customer"))   colCustomer  = i;
      });
    }

    // Validate essential columns
    if ((colKasMasuk === -1 && colKasKeluar === -1) || (colDebit === -1 && colKredit === -1)) {
      return NextResponse.json({
        noResult: true,
        message: `Kolom penting tidak ditemukan. colTanggal=${colTanggal} colKasMasuk=${colKasMasuk} colKasKeluar=${colKasKeluar} colDebit=${colDebit} colKredit=${colKredit}. mainHeaderIdx=${mainHeaderIdx} subHeaderIdx=${subHeaderIdx}`,
        result: { debugRows },
        error: true,
      });
    }

    // ── parse data rows → group by voucherNumber ─────────────────────────
    interface ParsedItem {
      no: number;
      keterangan: string;
      customer: string;
      jumlah: number;
    }
    interface ParsedVoucher {
      voucherNumber: string;
      voucherType: "masuk" | "keluar";
      date: Date;
      items: ParsedItem[];
    }

    const voucherMap   = new Map<string, ParsedVoucher>();
    const voucherOrder: string[] = [];

    for (let r = dataStartRow; r < rawRows.length; r++) {
      const row = rawRows[r] as unknown[];

      // Skip fully empty rows
      if (row.every(c => c === "" || c === null || c === undefined)) continue;

      const rawDate     = colTanggal   >= 0 ? row[colTanggal]   : null;
      const kasMasukVal = colKasMasuk  >= 0 ? String(row[colKasMasuk]  ?? "").trim() : "";
      const kasKeluarVal= colKasKeluar >= 0 ? String(row[colKasKeluar] ?? "").trim() : "";
      const deskripsi   = colDeskripsi >= 0 ? String(row[colDeskripsi] ?? "").trim() : "";
      const customerVal = colCustomer  >= 0 ? String(row[colCustomer]  ?? "").trim() : "";

      let voucherType: "masuk" | "keluar" = "keluar";
      let voucherNumber = "";

      if (kasMasukVal) {
        voucherType   = "masuk";
        voucherNumber = kasMasukVal;
      } else if (kasKeluarVal) {
        voucherType   = "keluar";
        voucherNumber = kasKeluarVal;
      } else {
        // Continuation row – attach to the last voucher
        if (voucherOrder.length === 0) continue;
        const last = voucherMap.get(voucherOrder[voucherOrder.length - 1])!;
        
        let jumlah = 0;
        if (last.voucherType === "masuk") {
          jumlah = toNum(colDebit >= 0 ? row[colDebit] : 0);
        } else {
          jumlah = toNum(colKredit >= 0 ? row[colKredit] : 0);
        }

        if (deskripsi || jumlah || customerVal) {
          last.items.push({ no: last.items.length + 1, keterangan: deskripsi, customer: customerVal, jumlah });
        }
        continue;
      }

      let jumlah = 0;
      if (voucherType === "masuk") {
        jumlah = toNum(colDebit >= 0 ? row[colDebit] : 0);
      } else {
        jumlah = toNum(colKredit >= 0 ? row[colKredit] : 0);
      }

      const parsedDate = parseExcelDate(rawDate) ?? new Date();

      if (!voucherMap.has(voucherNumber)) {
        voucherMap.set(voucherNumber, { voucherNumber, voucherType, date: parsedDate, items: [] });
        voucherOrder.push(voucherNumber);
      }
      const pv = voucherMap.get(voucherNumber)!;
      if (deskripsi || jumlah || customerVal) {
        pv.items.push({ no: pv.items.length + 1, keterangan: deskripsi, customer: customerVal, jumlah });
      }
    }

    if (voucherOrder.length === 0) {
      return NextResponse.json({ noResult: true, message: "Tidak ada data valid ditemukan di file Excel", result: null, error: true });
    }

    // ── persist vouchers + link paymentHistory ─────────────────────────────
    const created: unknown[] = [];
    const skipped: string[]  = [];
    const errors:  string[]  = [];
    const linked:  string[]  = []; // invoice numbers linked

    let currentCount = await CashVoucher.countDocuments({ companyId: company._id });

    for (const key of voucherOrder) {
      const pv = voucherMap.get(key)!;

      // Skip duplicates
      const exists = await CashVoucher.findOne({ companyId: company._id, voucherNumber: pv.voucherNumber });
      if (exists) { skipped.push(pv.voucherNumber); continue; }

      try {
        const total        = pv.items.reduce((s, it) => s + it.jumlah, 0);
        const terbilangVal = total > 0 ? terbilang(total) + " Rupiah" : "";
        const firstCustomer = pv.items.find((it) => it.customer)?.customer || "";
        currentCount++;

        const voucher = await CashVoucher.create({
          companyId:      company._id,
          voucherNumber:  pv.voucherNumber,
          voucherType:    pv.voucherType,
          dibayarDiterima:firstCustomer,
          date:           pv.date,
          items:          pv.items.map((it, i) => ({
            no:         it.no || i + 1,
            keterangan: it.keterangan,
            customer:   it.customer,
            jumlah:     it.jumlah,
          })),
          total,
          terbilang:  terbilangVal,
          status:     "saved",
          sequence:   currentCount,
        });

        created.push(voucher);

        // ── link paymentHistory on matching invoices ──────────────────────
        // For each item whose description matches "Pelunasan <outlet> : <invoiceNo>"
        for (const item of pv.items) {
          const invoiceNo = extractInvoiceNumber(item.keterangan);
          if (!invoiceNo) continue;

          const debugLink: string[] = [];

          // Find the invoice by invoiceNumber (within same company)
          const invoice = await Invoice.findOne({
            companyId:     company._id,
            invoiceNumber: { $regex: new RegExp(`^${invoiceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          });
          if (!invoice) {
            errors.push(`Linking ${invoiceNo}: Not found in DB`);
            continue;
          }

          // Find the paymentHistory entry whose amount matches and has no voucherId yet
          const histIdx = invoice.paymentHistory.findIndex(
            (ph: any) =>
              Math.abs(ph.amount - item.jumlah) < 1 && // within Rp 1
              !ph.voucherId &&
              !ph.reverted
          );

          if (histIdx === -1) {
            errors.push(`Linking ${invoiceNo}: Found invoice, but no unlinked paymentHistory matches amount ${item.jumlah}`);
            continue;
          }

          // Set the voucherId on that paymentHistory entry
          invoice.paymentHistory[histIdx].voucherId = voucher._id;
          invoice.markModified('paymentHistory'); // IMPORTANT: tell Mongoose the array changed
          
          // Also set at root level for legacy / single-payment compatibility
          invoice.cashVoucherId = voucher._id;
          
          await invoice.save();
          linked.push(`${invoiceNo} → ${pv.voucherNumber}`);
        }
        // ─────────────────────────────────────────────────────────────────

      } catch (e: any) {
        errors.push(`${pv.voucherNumber}: ${e.message}`);
      }
    }

    return NextResponse.json({
      noResult: false,
      message:  `Import selesai. ${created.length} voucher dibuat, ${skipped.length} dilewati (duplikat), ${errors.length} gagal, ${linked.length} invoice terhubung.`,
      result:   { created: created.length, skipped, errors, linked },
      error:    errors.length > 0 && created.length === 0,
    });

  } catch (e: any) {
    console.error("POST CashVoucher Import Error:", e);
    return NextResponse.json({ noResult: true, message: e.message || "Terjadi kesalahan saat import", result: null, error: true });
  }
}
