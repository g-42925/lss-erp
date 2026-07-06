"use client"

import { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type ProductSellEntry = {
  id: string
  transactionNumber: string
  date: string
  customerName: string
  productName: string
  productType: string
  qty: number
  subTotal: number
  source: string
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
export default function ProductSellReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [search, setSearch] = useState("")
  const [productTypeFilter, setProductTypeFilter] = useState('all')
  const [items, setItems] = useState<ProductSellEntry[]>([])
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
      const res = await fetch(`/api/web/reports/product-sell?${params}`)
      const data = await res.json()
      if (!data.error && data.result) {
        
        const startTime = new Date(startDate).setHours(0, 0, 0, 0)
        const endTime = new Date(endDate).setHours(23, 59, 59, 999)

        // Filter and re-calculate summary for the date range internally
        const runtimeSummary: Record<string, { qty: number, subTotal: number }> = {}
        const filteredByDate = (data.result.data ?? []).filter((item: ProductSellEntry) => {
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

  if (productTypeFilter !== 'all') {
    filtered = filtered.filter(i => i.productType === productTypeFilter)
  }

  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(r =>
      r.productName.toLowerCase().includes(s) ||
      r.transactionNumber.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s)
    )
  }

  const totalCalculatedRevenue = Object.values(summary).reduce((acc, curr) => acc + curr.subTotal, 0)
  const totalCalculatedQty = Object.values(summary).reduce((acc, curr) => acc + curr.qty, 0)

  function toExcel() {
    if (filtered.length === 0) return alert('Tidak ada data untuk diexport')
    const data = filtered.map(item => ({
      'Tanggal': fmtDate(item.date),
      'No Transaksi': item.transactionNumber,
      'Pelanggan': item.customerName,
      'Tipe Produk': item.productType,
      'Produk / Layanan': item.productName,
      'Qty': item.qty,
      'Subtotal (IDR)': item.subTotal,
      'Sumber': item.source,
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Sales')
    XLSX.writeFile(workbook, `product-sales-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-orange-600 p-2.5 shadow-lg shadow-orange-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72L4.318 3.44A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3.004 3.004 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V15h-1.5v5.25m5.25-10.5V15m1.5-4.5V15" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Product Sales Report</h1>
            <p className="text-sm text-slate-500">Laporan penjualan produk dan layanan.</p>
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
            <label className="text-xs font-semibold text-slate-600">Tipe Produk</label>
            <select
              value={productTypeFilter}
              onChange={e => setProductTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[150px]"
            >
              <option value="all">Semua Tipe</option>
              <option value="Good">Barang (Good)</option>
              <option value="Service">Layanan (Service)</option>
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
          <button
            onClick={toExcel}
            disabled={loading || !hasRun}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {hasRun && !loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Pendapatan" value={fmtMoney(totalCalculatedRevenue)} color="emerald" icon="💰" />
          <SummaryCard label="Total Item Terjual" value={totalCalculatedQty} color="blue" icon="📦" />
          <SummaryCard label="Total Transaksi" value={filtered.length} color="amber" icon="📄" />
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {hasRun && !loading && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="text-sm text-slate-500">{filtered.length} rincian penjualan ditemukan</span>
            <input
              type="search"
              placeholder="Cari transaksi, pelanggan, produk…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="loading loading-spinner loading-lg text-orange-600" />
            <p className="text-sm text-slate-400">Menghitung penjualan produk…</p>
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72L4.318 3.44A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3.004 3.004 0 0 1-.621 4.72m-13.5 8.65h3.75a.75.75 0 0 0 .75-.75V15h-1.5v5.25m5.25-10.5V15m1.5-4.5V15" />
            </svg>
            <p className="font-semibold">Pilih periode lalu klik <span className="text-orange-600">Tampilkan Laporan</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">Tidak ada data penjualan pada periode ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Transaksi</th>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-center w-24">Tipe</th>
                  <th className="px-4 py-3 text-left">Produk / Layanan</th>
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
                    <td className="px-4 py-3.5 text-slate-800 font-medium truncate max-w-[150px] text-xs">{row.customerName}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-white text-[10px] uppercase font-bold tracking-wide ${row.productType === 'Good' ? 'bg-teal-500' : 'bg-amber-500'}`}>
                        {row.productType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 truncate max-w-[200px] text-xs font-medium">{row.productName}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">{row.qty}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 text-xs">{fmtMoney(row.subTotal)}</td>
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
