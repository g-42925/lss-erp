/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type StockReportDailyEntry = {
  _id: string
  date: string
  firstStock: number
  inbound: number
  outbound: number
  endStock: number
}

type ProductInfo = {
  itemCode: string
  name: string
  unit: string
  category: string
}

type Warehouse = {
  _id: string
  name: string
  code: string
}

type ProductMin = {
  _id: string
  productId: string
  productName: string
  productType: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function firstOfMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("id-ID").format(n)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [warehouseId, setWarehouseId] = useState("")
  const [productId, setProductId] = useState("")
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<ProductMin[]>([])
  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  
  const [items, setItems] = useState<StockReportDailyEntry[]>([])
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  // ─── Load Resources ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydrated || !loggedIn || !masterAccountId) return

    // Fetch Warehouses
    fetch(`/api/web/warehouse?id=${masterAccountId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error && data.result?.length > 0) {
          setWarehouses(data.result)
          setWarehouseId(data.result[0]._id)
        }
      })
      .catch(() => { })

    // Fetch Products (Good only)
    fetch(`/api/web/products?id=${masterAccountId}&type=all`)
      .then(r => r.json())
      .then(data => {
        if (!data.error && data.result?.length > 0) {
          const onlyGoods = data.result.filter((p: any) => p.productType?.toLowerCase() === 'good')
          setProducts(onlyGoods)
        }
      })
      .catch(() => { })
  }, [hasHydrated, loggedIn, masterAccountId])

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    if (!warehouseId) {
      alert("Silakan pilih gudang terlebih dahulu.")
      return
    }
    if (!productId) {
      alert("Silakan pilih produk terlebih dahulu.")
      return
    }
    if (!startDate || !endDate) {
      alert("Silakan tentukan rentang tanggal.")
      return
    }

    setLoading(true)
    setItems([])
    setProductInfo(null)
    
    try {
      const params = new URLSearchParams({
        id: masterAccountId,
        warehouseId: warehouseId,
        productId: productId,
        startDate: startDate,
        endDate: endDate
      })
      const res = await fetch(`/api/web/inventory/stock-report?${params}`)
      const data = await res.json()
      if (!data.error && data.result) {
        setItems(data.result.data || [])
        setProductInfo(data.result.productInfo || null)
        setHasRun(true)
      } else {
        alert(data.message || "Gagal memuat laporan stok")
      }
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Print View Details ──────────────────────────────────────────────────────
  const selectedWarehouse = warehouses.find(w => w._id === warehouseId)
  const warehouseLabel = selectedWarehouse ? `${selectedWarehouse.name} (${selectedWarehouse.code})` : ""

  const totalInbound = items.reduce((s, r) => s + r.inbound, 0)
  const totalOutbound = items.reduce((s, r) => s + r.outbound, 0)
  
  // End Stock uses the last day's endStock (or 0 if array empty)
  const endingStock = items.length > 0 ? items[items.length - 1].endStock : 0
  const beginningStock = items.length > 0 ? items[0].firstStock : 0

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 p-6 print:hidden">
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-orange-600 p-2.5 shadow-lg shadow-orange-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 1.875 1.875v11.25a1.875 1.875 0 0 1-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V6.375c0-1.036.84-1.875 1.875-1.875Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Stock Ledger</h1>
              <p className="text-sm text-slate-500">Kartu pergerakan stok harian per produk.</p>
            </div>
          </div>
          <button
            onClick={() => setTimeout(() => window.print(), 100)}
            disabled={!hasRun || loading || items.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V6.375c0-1.036-.84-1.875-1.875-1.875h-6.75A1.875 1.875 0 0 1 6.75 6.375v2.941" />
            </svg>
            Print
          </button>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Kartu Stok</p>
          <div className="flex flex-wrap items-end gap-4">

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600">Gudang</label>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[200px]"
              >
                {warehouses.length === 0 && <option value="">Memuat gudang...</option>}
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600 flex justify-between">Produk <span className="text-[10px] text-red-500 font-bold">*Wajib</span></label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300 max-w-sm"
              >
                <option value="">-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>{p.productId ? `[${p.productId}] ` : ''}{p.productName}</option>
                ))}
              </select>
            </div>

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

            <button
              onClick={runReport}
              disabled={loading || !warehouseId || !productId}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 active:scale-95 disabled:opacity-60 mt-2 sm:mt-0"
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : null}
              Tampilkan
            </button>
          </div>
        </div>

        {/* ── Summary Cards ────────────────────────────────────────────────────── */}
        {hasRun && !loading && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard label="Saldo Awal Periode" value={fmtNum(beginningStock)} color="blue" icon="🕰️" />
            <SummaryCard label="Total Barang Masuk" value={fmtNum(totalInbound)} color="teal" icon="↙️" />
            <SummaryCard label="Total Barang Keluar" value={fmtNum(totalOutbound)} color="rose" icon="↗️" />
            <SummaryCard label="Saldo Akhir Periode" value={fmtNum(endingStock)} color="emerald" icon="📊" />
          </div>
        )}

        {/* ── Table Card ───────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden min-h-[400px]">
          {hasRun && !loading && productInfo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{productInfo.category || "Tanpa Kategori"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">{productInfo.itemCode || "-"}</span>
                  <p className="text-lg font-bold text-slate-800 leading-tight">{productInfo.name}</p>
                </div>
              </div>
              <div className="flex flex-col sm:items-end">
                <span className="text-xs text-slate-500 font-medium">Satuan (UOM)</span>
                <span className="text-sm font-bold text-orange-600">{productInfo.unit}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <span className="loading loading-spinner loading-lg text-orange-600" />
              <p className="text-sm text-slate-400">Menghitung mutasi stok harian…</p>
            </div>
          ) : !hasRun ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="font-semibold text-slate-500">Pilih Gudang dan Produk lalu klik <span className="text-orange-600">Tampilkan</span></p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Tidak ada data untuk rentang waktu tersebut.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 text-left border-r border-slate-100">Tanggal</th>
                    <th className="px-6 py-4 text-right bg-blue-50/30 text-blue-700">Saldo Awal</th>
                    <th className="px-6 py-4 text-right bg-teal-50/30 text-teal-700">Inbound</th>
                    <th className="px-6 py-4 text-right bg-rose-50/30 text-rose-700">Outbound</th>
                    <th className="px-6 py-4 text-right bg-emerald-50/30 text-emerald-700 border-l border-slate-100">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-700 border-r border-slate-50 text-xs">
                        {fmtDate(row.date)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-blue-600 bg-blue-50/10">
                        {fmtNum(row.firstStock)}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold bg-teal-50/10 ${row.inbound > 0 ? 'text-teal-600' : 'text-slate-300'}`}>
                        {fmtNum(row.inbound)}
                      </td>
                      <td className={`px-6 py-3.5 text-right font-bold bg-rose-50/10 ${row.outbound > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                        {fmtNum(row.outbound)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-600 bg-emerald-50/10 border-l border-slate-50">
                        {fmtNum(row.endStock)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Print View ──────────────────────────────────────────────────────── */}
      <div className="hidden print:block text-black bg-white absolute top-0 left-0 w-full min-h-screen z-50 p-8">
        <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
          <p className="text-2xl font-bold uppercase tracking-widest text-slate-900">Kartu Stok Harian</p>
          <p className="text-sm text-slate-700 mt-2 font-medium">Gudang: <span className="font-bold">{warehouseLabel}</span></p>
          <p className="text-sm text-slate-700 mt-0.5 font-medium">Produk: <span className="font-bold">{productInfo?.name || "-"}</span> ({productInfo?.itemCode || "-"})</p>
          <p className="text-sm text-slate-700 mt-0.5 font-medium">Periode: <span className="font-bold">{fmtDate(startDate)}</span> s/d <span className="font-bold">{fmtDate(endDate)}</span></p>
          <p className="text-xs text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Saldo Awal", value: fmtNum(beginningStock), color: "text-blue-800" },
            { label: "Barang Masuk", value: fmtNum(totalInbound), color: "text-teal-800" },
            { label: "Barang Keluar", value: fmtNum(totalOutbound), color: "text-rose-800" },
            { label: "Saldo Akhir", value: fmtNum(endingStock), color: "text-emerald-800" },
          ].map(c => (
            <div key={c.label} className="border-2 border-slate-200 rounded-lg p-3 text-center bg-slate-50">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-slate-800 font-bold text-left bg-slate-100">
              <th className="py-2.5 px-3 uppercase tracking-wider text-slate-700 border-r border-slate-300">Tanggal</th>
              <th className="py-2.5 px-3 text-right uppercase tracking-wider text-blue-900 border-r border-slate-300">Saldo Awal</th>
              <th className="py-2.5 px-3 text-right uppercase tracking-wider text-teal-900 border-r border-slate-300">Inbound</th>
              <th className="py-2.5 px-3 text-right uppercase tracking-wider text-rose-900 border-r border-slate-300">Outbound</th>
              <th className="py-2.5 px-3 text-right uppercase tracking-wider text-emerald-900">Saldo Akhir</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={row._id} className={`border-b border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                <td className="py-2 px-3 font-medium text-slate-800 border-r border-slate-200">{fmtDate(row.date)}</td>
                <td className="py-2 px-3 text-right font-bold text-blue-900 border-r border-slate-200">{fmtNum(row.firstStock)}</td>
                <td className="py-2 px-3 text-right font-medium text-teal-900 border-r border-slate-200">{fmtNum(row.inbound)}</td>
                <td className="py-2 px-3 text-right font-medium text-rose-900 border-r border-slate-200">{fmtNum(row.outbound)}</td>
                <td className="py-2 px-3 text-right font-bold text-emerald-900">{fmtNum(row.endStock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
