/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type ProfitLossEntry = {
  id: string
  orderId: string
  salesOrderNumber: string
  saleDate: string
  customerName: string
  productName: string
  warehouseName: string
  qty: number
  sellingPricePerUnit: number
  unitCost: number
  subTotal: number
  totalCost: number
  profitLossAmount: number
  status: 'Profit' | 'Loss'
  rawDifference: number
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
export default function ProfitLossReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<'all' | 'Profit' | 'Loss'>('all')
  const [items, setItems] = useState<ProfitLossEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    setLoading(true)
    setItems([])
    try {
      const params = new URLSearchParams({
        id: masterAccountId,
      })
      const res = await fetch(`/api/web/reports/profit-loss?${params}`)
      const data = await res.json()
      if (!data.error) {
        // Filter internally by date range as API returns all
        // (In a real large-scale app, do this date filter on the backend)
        const startTime = new Date(startDate).setHours(0, 0, 0, 0)
        const endTime = new Date(endDate).setHours(23, 59, 59, 999)

        const filteredByDate = (data.result ?? []).filter((item: ProfitLossEntry) => {
          const d = new Date(item.saleDate).getTime()
          return d >= startTime && d <= endTime
        })
        setItems(filteredByDate)
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
      r.salesOrderNumber.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s)
    )
  }

  const totals = filtered.reduce(
    (acc, curr) => {
      if (curr.status === "Profit") acc.profit += curr.profitLossAmount
      else acc.loss += curr.profitLossAmount
      acc.qty += curr.qty
      acc.subTotal += curr.subTotal
      return acc
    },
    { profit: 0, loss: 0, qty: 0, subTotal: 0 }
  )

  const netProfit = totals.profit - totals.loss

  function toExcel() {
    if (filtered.length === 0) return alert('Tidak ada data untuk diexport')

    const data = filtered.map(item => ({
      'Tanggal': fmtDate(item.saleDate),
      'S.O': item.salesOrderNumber,
      'Customer': item.customerName,
      'Product': item.productName,
      'Qty': item.qty,
      'Price': fmtMoney(item.sellingPricePerUnit),
      'Cost': fmtMoney(item.unitCost),
      'Total Sales': fmtMoney(item.subTotal),
      'Total Profit': fmtMoney(item.profitLossAmount),
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Profit & Loss")
    XLSX.writeFile(workbook, `profit-loss-${todayStr()}.xlsx`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-teal-600 p-2.5 shadow-lg shadow-teal-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Profit & Loss Report</h1>
            <p className="text-sm text-slate-500">Laporan keuntungan dan kerugian per item pada transaksi penjulan.</p>
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
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-300 min-w-[120px]"
            >
              <option value="all">Semua</option>
              <option value="Profit">Profit</option>
              <option value="Loss">Loss</option>
            </select>
          </div>

          <button onClick={runReport} disabled={loading} className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition-all hover:bg-teal-800 active:scale-95 disabled:opacity-60">
            {loading ? <span className="loading loading-spinner loading-xs" /> : null}
            Tampilkan Laporan
          </button>
          <button onClick={toExcel} disabled={loading} className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition-all hover:bg-teal-800 active:scale-95 disabled:opacity-60">
            Export
          </button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {hasRun && !loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Net Profit" value={fmtMoney(netProfit)} color={netProfit >= 0 ? "emerald" : "rose"} />
          <SummaryCard label="Total Profit" value={fmtMoney(totals.profit)} color="emerald" icon="📈" />
          <SummaryCard label="Total Loss" value={fmtMoney(totals.loss)} color="rose" icon="📉" />
          <SummaryCard label="Total Revenue (Items)" value={fmtMoney(totals.subTotal)} color="blue" icon="💰" />
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {hasRun && !loading && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="text-sm text-slate-500">{filtered.length} transaksi item ditemukan</span>
            <input
              type="search"
              placeholder="Cari produk, order, pelanggan…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="loading loading-spinner loading-lg text-teal-600" />
            <p className="text-sm text-slate-400">Menghitung profit dan loss…</p>
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
            </svg>
            <p className="font-semibold">Pilih periode lalu klik <span className="text-teal-700">Tampilkan Laporan</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">Tidak ada data yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">No Order</th>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Harga Jual/Unit</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Total Transaksi</th>
                  <th className="px-4 py-3 text-right">P/L Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(row.saleDate)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{row.salesOrderNumber}</td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium truncate max-w-[150px]">{row.customerName}</td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium truncate max-w-[200px]">{row.productName}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-700">{row.qty}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">{fmtMoney(row.sellingPricePerUnit)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">{fmtMoney(row.unitCost)}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800 text-xs">{fmtMoney(row.subTotal)}</td>
                    <td className={`px-4 py-3.5 text-right font-mono font-bold text-xs ${row.status === 'Profit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.status === 'Profit' ? '+' : '-'}{fmtMoney(row.profitLossAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.status === 'Profit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {row.status}
                      </span>
                    </td>
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
