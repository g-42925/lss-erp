"use client"

import { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type TaxEntry = {
  id: string
  transactionNumber: string
  date: string
  customerName: string
  productName: string
  taxName: string
  taxValue: number // percentage
  taxAmount: number
  subTotal: number
  source: string,
  taxInvoiceNumber: string
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
export default function TaxReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [search, setSearch] = useState("")
  const [taxTypeFilter, setTaxTypeFilter] = useState('all')
  const [items, setItems] = useState<TaxEntry[]>([])
  const [taxSummary, setTaxSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    setLoading(true)
    setItems([])
    setTaxSummary({})
    try {
      const params = new URLSearchParams({ id: masterAccountId })
      const res = await fetch(`/api/web/reports/tax?${params}`)
      const data = await res.json()
      if (!data.error && data.result) {

        const startTime = new Date(startDate).setHours(0, 0, 0, 0)
        const endTime = new Date(endDate).setHours(23, 59, 59, 999)

        // Filter and re-calculate summary for the date range internally
        const runtimeSummary: Record<string, number> = {}
        const filteredByDate = (data.result.data ?? []).filter((item: TaxEntry) => {
          const d = new Date(item.date).getTime()
          if (d >= startTime && d <= endTime) {
            const tn = item.taxName || 'Unknown'
            if (!runtimeSummary[tn]) runtimeSummary[tn] = 0
            runtimeSummary[tn] += item.taxAmount
            return true;
          }
          return false;
        })

        setItems(filteredByDate)
        setTaxSummary(runtimeSummary)
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

  if (taxTypeFilter !== 'all') {
    filtered = filtered.filter(i => i.taxName === taxTypeFilter)
  }

  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(r =>
      r.productName.toLowerCase().includes(s) ||
      r.transactionNumber.toLowerCase().includes(s) ||
      r.customerName.toLowerCase().includes(s) ||
      r.taxName.toLowerCase().includes(s)
    )
  }

  // Get distinct tax names
  const availableTaxes = Array.from(new Set(items.map(i => i.taxName)))

  const totalCalculatedTax = Object.values(taxSummary).reduce((acc, curr) => acc + curr, 0)

  function toExcel() {
    if (filtered.length === 0) return alert('Tidak ada data untuk diexport')
    const data = filtered.map(item => ({
      'Tanggal': fmtDate(item.date),
      'No Transaksi': item.transactionNumber,
      'Pelanggan': item.customerName,
      'Produk / Layanan': item.productName,
      'Tipe Pajak': item.taxName,
      'Tax Base (Subtotal)': item.subTotal,
      'Nilai Pajak (%)': item.taxValue,
      'Nominal Pajak': item.taxAmount,
      'No Faktur Pajak': item.taxInvoiceNumber || '-',
      'Sumber': item.source,
    }))
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tax Report')
    XLSX.writeFile(workbook, `tax-report-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-orange-600 p-2.5 shadow-lg shadow-orange-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tax Report</h1>
            <p className="text-sm text-slate-500">Laporan pajak yang diterima dari setiap transaksi.</p>
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
            <label className="text-xs font-semibold text-slate-600">Jenis Pajak</label>
            <select
              value={taxTypeFilter}
              onChange={e => setTaxTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[150px]"
            >
              <option value="all">Semua Jenis Pajak</option>
              {availableTaxes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
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
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total Keseluruhan Pajak" value={fmtMoney(totalCalculatedTax)} color="amber" icon="💵" />

          {Object.entries(taxSummary).map(([taxName, amt], idx) => (
            <SummaryCard key={idx} label={`Total ${taxName}`} value={fmtMoney(amt as number)} color="teal" />
          ))}
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {hasRun && !loading && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="text-sm text-slate-500">{filtered.length} detail pajak ditemukan</span>
            <input
              type="search"
              placeholder="Cari transaksi, pelanggan, tipe…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="loading loading-spinner loading-lg text-orange-600" />
            <p className="text-sm text-slate-400">Menghitung penerimaan pajak…</p>
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9ZM9.75 14.25l1.039 1.039" />
            </svg>
            <p className="font-semibold">Pilih periode lalu klik <span className="text-orange-600">Tampilkan Laporan</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">Tidak ada data pajak pada periode ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Nomor Transaksi</th>
                  <th className="px-4 py-3 text-left">Pelanggan</th>
                  <th className="px-4 py-3 text-left">Produk / Layanan</th>
                  <th className="px-4 py-3 text-left">Tipe Pajak</th>
                  <th className="px-4 py-3 text-right">Tax Base (Subtotal)</th>
                  <th className="px-4 py-3 text-right">Nilai Pajak (%)</th>
                  <th className="px-4 py-3 text-right">Nominal Pajak</th>
                  <th className="px-4 py-3 text-right">Faktur Pajak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(row.date)}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">{row.transactionNumber}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 font-medium truncate max-w-[150px]">{row.customerName}</td>
                    <td className="px-4 py-3.5 text-slate-700 truncate max-w-[200px] text-xs">{row.productName}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 text-xs">{row.taxName}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600 text-xs">{fmtMoney(row.subTotal)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-500 text-xs">{row.taxValue}%</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 text-xs">+{fmtMoney(row.taxAmount)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-500 text-xs">{row.taxInvoiceNumber === '' ? '-' : row.taxInvoiceNumber}</td>
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
