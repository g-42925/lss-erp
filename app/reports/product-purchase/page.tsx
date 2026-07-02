"use client"

import { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductPurchaseEntry = {
  id: string
  transactionNumber: string
  date: string
  supplierName: string
  productName: string
  qty: number
  subTotal: number
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function fmtMoney(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function firstOfMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductPurchaseReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState('all')
  const [items, setItems] = useState<ProductPurchaseEntry[]>([])
  const [summary, setSummary] = useState<Record<string, { qty: number, subTotal: number }>>({})
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    setLoading(true)
    setItems([])
    setSummary({})
    try {
      const params = new URLSearchParams({ id: masterAccountId })
      const res = await fetch(`/api/web/reports/product-purchase?${params}`)
      const data = await res.json()
      if (!data.error && data.result) {
        
        const startTime = new Date(startDate).setHours(0, 0, 0, 0)
        const endTime = new Date(endDate).setHours(23, 59, 59, 999)

        // Filter and re-calculate summary for the date range internally
        const runtimeSummary: Record<string, { qty: number, subTotal: number }> = {}
        const filteredByDate = (data.result.data ?? []).filter((item: ProductPurchaseEntry) => {
          const d = new Date(item.date).getTime()
          if (d >= startTime && d <= endTime) {
             const pn = item.productName || 'Unknown Product'
             if(!runtimeSummary[pn]) runtimeSummary[pn] = { qty: 0, subTotal: 0 }
             runtimeSummary[pn].qty += item.qty
             runtimeSummary[pn].subTotal += item.subTotal
             return true;
          }
          return false;
        })

        setItems(filteredByDate)
        setSummary(runtimeSummary)
        setHasRun(true)
      } else {
        alert(data.message || "Gagal memuat laporan")
      }
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────
  let filtered = items

  if (statusFilter !== 'all') {
    filtered = filtered.filter(i => i.status === statusFilter)
  }

  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(r =>
      r.productName.toLowerCase().includes(s) ||
      r.transactionNumber.toLowerCase().includes(s) ||
      r.supplierName.toLowerCase().includes(s)
    )
  }

  const totalCalculatedExpense = Object.values(summary).reduce((acc, curr) => acc + curr.subTotal, 0)
  const totalCalculatedQty = Object.values(summary).reduce((acc, curr) => acc + curr.qty, 0)

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-orange-600 p-2.5 shadow-lg shadow-orange-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Product Purchase Report</h1>
            <p className="text-sm text-slate-500">Laporan transaksi pembelian produk.</p>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Laporan</p>
        <div className="flex flex-wrap items-end gap-4">

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Status Pembelian</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[150px]"
            >
              <option value="all">Semua Status</option>
              <option value="requested">Requested</option>
              <option value="approved">Approved</option>
              <option value="ordered">Ordered</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="void">Void</option>
            </select>
          </div>

          <button
            onClick={runReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 active:scale-95 disabled:opacity-60"
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : null}
            Tampilkan Laporan
          </button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {hasRun && !loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Pembelian" value={fmtMoney(totalCalculatedExpense)} color="rose" icon="📉" />
          <SummaryCard label="Total Item Dibeli" value={totalCalculatedQty} color="blue" icon="📦" />
          <SummaryCard label="Total Transaksi" value={filtered.length} color="amber" icon="📄" />
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {hasRun && !loading && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="text-sm text-slate-500">{filtered.length} rincian pembelian ditemukan</span>
            <input
              type="search"
              placeholder="Cari transaksi, supplier, produk…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="loading loading-spinner loading-lg text-orange-600" />
            <p className="text-sm text-slate-400">Menghitung pembelian produk…</p>
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="font-semibold">Pilih periode lalu klik <span className="text-orange-600">Tampilkan Laporan</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">Tidak ada data pembelian pada periode ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Transaksi</th>
                  <th className="px-4 py-3 text-left">Supplier/Vendor</th>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(row.date)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        <span className="bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">{row.transactionNumber}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium truncate max-w-[150px] text-xs">{row.supplierName}</td>
                    <td className="px-4 py-3.5 text-slate-700 truncate max-w-[200px] text-xs font-medium">{row.productName}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-white text-[10px] uppercase font-bold tracking-wide ${row.status === 'ordered' || row.status === 'completed' ? 'bg-teal-500' : row.status === 'void' || row.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">{row.qty}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600 text-xs">{fmtMoney(row.subTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Summary Card Component ───────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon }: {
  label: string
  value: string | number
  color: 'emerald' | 'rose' | 'amber' | 'violet' | 'blue' | 'teal'
  icon?: string
}) {
  const colorMap = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    teal: "border-teal-100 bg-teal-50 text-teal-700",
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorMap[color]}`}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest opacity-70">
        {icon && <span className="mr-1">{icon}</span>}{label}
      </p>
      <p className="text-xl sm:text-2xl font-bold truncate" title={String(value)}>{value}</p>
    </div>
  )
}
