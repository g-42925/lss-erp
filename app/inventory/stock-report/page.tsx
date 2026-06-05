"use client"

import { useState, useEffect, useRef } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type StockRow = {
  _id: string
  itemCode: string
  name: string
  unit: string
  category: string
  firstStock: number
  inbound: number
  outbound: number
  endStock: number
}

type Warehouse = {
  _id: string
  name: string
  code: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function firstOfMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StockReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [warehouseId, setWarehouseId] = useState("")
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [search, setSearch] = useState("")
  const [report, setReport] = useState<StockRow[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [loading, setLoading] = useState(false)
  const autoFiredRef = useRef(false)

  // Load warehouses saat mount
  useEffect(() => {
    if (!hasHydrated || !loggedIn || !masterAccountId) return
    fetch(`/api/web/warehouse?id=${masterAccountId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error && data.result?.length > 0) {
          setWarehouses(data.result)
          setWarehouseId(data.result[0]._id)
        }
      })
      .catch(() => { })
  }, [hasHydrated, loggedIn, masterAccountId])

  // Auto-fetch satu kali setelah warehouseId pertama kali terisi
  useEffect(() => {
    if (!warehouseId || autoFiredRef.current) return
    autoFiredRef.current = true
    runReport(warehouseId, startDate, endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId])

  // ─── Auth guard ───────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Functions ────────────────────────────────────────────────────────────
  function runReport(wId: string, sd: string, ed: string) {
    if (!wId) { alert("Pilih gudang terlebih dahulu."); return }
    if (!sd || !ed) { alert("Pilih tanggal mulai dan akhir."); return }
    if (new Date(sd) > new Date(ed)) { alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir."); return }

    setLoading(true)
    setReport([])
    fetch(`/api/web/inventory/stock-report?id=${masterAccountId}&warehouseId=${wId}&startDate=${sd}&endDate=${ed}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setReport(data.result ?? [])
          setHasRun(true)
        } else {
          alert(data.message || "Gagal memuat laporan")
        }
      })
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }

  function handleRun() {
    runReport(warehouseId, startDate, endDate)
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? report.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase())
    )
    : report

  const totalFirstStock = filtered.reduce((s, r) => s + r.firstStock, 0)
  const totalInbound = filtered.reduce((s, r) => s + r.inbound, 0)
  const totalOutbound = filtered.reduce((s, r) => s + r.outbound, 0)
  const totalEndStock = filtered.reduce((s, r) => s + r.endStock, 0)

  const selectedWarehouse = warehouses.find(w => w._id === warehouseId)
  const warehouseLabel = selectedWarehouse ? `${selectedWarehouse.name} (${selectedWarehouse.code})` : ""

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Screen View ─────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6 print:hidden">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Stock Report</h1>
            <p className="mt-1 text-sm text-slate-500">Laporan pergerakan stok barang per gudang per periode</p>
          </div>
          <button
            id="btn-print-stock-report"
            onClick={() => setTimeout(() => window.print(), 100)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V6.375c0-1.036-.84-1.875-1.875-1.875h-6.75A1.875 1.875 0 0 1 6.75 6.375v2.941" />
            </svg>
            Print Report
          </button>
        </div>

        {/* Filter card */}
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Laporan</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Gudang</label>
              <select
                id="input-warehouse"
                value={warehouseId}
                onChange={e => { setWarehouseId(e.target.value); setHasRun(false); setReport([]) }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[180px]"
              >
                {warehouses.length === 0 && <option value="">Memuat...</option>}
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Mulai</label>
              <input
                id="input-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
              <input
                id="input-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              id="btn-run-stock-report"
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-800 active:scale-95 disabled:opacity-60"
            >
              {loading
                ? <span className="loading loading-spinner loading-xs" />
                : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              }
              Tampilkan Laporan
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {hasRun && !loading && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Total Item</p>
              <p className="text-3xl font-bold text-slate-800">{filtered.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">Total Inbound</p>
              <p className="text-3xl font-bold text-emerald-700">{totalInbound.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-rose-600">Total Outbound</p>
              <p className="text-3xl font-bold text-rose-700">{totalOutbound.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-600">Total End Stock</p>
              <p className="text-3xl font-bold text-indigo-700">{totalEndStock.toLocaleString("id-ID")}</p>
            </div>
          </div>
        )}

        {/* Table card */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {hasRun && !loading && (
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <span className="text-sm text-slate-500">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
              <input
                type="search"
                placeholder="Cari nama, kode, kategori…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <span className="loading loading-spinner loading-lg text-indigo-600" />
            </div>
          ) : !hasRun ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="mb-4 size-16 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              <p className="font-semibold">Pilih gudang lalu klik <span className="text-indigo-700">Tampilkan Laporan</span></p>
              <p className="mt-1 text-xs text-slate-300">Laporan stok akan muncul di sini</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Tidak ada produk yang cocok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Kode</th>
                    <th className="px-5 py-3 text-left">Nama Produk</th>
                    <th className="px-5 py-3 text-left">Kategori</th>
                    <th className="px-5 py-3 text-left">Satuan</th>
                    <th className="px-5 py-3 text-center bg-slate-100">
                      First Stock
                      <span className="block text-[10px] normal-case font-normal text-slate-400">awal {fmt(startDate)}</span>
                    </th>
                    <th className="px-5 py-3 text-center bg-emerald-50 text-emerald-700">
                      Inbound
                      <span className="block text-[10px] normal-case font-normal text-emerald-400">penerimaan</span>
                    </th>
                    <th className="px-5 py-3 text-center bg-rose-50 text-rose-700">
                      Outbound
                      <span className="block text-[10px] normal-case font-normal text-rose-400">pengeluaran</span>
                    </th>
                    <th className="px-5 py-3 text-center bg-indigo-50 text-indigo-700">
                      End Stock
                      <span className="block text-[10px] normal-case font-normal text-indigo-400">akhir {fmt(endDate)}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{row.itemCode}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-5 py-3.5">
                        {row.category
                          ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{row.category}</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">xxx</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-slate-700">{row.firstStock}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center bg-emerald-50/40">
                        <span className={`font-semibold ${row.inbound > 0 ? "text-emerald-700" : "text-slate-300"}`}>
                          {row.inbound > 0 ? `+${row.inbound.toLocaleString("id-ID")}` : "0"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center bg-rose-50/40">
                        <span className={`font-semibold ${row.outbound > 0 ? "text-rose-700" : "text-slate-300"}`}>
                          {row.outbound > 0 ? `-${row.outbound.toLocaleString("id-ID")}` : "0"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center bg-indigo-50/40">
                        <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${row.endStock === 0 ? "bg-red-100 text-red-600"
                          : row.endStock <= 5 ? "bg-amber-100 text-amber-700"
                            : "bg-indigo-100 text-indigo-700"
                          }`}>
                          {row.endStock.toLocaleString("id-ID")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <td colSpan={4} className="px-5 py-3 text-right">TOTAL</td>
                    <td className="px-5 py-3 text-center text-slate-700">{totalFirstStock.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-3 text-center text-emerald-700">+{totalInbound.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-3 text-center text-rose-700">-{totalOutbound.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-3 text-center text-indigo-700">{totalEndStock.toLocaleString("id-ID")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Print View ──────────────────────────────────────────────────────── */}
      <div className="hidden print:block text-black bg-white absolute top-0 left-0 w-full min-h-screen z-50 p-8">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <p className="text-2xl font-bold uppercase tracking-widest">Laporan Stok Barang</p>
          <p className="text-sm text-gray-600 mt-1">Gudang: {warehouseLabel}</p>
          <p className="text-sm text-gray-600 mt-0.5">Periode: {fmt(startDate)} — {fmt(endDate)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Item", value: filtered.length, color: "text-black" },
            { label: "Total Inbound", value: `+${totalInbound.toLocaleString("id-ID")}`, color: "text-green-800" },
            { label: "Total Outbound", value: `-${totalOutbound.toLocaleString("id-ID")}`, color: "text-red-800" },
            { label: "Total End Stock", value: totalEndStock.toLocaleString("id-ID"), color: "text-blue-900" },
          ].map(c => (
            <div key={c.label} className="border border-gray-200 rounded p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-black font-bold text-left bg-gray-50">
              <th className="py-2 px-2">Kode</th>
              <th className="py-2 px-2">Nama Produk</th>
              <th className="py-2 px-2">Kategori</th>
              <th className="py-2 px-2">Satuan</th>
              <th className="py-2 px-2 text-center">First Stock</th>
              <th className="py-2 px-2 text-center">Inbound</th>
              <th className="py-2 px-2 text-center">Outbound</th>
              <th className="py-2 px-2 text-center">End Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row._id} className={`border-b border-gray-200 ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                <td className="py-1.5 px-2 font-mono text-gray-500">{row.itemCode}</td>
                <td className="py-1.5 px-2 font-semibold">{row.name}</td>
                <td className="py-1.5 px-2 text-gray-600">{row.category || "—"}</td>
                <td className="py-1.5 px-2 text-gray-600">{row.unit || "-"}</td>
                <td className="py-1.5 px-2 text-center">{row.firstStock.toLocaleString("id-ID")}</td>
                <td className="py-1.5 px-2 text-center text-green-900 font-semibold">{row.inbound > 0 ? `+${row.inbound.toLocaleString("id-ID")}` : "0"}</td>
                <td className="py-1.5 px-2 text-center text-red-900 font-semibold">{row.outbound > 0 ? `-${row.outbound.toLocaleString("id-ID")}` : "0"}</td>
                <td className="py-1.5 px-2 text-center font-bold">{row.endStock.toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold bg-gray-100">
              <td colSpan={4} className="py-2 px-2 text-right uppercase text-xs text-gray-600">Total</td>
              <td className="py-2 px-2 text-center">{totalFirstStock.toLocaleString("id-ID")}</td>
              <td className="py-2 px-2 text-center text-green-900">+{totalInbound.toLocaleString("id-ID")}</td>
              <td className="py-2 px-2 text-center text-red-900">-{totalOutbound.toLocaleString("id-ID")}</td>
              <td className="py-2 px-2 text-center text-blue-900">{totalEndStock.toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-12 flex justify-end">
          <div className="text-center w-48">
            <p className="text-xs text-gray-500">Diperiksa oleh,</p>
            <div className="mt-12 border-t border-black pt-1 text-xs text-gray-700">( _________________ )</div>
          </div>
        </div>
      </div>
    </>
  )
}
