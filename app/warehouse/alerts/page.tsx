"use client"

import { useState, useEffect, useRef } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

type AlertRow = {
  _id: string
  productName: string
  productId: string
  category: string
  conversionRatioX: string
  reorderPoint: number
  safetyStock: number
  availableStock: number
  availableForSale: number
  alertLevel: 'warning' | 'critical'
}

type Warehouse = {
  _id: string
  name: string
  code: string
}

export default function StockAlerts() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState("")
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [hasRun, setHasRun] = useState(false)
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
    runCheck(warehouseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  function runCheck(wId: string) {
    if (!wId) { alert("Pilih gudang terlebih dahulu."); return }
    setLoading(true)
    setAlerts([])
    const url = `/api/web/inventory/alerts?id=${masterAccountId}&warehouseId=${wId}`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setAlerts(data.result ?? [])
          setHasRun(true)
        } else {
          alert(data.message || "Gagal memuat alert")
        }
      })
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }

  const filtered = search.trim()
    ? alerts.filter(a =>
      a.productName.toLowerCase().includes(search.toLowerCase()) ||
      a.productId.toLowerCase().includes(search.toLowerCase()) ||
      (a.category ?? "").toLowerCase().includes(search.toLowerCase())
    )
    : alerts

  const criticalCount = alerts.filter(a => a.alertLevel === 'critical').length
  const warningCount = alerts.filter(a => a.alertLevel === 'warning').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <span className="text-3xl">🔔</span> Peringatan Level Stok
          </h1>
          <p className="mt-1 text-sm text-slate-500">Produk yang stoknya berada di bawah batas Reorder Point atau Safety Stock</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Gudang</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Gudang</label>
            <select
              value={warehouseId}
              onChange={e => { setWarehouseId(e.target.value); setHasRun(false); setAlerts([]) }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-300 min-w-[200px]"
            >
              {warehouses.length === 0 && <option value="">Memuat...</option>}
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => runCheck(warehouseId)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-800 active:scale-95 disabled:opacity-60"
          >
            {loading
              ? <span className="loading loading-spinner loading-xs" />
              : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            }
            Periksa
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {hasRun && !loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Total Peringatan</p>
            <p className="text-3xl font-bold text-slate-800">{alerts.length}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-600">🚨 Kritis (Safety Stock)</p>
            <p className="text-3xl font-bold text-red-700">{criticalCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-600">⚠ Peringatan (Reorder Point)</p>
            <p className="text-3xl font-bold text-amber-700">{warningCount}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {hasRun && !loading && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="text-sm text-slate-500">{filtered.length} produk</span>
            <input
              type="search"
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg text-red-600" />
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <span className="text-6xl mb-4">🔔</span>
            <p className="font-semibold">Pilih gudang lalu klik <span className="text-red-700">Periksa</span></p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <span className="text-6xl mb-4">✅</span>
            <p className="font-semibold text-lg text-emerald-700">Semua stok dalam kondisi aman!</p>
            <p className="text-sm text-slate-400 mt-1">Tidak ada produk yang berada di bawah batas yang ditentukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Produk</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">SKU</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Kategori</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Stok Tersedia</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Siap Jual</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Safety Stock</th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Reorder Point</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a._id}
                    className={`border-b border-slate-50 transition-colors ${
                      a.alertLevel === 'critical'
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    <td className="px-6 py-4">
                      {a.alertLevel === 'critical' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          🚨 Kritis
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          ⚠ Peringatan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{a.productName}</td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{a.productId}</td>
                    <td className="px-6 py-4 text-slate-600">{a.category || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold text-base ${a.alertLevel === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                        {a.availableStock.toLocaleString('id-ID')}
                      </span>
                      {a.conversionRatioX && <span className="text-xs text-slate-400 ml-1">{a.conversionRatioX}</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {a.availableForSale.toLocaleString('id-ID')}
                      {a.conversionRatioX && <span className="text-xs text-slate-400 ml-1">{a.conversionRatioX}</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {a.safetyStock > 0 ? a.safetyStock.toLocaleString('id-ID') : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {a.reorderPoint.toLocaleString('id-ID')}
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
