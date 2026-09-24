import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BankVoucher from "@/models/BankVoucher";
import BankAccount from "@/models/BankAccount";
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
  const match = deskripsi.match(/pelunasan\s+.+?\s*:\s*(\S+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Parse the bank-masuk voucher number to extract the company bankAccount info.
 *
 * Format: BM-BCA7738/I/26/002
 * Steps:
 *   1. Split by "-"  → ["BM", "BCA7738/I/26/002"]
 *   2. Take right side, split by "/"  → ["BCA7738", "I", "26", "002"]
 *   3. First segment (e.g. "BCA7738"):
 *      - letters = bank name code (e.g. "BCA")
 *      - digits  = last-4 digits of account number (e.g. "7738")
 */
function parseBankMasukVoucherNumber(voucherNumber: string): { bankCode: string; last4: string } | null {
  const dashParts = voucherNumber.split("-");
  if (dashParts.length < 2) return null;
  const afterPrefix = dashParts.slice(1).join("-"); // e.g. "BCA7738/I/26/002"
  const slashParts = afterPrefix.split("/");
  const segment = slashParts[0]; // e.g. "BCA7738"
  const letters = segment.replace(/[0-9]/g, ""); // e.g. "BCA"
  const digits  = segment.replace(/[^0-9]/g, ""); // e.g. "7738"
  if (!letters || !digits) return null;
  return { bankCode: letters.toUpperCase(), last4: digits };
}

/**
 * Parse the "No. Rekening" cell for bank-keluar rows.
 *
 * Format: "BCA - 773852921" or "Bank Mandiri - 12312312"
 * Split by " - " or " -" or "- ":
 *   left  → bank property
 *   right → noRekening property
 */
function parseNoRekening(val: string): { bank: string; noRekening: string } {
  const dashIdx = val.indexOf("-");
  if (dashIdx === -1) return { bank: val.trim(), noRekening: "" };
  const bank       = val.slice(0, dashIdx).trim();
  const noRekening = val.slice(dashIdx + 1).trim();
  return { bank, noRekening };
}

// ─── main handler ────────────────────────────────────────────────────────────

/**
 * POST /api/web/bank-voucher/import
 *
 * Accepts multipart/form-data:
 *   - file            : Excel file (.xlsx / .xls)
 *   - masterAccountId : string
 *
 * Excel layout (auto-detected, tolerates title rows before the header):
 *
 *   [Title row - optional, e.g. "ARUS BANK 2026"]
 *   No | Tanggal | No. Voucher       | (merged) | Customer | No. Rekening | Deskripsi | Debit | Kredit
 *                | Bank Masuk | Bank Keluar |
 *
 * Rules:
 *  - "Bank Masuk" column → voucherType = "masuk"; "Bank Keluar" → "keluar".
 *  - Customer column → dibayarDiterima on the BankVoucher.
 *  - Bank Keluar:
 *      "No. Rekening" cell is split by "-": left = bank, right = noRekening.
 *  - Bank Masuk:
 *      Voucher number is parsed (e.g. BM-BCA7738/...) to resolve the company's
 *      BankAccount by matching bank code & last-4 digits of accountNumber.
 *      The resolved accountNumber becomes noRekening.
 *  - If deskripsi matches "Pelunasan <outlet> : <invoiceNo>", the saved voucher's
 *    _id is written into Invoice.paymentHistory[i].voucherId where amount matches.
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

    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: true,
    });

    if (rawRows.length < 2) {
      return NextResponse.json({ noResult: true, message: "File Excel kosong atau tidak memiliki data", result: null, error: true });
    }

    // ── auto-detect header rows ───────────────────────────────────────────
    const MAX_SCAN = 15;

    const rowContains  = (row: unknown[], kw: string) => row.map(norm).some(c => c.includes(kw));
    const isMainHeader = (row: unknown[]) => rowContains(row, "tanggal");
    const isSubHeader  = (row: unknown[]) => rowContains(row, "bank masuk") || rowContains(row, "bank keluar");

    let mainHeaderIdx = -1;
    let subHeaderIdx  = -1;

    for (let i = 0; i < Math.min(MAX_SCAN, rawRows.length); i++) {
      const row = rawRows[i] as unknown[];
      if (mainHeaderIdx === -1 && isMainHeader(row)) { mainHeaderIdx = i; continue; }
      if (mainHeaderIdx !== -1 && subHeaderIdx === -1 && isSubHeader(row)) { subHeaderIdx = i; break; }
      if (mainHeaderIdx === -1 && isSubHeader(row)) { subHeaderIdx = i; break; }
    }

    const debugRows = rawRows.slice(0, Math.min(MAX_SCAN, rawRows.length)).map((r, i) => ({
      idx: i,
      cells: (r as unknown[]).map(norm).filter(Boolean),
    }));

    if (mainHeaderIdx === -1 && subHeaderIdx === -1) {
      return NextResponse.json({
        noResult: true,
        message: "Baris header tidak ditemukan. Pastikan ada baris dengan kolom: Tanggal, Bank Masuk / Bank Keluar",
        result: { debugRows },
        error: true,
      });
    }

    // ── resolve column indices ────────────────────────────────────────────
    let colTanggal    = -1;
    let colBankMasuk  = -1;
    let colBankKeluar = -1;
    let colDeskripsi  = -1;
    let colDebit      = -1;
    let colKredit     = -1;
    let colCustomer   = -1;
    let colNoRekening = -1;
    let dataStartRow: number;

    if (mainHeaderIdx !== -1 && subHeaderIdx !== -1) {
      dataStartRow = subHeaderIdx + 1;
      const hdr = (rawRows[mainHeaderIdx] as unknown[]).map(norm);
      const sub = (rawRows[subHeaderIdx]  as unknown[]).map(norm);

      hdr.forEach((h, i) => {
        if (h.includes("tanggal"))                              colTanggal    = i;
        if (h.includes("deskripsi") || h.includes("keterangan")) colDeskripsi  = i;
        if (h.includes("debit"))                                colDebit      = i;
        if (h.includes("kredit"))                               colKredit     = i;
        if (h.includes("customer"))                             colCustomer   = i;
        if (h.includes("no. rekening") || h.includes("no rekening") || h.includes("rekening")) colNoRekening = i;
      });
      sub.forEach((h, i) => {
        if (h.includes("bank masuk"))  colBankMasuk  = i;
        if (h.includes("bank keluar")) colBankKeluar = i;
      });

    } else if (mainHeaderIdx !== -1) {
      dataStartRow = mainHeaderIdx + 1;
      const hdr = (rawRows[mainHeaderIdx] as unknown[]).map(norm);

      hdr.forEach((h, i) => {
        if (h.includes("tanggal"))                              colTanggal    = i;
        if (h.includes("bank masuk"))                           colBankMasuk  = i;
        if (h.includes("bank keluar"))                          colBankKeluar = i;
        if (h.includes("deskripsi") || h.includes("keterangan")) colDeskripsi  = i;
        if (h.includes("debit"))                                colDebit      = i;
        if (h.includes("kredit"))                               colKredit     = i;
        if (h.includes("customer"))                             colCustomer   = i;
        if (h.includes("no. rekening") || h.includes("no rekening") || h.includes("rekening")) colNoRekening = i;
      });

    } else {
      dataStartRow = subHeaderIdx + 1;
      const sub = (rawRows[subHeaderIdx] as unknown[]).map(norm);
      sub.forEach((h, i) => {
        if (h.includes("bank masuk"))  colBankMasuk  = i;
        if (h.includes("bank keluar")) colBankKeluar = i;
        if (h.includes("debit"))       colDebit      = i;
        if (h.includes("kredit"))      colKredit     = i;
        if (h.includes("tanggal"))     colTanggal    = i;
        if (h.includes("customer"))    colCustomer   = i;
        if (h.includes("no. rekening") || h.includes("no rekening") || h.includes("rekening")) colNoRekening = i;
      });
    }

    if ((colBankMasuk === -1 && colBankKeluar === -1) || (colDebit === -1 && colKredit === -1)) {
      return NextResponse.json({
        noResult: true,
        message: `Kolom penting tidak ditemukan. colTanggal=${colTanggal} colBankMasuk=${colBankMasuk} colBankKeluar=${colBankKeluar} colDebit=${colDebit} colKredit=${colKredit}. mainHeaderIdx=${mainHeaderIdx} subHeaderIdx=${subHeaderIdx}`,
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
      customer: string;      // first customer for dibayarDiterima
      noRekeningRaw: string; // raw "No. Rekening" cell (only relevant for keluar)
    }

    const voucherMap   = new Map<string, ParsedVoucher>();
    const voucherOrder: string[] = [];

    for (let r = dataStartRow; r < rawRows.length; r++) {
      const row = rawRows[r] as unknown[];

      if (row.every(c => c === "" || c === null || c === undefined)) continue;

      const rawDate       = colTanggal    >= 0 ? row[colTanggal]    : null;
      const bankMasukVal  = colBankMasuk  >= 0 ? String(row[colBankMasuk]  ?? "").trim() : "";
      const bankKeluarVal = colBankKeluar >= 0 ? String(row[colBankKeluar] ?? "").trim() : "";
      const deskripsi     = colDeskripsi  >= 0 ? String(row[colDeskripsi]  ?? "").trim() : "";
      const customerVal   = colCustomer   >= 0 ? String(row[colCustomer]   ?? "").trim() : "";
      const noRekeningVal = colNoRekening >= 0 ? String(row[colNoRekening] ?? "").trim() : "";

      let voucherType: "masuk" | "keluar" = "keluar";
      let voucherNumber = "";

      if (bankMasukVal) {
        voucherType   = "masuk";
        voucherNumber = bankMasukVal;
      } else if (bankKeluarVal) {
        voucherType   = "keluar";
        voucherNumber = bankKeluarVal;
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
        voucherMap.set(voucherNumber, {
          voucherNumber,
          voucherType,
          date: parsedDate,
          items: [],
          customer: customerVal,
          noRekeningRaw: noRekeningVal,
        });
        voucherOrder.push(voucherNumber);
      }
      const pv = voucherMap.get(voucherNumber)!;
      // Update customer if not yet set
      if (!pv.customer && customerVal) pv.customer = customerVal;
      if (deskripsi || jumlah || customerVal) {
        pv.items.push({ no: pv.items.length + 1, keterangan: deskripsi, customer: customerVal, jumlah });
      }
    }

    if (voucherOrder.length === 0) {
      return NextResponse.json({ noResult: true, message: "Tidak ada data valid ditemukan di file Excel", result: null, error: true });
    }

    // ── load all company bank accounts once ───────────────────────────────
    const bankAccounts: any[] = await BankAccount.find({ addedBy: company._id }).lean();

    // ── persist vouchers + link paymentHistory ─────────────────────────────
    const created: unknown[] = [];
    const skipped: string[]  = [];
    const errors:  string[]  = [];
    const linked:  string[]  = [];

    let currentCount = await BankVoucher.countDocuments({ companyId: company._id });

    for (const key of voucherOrder) {
      const pv = voucherMap.get(key)!;

      const exists = await BankVoucher.findOne({ companyId: company._id, voucherNumber: pv.voucherNumber });
      if (exists) {
        skipped.push(pv.voucherNumber);
        // Still attempt invoice linking even when voucher is skipped (already exists).
        // This handles the case where a previous import created the voucher but linking failed.
        try {
          for (const item of pv.items) {
            const invoiceNo = extractInvoiceNumber(item.keterangan);
            if (!invoiceNo) continue;
            const invoice = await Invoice.findOne({
              companyId:     company._id,
              invoiceNumber: { $regex: new RegExp(`^${invoiceNo.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}$`, "i") },
            });
            if (!invoice) continue;
            const histIdx = invoice.paymentHistory.findIndex(
              (ph: any) => Math.abs(ph.amount - item.jumlah) < 1 && !ph.voucherId && !ph.reverted
            );
            if (histIdx !== -1) {
              invoice.paymentHistory[histIdx].voucherId = exists._id;
              invoice.markModified("paymentHistory");
              if (!invoice.bankVoucherId) invoice.bankVoucherId = exists._id;
              await invoice.save();
              linked.push(`${invoiceNo} \u2192 ${pv.voucherNumber} (voucher existing)`);
            }
          }
        } catch { /* ignore linking errors for skipped vouchers */ }
        continue;
      }

      try {
        const total        = pv.items.reduce((s, it) => s + it.jumlah, 0);
        const terbilangVal = total > 0 ? terbilang(total) + " Rupiah" : "";
        currentCount++;

        // ── Resolve bank fields depending on voucherType ──────────────────
        let bankField       = "";
        let noRekeningField = "";
        let bankAccountId: string | null = null;

        if (pv.voucherType === "keluar") {
          // Parse "No. Rekening" cell: "BCA - 773852921" → bank / noRekening
          if (pv.noRekeningRaw) {
            const parsed = parseNoRekening(pv.noRekeningRaw);
            bankField       = parsed.bank;
            noRekeningField = parsed.noRekening;
          }

        } else {
          // "masuk" – derive company's bankAccount from the voucher number
          const parsed = parseBankMasukVoucherNumber(pv.voucherNumber);
          if (parsed) {
            // Match BankAccount: bank contains bankCode (case-insensitive) AND last-4 of accountNumber matches
            const match = bankAccounts.find((ba) => {
              const bankMatches = ba.bank.toUpperCase().includes(parsed.bankCode) || parsed.bankCode.includes(ba.bank.toUpperCase().replace(/[^A-Z]/g, ""));
              const last4Matches = ba.accountNumber.slice(-4) === parsed.last4;
              return bankMatches && last4Matches;
            });
            if (match) {
              bankAccountId   = match._id.toString();
              bankField       = match.bank;
              noRekeningField = match.accountNumber;
            } else {
              // Fallback: just extract bank code from voucher number
              bankField       = parsed.bankCode;
              noRekeningField = parsed.last4;
              errors.push(`${pv.voucherNumber}: Rekening perusahaan tidak ditemukan (bank=${parsed.bankCode}, last4=${parsed.last4}), voucher tetap dibuat`);
            }
          }
        }

        const voucher = await BankVoucher.create({
          companyId:       company._id,
          voucherNumber:   pv.voucherNumber,
          voucherType:     pv.voucherType,
          bankAccountId:   bankAccountId,
          bank:            bankField,
          dibayarDiterima: pv.customer,
          noRekening:      noRekeningField,
          date:            pv.date,
          items:           pv.items.map((it, i) => ({
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
        for (const item of pv.items) {
          const invoiceNo = extractInvoiceNumber(item.keterangan);
          if (!invoiceNo) continue;

          const invoice = await Invoice.findOne({
            companyId:     company._id,
            invoiceNumber: { $regex: new RegExp(`^${invoiceNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          });
          if (!invoice) {
            errors.push(`Linking ${invoiceNo}: Not found in DB`);
            continue;
          }

          // --- Try to find an unlinked matching entry first ---
          let histIdx = invoice.paymentHistory.findIndex(
            (ph: any) =>
              Math.abs(ph.amount - item.jumlah) < 1 &&
              !ph.voucherId &&
              !ph.reverted
          );

          // --- Fallback: allow re-linking if entry already has a voucherId ---
          // Handles cases where a previous import already set voucherId (partial run),
          // or user is re-importing to update the link.
          if (histIdx === -1) {
            const alreadyLinkedIdx = invoice.paymentHistory.findIndex(
              (ph: any) =>
                Math.abs(ph.amount - item.jumlah) < 1 &&
                ph.voucherId &&
                !ph.reverted
            );

            if (alreadyLinkedIdx !== -1) {
              histIdx = alreadyLinkedIdx;
              errors.push(`Linking ${invoiceNo}: paymentHistory amount=${item.jumlah} sudah terhubung sebelumnya — di-update ke voucher ${pv.voucherNumber}`);
            } else {
              // Still no match — provide a detailed diagnostic breakdown
              const amountMatches = invoice.paymentHistory.filter(
                (ph: any) => Math.abs(ph.amount - item.jumlah) < 1
              );
              if (amountMatches.length === 0) {
                const allAmounts = (invoice.paymentHistory as any[])
                  .map((ph: any) => ph.amount)
                  .join(", ");
                errors.push(
                  `Linking ${invoiceNo}: Tidak ada paymentHistory dengan amount ${item.jumlah}. ` +
                  `Amount yang tersedia: [${allAmounts || "kosong"}]`
                );
              } else {
                const reasons = amountMatches.map((ph: any) => {
                  if (ph.reverted) return `amount OK tapi reverted=true`;
                  if (ph.voucherId) return `amount OK tapi voucherId sudah terisi (${ph.voucherId})`;
                  return `amount OK`;
                });
                errors.push(
                  `Linking ${invoiceNo}: paymentHistory amount=${item.jumlah} ditemukan (${amountMatches.length} entri) ` +
                  `tapi tidak bisa di-link: ${reasons.join("; ")}`
                );
              }
              continue;
            }
          }

          invoice.paymentHistory[histIdx].voucherId = voucher._id;
          invoice.markModified("paymentHistory");

          // Only set root-level bankVoucherId if not already set
          if (!invoice.bankVoucherId) {
            invoice.bankVoucherId = voucher._id;
          }

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
      message:  `Import selesai. ${created.length} voucher dibuat, ${skipped.length} dilewati (duplikat), ${errors.length} gagal/warning, ${linked.length} invoice terhubung.`,
      result:   { created: created.length, skipped, errors, linked },
      error:    errors.length > 0 && created.length === 0,
    });

  } catch (e: any) {
    console.error("POST BankVoucher Import Error:", e);
    return NextResponse.json({ noResult: true, message: e.message || "Terjadi kesalahan saat import", result: null, error: true });
  }
}
