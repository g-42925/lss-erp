"use client"

import { useState, useEffect } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type StockRow = {
  _id: string
  itemCode: string
  productName: string
  unit: string
  category: string
  physicalStock: number
  reserved: number
  available: number
  outQty: number
  saleUnit: string
  warehouseUnit: string
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
  const [report, setReport] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

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

  // Auto-fetch report when warehouseId changes
  useEffect(() => {
    if (!warehouseId) return
    let isMounted = true
    const controller = new AbortController()

    // Defer state reset to avoid synchronous setState inside effect body
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(true)
        setReport([])
      }
    }, 0)

    fetch(`/api/web/warehouse/availability?id=${masterAccountId}&warehouseId=${warehouseId}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return
        if (!data.error) {
          setReport(data.result ?? [])
          setHasRun(true)
        } else {
          alert(data.message || "Gagal memuat laporan ketersediaan stok")
        }
      })
      .catch(e => {
        if (isMounted && e.name !== 'AbortError') alert(e.message)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [warehouseId, masterAccountId])

  // ─── Auth guard ───────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? report.filter(r =>
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
      (r.category ?? "").toLowerCase().includes(search.toLowerCase())
    )
    : report

  const totalPhysical = filtered.reduce((s, r) => s + r.physicalStock, 0)
  const totalReserved = filtered.reduce((s, r) => s + r.reserved, 0)
  const totalAvailable = filtered.reduce((s, r) => s + r.available, 0)
  const totalOutbound = filtered.reduce((s, r) => s + r.outQty, 0)

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
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Stock Availability</h1>
            <p className="mt-1 text-sm text-slate-500">Laporan real-time ketersediaan barang di gudang</p>
          </div>
          <button
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
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Pilih Gudang</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[240px]"
              >
                {warehouses.length === 0 && <option value="">Memuat gudang...</option>}
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-500 px-2 py-2">
                <span className="loading loading-spinner loading-xs text-indigo-500" />
                Memuat data stok...
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {hasRun && !loading && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 shadow-sm relative overflow-hidden">
              <div className="relative z-10">
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-600">Fisik di Gudang</p>
                <p className="text-3xl font-bold text-indigo-700">{totalPhysical.toLocaleString("id-ID")}</p>
                <p className="mt-1 text-[10px] text-indigo-500 font-medium">Berdasarkan total fisik nyata</p>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm relative">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-600">Reserved (Pesanan)</p>
              <p className="text-3xl font-bold text-amber-700">{totalReserved.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-[10px] text-amber-500 font-medium">Sudah dipesan, belum dikirim</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm relative">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-600">Tersedia utk Dijual</p>
              <p className="text-3xl font-bold text-emerald-700">{totalAvailable.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-[10px] text-emerald-500 font-medium">Fisik dikurangi Reserved</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 shadow-sm relative">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-rose-600">Total Outbound</p>
              <p className="text-3xl font-bold text-rose-700">{totalOutbound.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-[10px] text-rose-500 font-medium">Jumlah yang sudah keluar/terjual</p>
            </div>
          </div>
        )}

        {/* Table card */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden min-h-[400px]">
          {hasRun && !loading && (
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <span className="text-sm font-medium text-slate-600">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
              <input
                type="search"
                placeholder="Cari nama, kode, kategori…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-72 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <span className="loading loading-spinner loading-lg text-indigo-500" />
                <span className="text-sm text-slate-500 font-medium">Menyesuaikan kalkulasi stok...</span>
              </div>
            </div>
          ) : !hasRun ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="mb-4 size-16 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              <p className="font-semibold text-slate-500">Pilih gudang untuk melihat stok tersedia</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Tidak ada produk yang cocok dengan pencarian Anda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 w-24">Kode</th>
                    <th className="px-5 py-4">Nama Produk</th>
                    <th className="px-5 py-4 w-32">Kategori</th>
                    <th className="px-5 py-4 w-24 text-center">Satuan</th>
                    <th className="px-5 py-4 w-32 text-center bg-indigo-50/50 text-indigo-800">
                      Fisik Gudang
                    </th>
                    <th className="px-5 py-4 w-32 text-center bg-amber-50/50 text-amber-800">
                      Reserved
                    </th>
                    <th className="px-5 py-4 w-32 text-center bg-emerald-50/50 text-emerald-800">
                      Tersedia Jual
                    </th>
                    <th className="px-5 py-4 w-32 text-center bg-rose-50/50 text-rose-800">
                      Total Out
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{row.itemCode ?? "-"}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{row.productName}</td>
                      <td className="px-5 py-4">
                        {row.category
                          ? <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{row.category}</span>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-center text-slate-500 font-medium">{row.warehouseUnit || row.saleUnit || "-"}</td>

                      <td className="px-5 py-4 text-center bg-indigo-50/20">
                        <span className="font-bold text-indigo-700 text-base">{row.physicalStock.toLocaleString("id-ID")}</span>
                      </td>
                      <td className="px-5 py-4 text-center bg-amber-50/20">
                        <span className={`font-semibold ${row.reserved > 0 ? "text-amber-600" : "text-slate-300"}`}>
                          {row.reserved.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center bg-emerald-50/30">
                        <span className={`inline-flex items-center justify-center min-w-[3rem] rounded-full px-3 py-1 font-bold ${row.available <= 0 ? "bg-red-100 text-red-700"
                            : row.available <= 5 ? "bg-orange-100 text-orange-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                          {row.available.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center bg-rose-50/20">
                        <span className={`font-semibold ${row.outQty > 0 ? "text-rose-600" : "text-slate-300"}`}>
                          {row.outQty.toLocaleString("id-ID")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <tr>
                    <td colSpan={4} className="px-5 py-4 text-right">TOTAL</td>
                    <td className="px-5 py-4 text-center text-indigo-700 text-base">{totalPhysical.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-4 text-center text-amber-700 text-base">{totalReserved.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-4 text-center text-emerald-700 text-base">{totalAvailable.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-4 text-center text-rose-700 text-base">{totalOutbound.toLocaleString("id-ID")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Print View ──────────────────────────────────────────────────────── */}
      <div className="hidden print:block text-black bg-white absolute top-0 left-0 w-full min-h-screen z-50 p-8">
        <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
          <p className="text-2xl font-bold uppercase tracking-widest text-slate-900">Stock Availability</p>
          <p className="text-sm text-slate-700 mt-2 font-medium">Gudang: <span className="font-bold">{warehouseLabel}</span></p>
          <p className="text-xs text-slate-500 mt-1">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Fisik Gudang", value: totalPhysical.toLocaleString("id-ID"), color: "text-indigo-800" },
            { label: "Reserved", value: totalReserved.toLocaleString("id-ID"), color: "text-amber-800" },
            { label: "Tersedia Jual", value: totalAvailable.toLocaleString("id-ID"), color: "text-emerald-800" },
            { label: "Total Outbound", value: totalOutbound.toLocaleString("id-ID"), color: "text-rose-800" },
          ].map(c => (
            <div key={c.label} className="border-2 border-slate-200 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-slate-800 font-bold text-left bg-slate-100">
              <th className="py-2.5 px-3 uppercase tracking-wider text-slate-700">Kode</th>
              <th className="py-2.5 px-3 uppercase tracking-wider text-slate-700">Nama Produk</th>
              <th className="py-2.5 px-3 uppercase tracking-wider text-slate-700 text-center">Satuan</th>
              <th className="py-2.5 px-3 text-center uppercase tracking-wider text-indigo-900">Fisik</th>
              <th className="py-2.5 px-3 text-center uppercase tracking-wider text-amber-900">Reserved</th>
              <th className="py-2.5 px-3 text-center uppercase tracking-wider text-emerald-900">Tersedia</th>
              <th className="py-2.5 px-3 text-center uppercase tracking-wider text-rose-900">Out</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row._id} className={`border-b border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                <td className="py-2 px-3 font-mono text-slate-500">{row.itemCode ?? "-"}</td>
                <td className="py-2 px-3 font-semibold text-slate-800">{row.productName}</td>
                <td className="py-2 px-3 text-center text-slate-600 font-medium">{row.warehouseUnit || row.saleUnit || "-"}</td>

                <td className="py-2 px-3 text-center font-bold text-indigo-900">{row.physicalStock.toLocaleString("id-ID")}</td>
                <td className="py-2 px-3 text-center font-medium text-amber-900">{row.reserved > 0 ? row.reserved.toLocaleString("id-ID") : "0"}</td>
                <td className="py-2 px-3 text-center font-bold text-emerald-900">{row.available.toLocaleString("id-ID")}</td>
                <td className="py-2 px-3 text-center font-medium text-rose-900">{row.outQty > 0 ? row.outQty.toLocaleString("id-ID") : "0"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-800 font-bold bg-slate-100">
              <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-widest text-slate-700">Total</td>
              <td className="py-3 px-3 text-center text-indigo-900">{totalPhysical.toLocaleString("id-ID")}</td>
              <td className="py-3 px-3 text-center text-amber-900">{totalReserved.toLocaleString("id-ID")}</td>
              <td className="py-3 px-3 text-center text-emerald-900">{totalAvailable.toLocaleString("id-ID")}</td>
              <td className="py-3 px-3 text-center text-rose-900">{totalOutbound.toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-16 flex justify-end">
          <div className="text-center w-48">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Diperiksa oleh</p>
            <div className="mt-16 border-t-2 border-slate-800 pt-2 text-xs font-bold text-slate-800">
              ( <span className="inline-block w-32 border-b border-dashed border-slate-400 mx-2"></span> )
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
