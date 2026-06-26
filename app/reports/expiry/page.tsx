"use client"

import { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type ExpiryReportEntry = {
  id: string
  batchNumber: string
  productName: string
  warehouseName: string
  locationName: string
  expiryDate: string
  expiredQty: number
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

function firstOfMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function endOfYearStr() {
    const now = new Date()
    return `${now.getFullYear()}-12-31`
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExpiryReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  // Default filter to "currently expired" or up to the end of the year to catch near expiries
  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(endOfYearStr())
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<ExpiryReportEntry[]>([])
  const [summary, setSummary] = useState({ totalExpiredQty: 0, totalBatches: 0 })
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    setLoading(true)
    setItems([])
    setSummary({ totalExpiredQty: 0, totalBatches: 0 })
    try {
      const params = new URLSearchParams({ 
        id: masterAccountId,
        startDate: startDate,
        endDate: endDate
      })
      const res = await fetch(`/api/web/reports/expiry?${params}`)
      const data = await res.json()
      if (!data.error && data.result) {
        setItems(data.result.data || [])
        setSummary(data.result.summary || { totalExpiredQty: 0, totalBatches: 0 })
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

  if (search.trim()) {
    const s = search.toLowerCase()
    filtered = filtered.filter(r =>
      r.productName.toLowerCase().includes(s) ||
      r.batchNumber.toLowerCase().includes(s) ||
      r.warehouseName.toLowerCase().includes(s)
    )
  }

  const isActuallyExpired = (dateString: string) => {
      return new Date(dateString).getTime() < new Date().getTime();
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/30 to-orange-50/20 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-orange-600 p-2.5 shadow-lg shadow-orange-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Expiry Report</h1>
            <p className="text-sm text-slate-500">Laporan produk yang kadaluarsa atau mendekati masa kadaluarsa.</p>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Tanggal Expiry</p>
        <div className="flex flex-wrap items-end gap-4">

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Dari Tanggal Expiry</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Sampai Tanggal Expiry</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
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
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <SummaryCard label="Total Batches Memenuhi Kriteria" value={summary.totalBatches} color="amber" icon="📦" />
          <SummaryCard label="Total Qty Beresiko / Kadaluarsa" value={summary.totalExpiredQty} color="rose" icon="⚠️" />
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {hasRun && !loading && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="text-sm text-slate-500">{filtered.length} batch ditemukan</span>
            <input
              type="search"
              placeholder="Cari produk, batch, warehouse…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="loading loading-spinner loading-lg text-orange-600" />
            <p className="text-sm text-slate-400">Menganalisa batch produk…</p>
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold">Pilih periode lalu klik <span className="text-orange-600">Tampilkan Laporan</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">Tidak ada batch kadaluarsa pada periode ini.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Produk</th>
                  <th className="px-4 py-3 text-left">Batch Number</th>
                  <th className="px-4 py-3 text-left">Lokasi</th>
                  <th className="px-4 py-3 text-center">Tgl Expiry</th>
                  <th className="px-4 py-3 text-center">Status Laporan</th>
                  <th className="px-4 py-3 text-right">Kuantitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => {
                  const expired = isActuallyExpired(row.expiryDate);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 text-slate-800 font-medium truncate max-w-[200px] text-xs">
                          {row.productName}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                            <span className="bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200">{row.batchNumber}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                            {row.warehouseName} {row.locationName !== '-' && `> ${row.locationName}`}
                        </td>
                        <td className={`px-4 py-3.5 text-center text-xs font-semibold ${expired ? 'text-rose-600' : 'text-slate-600'}`}>
                            {fmtDate(row.expiryDate)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-white text-[10px] uppercase font-bold tracking-wide ${expired ? 'bg-rose-500' : 'bg-amber-500'}`}>
                            {expired ? 'EXPIRED' : 'WARNING'}
                        </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600 text-xs">
                           {row.expiredQty}
                        </td>
                    </tr>
                  )
                })}
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
