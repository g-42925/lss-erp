"use client"

import { useState, useEffect, useRef } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type AvailabilityRow = {
  _id: string
  itemCode: string
  name: string
  category: string
  availableItems: number
  availableForSale: number
  totalOut: number
}

type Warehouse = {
  _id: string
  name: string
  code: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [warehouseId, setWarehouseId] = useState("")
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [search, setSearch] = useState("")
  const [report, setReport] = useState<AvailabilityRow[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [loading, setLoading] = useState(false)
  const autoFiredRef = useRef(false)

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

  useEffect(() => {
    if (!warehouseId || autoFiredRef.current) return
    autoFiredRef.current = true
    runReport(warehouseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId])

  // ─── Auth guard ───────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Functions ────────────────────────────────────────────────────────────
  function runReport(wId: string) {
    if (!wId) { alert("Pilih gudang terlebih dahulu."); return }

    setLoading(true)
    setReport([])
    fetch(`/api/web/inventory/availability?id=${masterAccountId}&warehouseId=${wId}`)
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
    runReport(warehouseId)
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? report.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase())
    )
    : report

  const totalAvailableItems = filtered.reduce((s, r) => s + r.availableItems, 0)
  const totalAvailableForSale = filtered.reduce((s, r) => s + r.availableForSale, 0)
  const totalOut = filtered.reduce((s, r) => s + r.totalOut, 0)

  const selectedWarehouse = warehouses.find(w => w._id === warehouseId)
  const warehouseLabel = selectedWarehouse ? `${selectedWarehouse.name} (${selectedWarehouse.code})` : ""

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6 print:hidden">

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Ketersediaan Stok</h1>
            <p className="mt-1 text-sm text-slate-500">Cek barang tersedia, siap jual, & total pengeluaran per gudang</p>
          </div>
          <button
            onClick={() => setTimeout(() => window.print(), 100)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V6.375c0-1.036-.84-1.875-1.875-1.875h-6.75A1.875 1.875 0 0 1 6.75 6.375v2.941" />
            </svg>
            Print
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Gudang</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Gudang</label>
              <select
                value={warehouseId}
                onChange={e => { setWarehouseId(e.target.value); setHasRun(false); setReport([]) }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[200px]"
              >
                {warehouses.length === 0 && <option value="">Memuat...</option>}
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-800 active:scale-95 disabled:opacity-60"
            >
              {loading
                ? <span className="loading loading-spinner loading-xs" />
                : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              }
              Periksa
            </button>
          </div>
        </div>

        {hasRun && !loading && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Total Item Produk</p>
              <p className="text-3xl font-bold text-slate-800">{filtered.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-600">Tersedia (Fisik)</p>
              <p className="text-3xl font-bold text-blue-700">{totalAvailableItems.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">Tersedia Dijual</p>
              <p className="text-3xl font-bold text-emerald-700">{totalAvailableForSale.toLocaleString("id-ID")}</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-rose-600">Total Keluar</p>
              <p className="text-3xl font-bold text-rose-700">{totalOut.toLocaleString("id-ID")}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {hasRun && !loading && (
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <span className="text-sm text-slate-500">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
              <input
                type="search"
                placeholder="Cari produk..."
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
              <p className="font-semibold">Pilih gudang lalu klik <span className="text-indigo-700">Periksa</span></p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Tidak ada produk yang tersedia.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">Kode</th>
                    <th className="px-5 py-3 text-left">Nama Produk</th>
                    <th className="px-5 py-3 text-left">Kategori</th>
                    <th className="px-5 py-3 text-center bg-blue-50 text-blue-700">Barang Tersedia</th>
                    <th className="px-5 py-3 text-center bg-emerald-50 text-emerald-700">Tersedia Dijual</th>
                    <th className="px-5 py-3 text-center bg-rose-50 text-rose-700">Jumlah Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{row.itemCode}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-5 py-3.5 flex text-slate-600 text-xs">
                        {row.category ? <span className="bg-slate-100 px-2 py-0.5 rounded-full">{row.category}</span> : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center bg-blue-50/30">
                        <span className="font-bold text-blue-700">{row.availableItems.toLocaleString("id-ID")}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center bg-emerald-50/30">
                        <span className={`font-bold ${row.availableForSale > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          {row.availableForSale.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center bg-rose-50/30">
                        <span className={`font-bold ${row.totalOut > 0 ? "text-rose-700" : "text-slate-400"}`}>
                          {row.totalOut.toLocaleString("id-ID")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right">TOTAL</td>
                    <td className="px-5 py-3 text-center text-blue-700">{totalAvailableItems.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-3 text-center text-emerald-700">{totalAvailableForSale.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-3 text-center text-rose-700">{totalOut.toLocaleString("id-ID")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="hidden print:block text-black bg-white absolute top-0 left-0 w-full min-h-screen z-50 p-8">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <p className="text-2xl font-bold uppercase tracking-widest">Laporan Ketersediaan Stok</p>
          <p className="text-sm text-gray-600 mt-1">Gudang: {warehouseLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Item", value: filtered.length, color: "text-black" },
            { label: "Tersedia Fisik", value: totalAvailableItems.toLocaleString("id-ID"), color: "text-blue-900" },
            { label: "Tersedia Dijual", value: totalAvailableForSale.toLocaleString("id-ID"), color: "text-green-900" },
            { label: "Total Keluar", value: totalOut.toLocaleString("id-ID"), color: "text-red-900" },
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
              <th className="py-2 px-2 text-center">Tersedia Fisik</th>
              <th className="py-2 px-2 text-center">Tersedia Dijual</th>
              <th className="py-2 px-2 text-center">Total Keluar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row._id} className={`border-b border-gray-200 ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                <td className="py-1.5 px-2 font-mono text-gray-500">{row.itemCode}</td>
                <td className="py-1.5 px-2 font-semibold">{row.name}</td>
                <td className="py-1.5 px-2 text-gray-600">{row.category || "—"}</td>
                <td className="py-1.5 px-2 text-center font-bold text-blue-900">{row.availableItems.toLocaleString("id-ID")}</td>
                <td className="py-1.5 px-2 text-center font-bold text-green-900">{row.availableForSale.toLocaleString("id-ID")}</td>
                <td className="py-1.5 px-2 text-center font-bold text-red-900">{row.totalOut.toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold bg-gray-100">
              <td colSpan={3} className="py-2 px-2 text-right uppercase text-xs text-gray-600">Total</td>
              <td className="py-2 px-2 text-center">{totalAvailableItems.toLocaleString("id-ID")}</td>
              <td className="py-2 px-2 text-center">{totalAvailableForSale.toLocaleString("id-ID")}</td>
              <td className="py-2 px-2 text-center">{totalOut.toLocaleString("id-ID")}</td>
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
