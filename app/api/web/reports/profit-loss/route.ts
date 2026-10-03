import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Invoice from '@/models/Invoice';
import Companie from '@/models/Companie';
import Cashflow from '@/models/Cashflow';
import Log from '@/models/Log';
import Purchase from '@/models/Purchase';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const startDate = url.searchParams.get("startDate"); // YYYY-MM
    const endDate = url.searchParams.get("endDate"); // YYYY-MM

    if (!id) {
      return NextResponse.json({ error: true, message: "Company Master Account ID is required", noResult: true, result: null });
    }

    const company = await Companie.findOne({ masterAccountId: id });
    if (!company) {
      return NextResponse.json({ error: true, message: "Company not found", noResult: true, result: null });
    }

    // Prepare date range — use local midnight to cover full days regardless of timezone
    let startYear: number, startMonth: number, endYear: number, endMonth: number;

    if (startDate && endDate) {
      [startYear, startMonth] = startDate.split('-').map(Number);
      [endYear, endMonth] = endDate.split('-').map(Number);
    } else {
      const now = new Date();
      startYear = now.getFullYear();
      startMonth = 1;
      endYear = now.getFullYear();
      endMonth = 12;
    }

    // start = first day of startMonth, end = last day of endMonth (covers full local days)
    const start = new Date(startYear, startMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(endYear, endMonth, 0, 23, 59, 59, 999); // day 0 of next month = last day of endMonth

    // Initialize monthly data for every month in range
    const monthlyData: Record<string, { labaKotor: number; pengeluaran: number; pengeluaranDetail: any[] }> = {};
    const cur = new Date(startYear, startMonth - 1, 1);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { labaKotor: 0, pengeluaran: 0, pengeluaranDetail: [] };
      cur.setMonth(cur.getMonth() + 1);
    }

    // ── 1. LABA KOTOR dari Invoice ───────────────────────────────────────────
    // Ambil semua invoice dalam rentang bulan yang dipilih
    const invoices = await Invoice.find({
      companyId: company._id,
      date: { $gte: start, $lte: end },
      void: { $ne: true }
    }).lean();

    for (const inv of invoices) {
      const invDate = new Date(inv.date);
      const monthKey = `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) continue;

      // ── Hitung nilai invoice dari snapshot.order ──────────────────────────
      // 1. Ambil price dari snapshot.order
      const price: number = (inv.snapshot?.order?.price) || 0;

      // 2. Ambil qty dari snapshot.order
      const qty: number = inv.snapshot?.order?.qty || 1;

      // 3. PPI = price / qty
      const PPI = price / qty;

      // 4. x = missing * PPI
      const missing: number = inv.missing || 0;
      const x = missing * PPI;

      // 5. Nilai invoice = price - x
      const nilaiInvoice = price - x;

      monthlyData[monthKey].labaKotor += nilaiInvoice;
    }

    // ── 2. PENGELUARAN dari Cashflow (cash & bank keluar) ─────────────────────
    const cashflows = await Cashflow.find({
      companyId: company._id,
      date: { $gte: start, $lte: end },
      type: 'out',
      accountType: { $in: ['Cash', 'Bank'] }
    }).lean();

    for (const cf of cashflows) {
      const cfDate = new Date(cf.date);
      const monthKey = `${cfDate.getFullYear()}-${String(cfDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        const amount = cf.amount || 0;
        monthlyData[monthKey].pengeluaran += amount;
        monthlyData[monthKey].pengeluaranDetail.push({
          date: cf.date,
          source: 'Cashflow',
          description: cf.description || 'Pengeluaran Cashflow',
          amount: amount
        });
      }
    }

    // ── 3. PENGELUARAN dari Log pembayaran pembelian (Purchase) ───────────────
    const purchases = await Purchase.find({ companyId: company._id }).select('_id').lean();
    const purchaseIds = purchases.map((p: any) => p._id);

    if (purchaseIds.length > 0) {
      const logs = await Log.find({
        purchaseId: { $in: purchaseIds },
        date: { $gte: start, $lte: end },
        amount: { $gt: 0 }
      }).lean();

      for (const log of logs) {
        const logDate = new Date(log.date);
        const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[monthKey]) {
          const amount = Math.abs(log.amount || 0);
          monthlyData[monthKey].pengeluaran += amount;
          monthlyData[monthKey].pengeluaranDetail.push({
            date: log.date,
            source: 'Pembelian (Purchase)',
            description: log.notes || 'Pembayaran Pembelian',
            amount: amount
          });
        }
      }
    }

    // ── 4. PENGELUARAN dari Hutang ke Vendor (vendor_manual) ──────────────────
    const vendorInvoices = await Invoice.find({
      companyId: company._id,
      date: { $gte: start, $lte: end },
      invoiceType: 'vendor_manual',
      void: { $ne: true }
    }).lean();

    for (const vInv of vendorInvoices) {
      const vDate = new Date(vInv.date);
      const monthKey = `${vDate.getFullYear()}-${String(vDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        const amount = vInv.debt || 0;
        monthlyData[monthKey].pengeluaran += amount;
        monthlyData[monthKey].pengeluaranDetail.push({
            date: vInv.date,
            source: 'Hutang Vendor',
            description: `Invoice ${vInv.invoiceNumber || '-'}`,
            amount: amount
        });
      }
    }

    const reportData = Object.keys(monthlyData).sort().map(month => {
      const data = monthlyData[month];
      return {
        month,
        labaKotor: data.labaKotor,
        pengeluaran: data.pengeluaran,
        pengeluaranDetail: data.pengeluaranDetail,
        labaBersih: data.labaKotor - data.pengeluaran
      };
    });

    return NextResponse.json({
      noResult: reportData.length === 0,
      message: "Success",
      result: reportData,
      error: false
    });

  } catch (e: unknown) {
    return NextResponse.json({
      noResult: true,
      message: e instanceof Error ? e.message : "Something went wrong",
      result: null,
      error: true
    });
  }
}

