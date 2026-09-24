import Cashflow from '@/models/Cashflow';
import Invoice from '@/models/Invoice';
import Purchase from '@/models/Purchase';
import Log from '@/models/Log';

/**
 * Menghitung saldo kas/bank yang tersedia.
 *
 * Saldo dihitung dari 3 sumber (konsisten dengan Cashflow Report):
 * 1. Invoice.paymentHistory  → pemasukan dari penjualan (Sales IN)
 * 2. Log (purchase payment)  → pengeluaran untuk pembelian (Purchase OUT)
 * 3. Cashflow collection     → kas manual (IN / OUT)
 *
 * @param companyId     ObjectId dari koleksi Companie
 * @param paymentMethod string metode pembayaran (e.g. "Cash", "transfer from BCA")
 * @param bankAccountId ObjectId bank account (hanya untuk metode Bank)
 */
export async function getAvailableBalance(
  companyId: any,
  paymentMethod: string,
  bankAccountId?: any
): Promise<number> {
  const isCash = !paymentMethod || paymentMethod === 'Cash' || paymentMethod.toLowerCase().includes('cash');

  const isCashMethod = (method: string) => {
    if (!method) return false;
    const m = method.toLowerCase();
    return m.includes('cash') || m === 'tunai';
  };

  const isBankMethod = (method: string) => {
    if (!method) return false;
    return method.toLowerCase().includes('transfer');
  };

  let balance = 0;

  // ─── 1. Sales income dari Invoice.paymentHistory ─────────────────────────────
  const invoices = await Invoice.find({
    companyId,
    paymentHistory: { $exists: true, $not: { $size: 0 } }
  }).select('paymentHistory').lean() as any[];

  for (const inv of invoices) {
    for (const p of (inv.paymentHistory ?? [])) {
      if (p.reverted) continue;
      const method = p.method || p.paymentMethod || '';  // Invoice uses `method`, fallback to `paymentMethod`
      const include = isCash ? isCashMethod(method) : isBankMethod(method);
      if (include) {
        balance += p.amount ?? 0;
      }
    }
  }

  // ─── 2. Purchase outflow dari Log ────────────────────────────────────────────
  const purchases = await Purchase.find({ companyId }).select('_id').lean() as any[];
  const purchaseIds = purchases.map((p: any) => p._id);

  if (purchaseIds.length > 0) {
    const logs = await Log.find({
      purchaseId: { $in: purchaseIds },
      amount: { $gt: 0 }
    }).select('amount paymentMethod type').lean() as any[];

    for (const log of logs) {
      const method = log.paymentMethod || '';
      const include = isCash ? isCashMethod(method) : isBankMethod(method);
      if (include) {
        balance -= Math.abs(log.amount);
      }
    }
  }

  // ─── 3. Manual Cashflow collection ───────────────────────────────────────────
  const cfQuery: any = {
    companyId,
    accountType: isCash ? 'Cash' : 'Bank'
  };
  if (!isCash && bankAccountId) {
    cfQuery.bankAccountId = bankAccountId;
  }

  const cashflows = await Cashflow.find(cfQuery).select('type amount').lean() as any[];
  for (const cf of cashflows) {
    if (cf.type === 'in' || cf.type === 'initial') balance += cf.amount;
    else if (cf.type === 'out') balance -= cf.amount;
  }

  return balance;
}
