"use client"

import { useState, useEffect, useRef } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type Warehouse = { _id: string; name: string; code: string }
type Product = { _id: string; productName: string; productId: string; available: number; warehouseUnit?: string; saleUnit?: string }
type AdjustEntry = {
  _id: string
  date: string
  qty: number
  reason: string
  note: string
  status: string
  storedBackQty?: number
  product: { _id: string; productName: string; productId: string } | null
  warehouse: { _id: string; name: string; code: string } | null
  approver: { _id: string; name: string } | null
  creator: { _id: string; name: string } | null
}

const REASONS: Record<string, { label: string; color: string; bg: string }> = {
  SHRINKAGE: { label: "Shrinkage", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  DAMAGE: { label: "Damage", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  EXPIRED: { label: "Expired", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  OTHER: { label: "Other", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
}

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`
}
function firstOfMonthStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`
}
function fmtDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdjustmentsPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const userId = useAuth((s) => s.userId)

  // ── Data state ──
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [logs, setLogs] = useState<AdjustEntry[]>([])

  // ── Filter state ──
  const [warehouseId, setWarehouseId] = useState("")
  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [search, setSearch] = useState("")

  // ── Form state (Add) ──
  const [formProductId, setFormProductId] = useState("")
  const [formQty, setFormQty] = useState("")
  const [formReason, setFormReason] = useState("SHRINKAGE")
  const [formNote, setFormNote] = useState("")
  const [formApprovalCode, setFormApprovalCode] = useState("")

  // Modals state for Edit/Store Back
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStoreBackModal, setShowStoreBackModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AdjustEntry | null>(null)

  const [editQty, setEditQty] = useState("")
  const [editApprovalCode, setEditApprovalCode] = useState("")
  const [storeBackQty, setStoreBackQty] = useState("")
  const [storeBackApprovalCode, setStoreBackApprovalCode] = useState("")

  // ── UI state ──
  const [loadingWH, setLoadingWH] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const autoFiredRef = useRef(false)

  // ── Effects ──
  useEffect(() => {
    if (!hasHydrated || !loggedIn || !masterAccountId) return
    setLoadingWH(true)
    fetch(`/api/web/warehouse?id=${masterAccountId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error && d.result?.length > 0) {
          setWarehouses(d.result)
          setWarehouseId(d.result[0]._id)
        }
      })
      .finally(() => setLoadingWH(false))
  }, [hasHydrated, loggedIn, masterAccountId])

  useEffect(() => {
    if (!warehouseId || autoFiredRef.current) return
    autoFiredRef.current = true
    loadAll(warehouseId, startDate, endDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId])

  // ── Auth guard ──
  if (!hasHydrated) return null
  if (!loggedIn) {
    if (typeof window !== 'undefined') router.push("/login")
    return null
  }

  // ── Functions ──
  function loadAll(wId: string, sd: string, ed: string) {
    loadLogs(wId, sd, ed)
    loadProducts(wId)
  }

  function loadLogs(wId: string, sd: string, ed: string) {
    if (!wId) return
    setLoadingLogs(true)
    fetch(`/api/web/adjust?warehouseId=${wId}&startDate=${sd}&endDate=${ed}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setLogs(d.result ?? []) })
      .finally(() => setLoadingLogs(false))
  }

  function loadProducts(wId: string) {
    if (!wId) return
    setLoadingProducts(true)
    setProducts([])
    fetch(`/api/web/adjust/products?id=${masterAccountId}&warehouseId=${wId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setProducts(d.result ?? []) })
      .finally(() => setLoadingProducts(false))
  }

  function handleWarehouseChange(wId: string) {
    setWarehouseId(wId)
    setFormProductId("")
    loadAll(wId, startDate, endDate)
  }

  function handleFilter() {
    loadLogs(warehouseId, startDate, endDate)
  }

  function openAddModal() {
    setFormProductId("")
    setFormQty("")
    setFormReason("SHRINKAGE")
    setFormNote("")
    setFormApprovalCode("")
    setSubmitError("")
    loadProducts(warehouseId)
    setShowModal(true)
  }

  function openEditModalAction(log: AdjustEntry) {
    setSelectedLog(log)
    setEditQty(String(log.qty))
    setEditApprovalCode("")
    setSubmitError("")
    setShowEditModal(true)
  }

  function openStoreBackModalAction(log: AdjustEntry) {
    setSelectedLog(log)
    setStoreBackQty("")
    setStoreBackApprovalCode("")
    setSubmitError("")
    setShowStoreBackModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError("")

    if (!formApprovalCode.trim()) {
      setSubmitError("Approval Code diperlukan.")
      return
    }
    if (!formQty || Number(formQty) <= 0) {
      setSubmitError("Jumlah harus lebih dari 0.")
      return
    }
    if (!warehouseId || !formProductId) {
      setSubmitError("Pilih gudang dan produk terlebih dahulu.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/web/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          productId: formProductId,
          qty: Number(formQty),
          reason: formReason,
          note: formNote,
          approvalCode: formApprovalCode,
          userId
        }),
      })

      const data = await res.json()
      if (data.error) {
        setSubmitError(data.message || "Gagal menyimpan.")
      } else {
        setShowModal(false)
        setSuccessMsg("Adjustment berhasil dicatat.")
        setTimeout(() => setSuccessMsg(""), 4000)
        loadLogs(warehouseId, startDate, endDate)
      }
    } catch (err: unknown) {
      setSubmitError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError("")
    if (!selectedLog) return
    const n = Number(editQty)
    if (!n || n <= 0) {
      setSubmitError("Qty harus lebih dari 0.")
      return
    }
    if (!editApprovalCode) {
      setSubmitError("Kode approval diperlukan.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/web/adjust/${selectedLog._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterAccountId,
          action: "edit",
          newQty: n,
          approvalCode: editApprovalCode,
          userId
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.message)
      setShowEditModal(false)
      setSuccessMsg(data.message || "Berhasil mengubah quantity.")
      setTimeout(() => setSuccessMsg(""), 4000)
      loadLogs(warehouseId, startDate, endDate)
    } catch (err: any) {
      setSubmitError(err.message || "Gagal mengubah.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStoreBackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError("")
    if (!selectedLog) return
    const n = Number(storeBackQty)
    if (!n || n <= 0) {
      setSubmitError("Qty store back harus lebih dari 0.")
      return
    }
    const remain = selectedLog.qty - (selectedLog.storedBackQty || 0)
    if (n > remain) {
      setSubmitError(`Qty melebihi maksimal yang bisa dikembalikan (${remain}).`)
      return
    }
    if (!storeBackApprovalCode) {
      setSubmitError("Kode approval diperlukan.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/web/adjust/${selectedLog._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterAccountId,
          action: "store_back",
          storeBackQty: n,
          approvalCode: storeBackApprovalCode,
          userId
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.message)
      setShowStoreBackModal(false)
      setSuccessMsg(data.message || "Berhasil menyimpannya kembali.")
      setTimeout(() => setSuccessMsg(""), 4000)
      loadLogs(warehouseId, startDate, endDate)
    } catch (err: any) {
      setSubmitError(err.message || "Gagal melakukan store back.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived ──
  const filtered = search.trim()
    ? logs.filter(l =>
      l.product?.productName.toLowerCase().includes(search.toLowerCase()) ||
      l.product?.productId?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason.toLowerCase().includes(search.toLowerCase()) ||
      l.approver?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.creator?.name?.toLowerCase().includes(search.toLowerCase())
    )
    : logs

  const selectedProduct = products.find(p => p._id === formProductId)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-6">

      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Warehouse Adjust</h1>
          </div>
          <p className="ml-13 text-sm text-slate-500">Pencatatan penyusutan/penyesuaian stok gudang</p>
        </div>
        <button
          id="btn-add-adjust-item"
          onClick={openAddModal}
          disabled={!warehouseId}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 active:scale-95 disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Tambah Adjust Entry
        </button>
      </div>

      {/* ── Success Banner ── */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* ── Filter Card ── */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Log</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Gudang</label>
            {loadingWH ? (
              <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-100" />
            ) : (
              <select
                id="select-warehouse"
                value={warehouseId}
                onChange={e => handleWarehouseChange(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[200px]"
              >
                {warehouses.length === 0 && <option value="">Tidak ada gudang</option>}
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Tanggal Mulai</label>
            <input id="input-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
            <input id="input-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <button id="btn-filter-log" onClick={handleFilter} disabled={loadingLogs}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-slate-900 active:scale-95 disabled:opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            Tampilkan
          </button>
        </div>
      </div>

      {/* ── Summary Chips ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Entri", value: filtered.length, color: "text-slate-800", bg: "bg-white border-slate-100" },
          { label: "Total Penyusutan", value: filtered.reduce((s, l) => s + l.qty, 0).toLocaleString("id-ID"), color: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
          { label: "Shrinkage", value: filtered.filter(l => l.reason === "SHRINKAGE").length, color: "text-amber-700", bg: "bg-amber-50 border-amber-100" },
          { label: "Damage / Expired", value: filtered.filter(l => l.reason === "DAMAGE" || l.reason === "EXPIRED").length, color: "text-rose-700", bg: "bg-rose-50 border-rose-100" },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border p-4 shadow-sm ${c.bg}`}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Log Table ── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <span className="text-sm text-slate-500">{filtered.length} catatan</span>
          <input type="search" placeholder="Cari produk, alasan, nama…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-60 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300" />
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-20">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="mb-4 size-16 text-slate-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="font-semibold">Belum ada catatan penyusutan</p>
            <p className="mt-1 text-xs text-slate-300">Klik &ldquo;Tambah Adjust Entry&rdquo; untuk merekam penyusutan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Tanggal</th>
                  <th className="px-5 py-3 text-left">Produk</th>
                  <th className="px-5 py-3 text-center bg-orange-50 text-orange-700">Susut</th>
                  <th className="px-5 py-3 text-left">Alasan</th>
                  <th className="px-5 py-3 text-left">Catatan</th>
                  <th className="px-5 py-3 text-left">Diminta Oleh</th>
                  <th className="px-5 py-3 text-left">Disetujui Oleh</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((log) => {
                  const r = REASONS[log.reason] ?? REASONS.OTHER
                  return (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.date)}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{log.product?.productName ?? "—"}</p>
                        {log.product?.productId && (
                          <p className="text-[11px] font-mono text-slate-400">{log.product.productId}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center bg-orange-50/40">
                        <span className="font-bold text-orange-700">-{log.qty - (log.storedBackQty ?? 0)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${r.color} ${r.bg}`}>
                          {r.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-xs">{log.note || "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-slate-700">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 text-slate-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          <span className="text-sm">{log.creator?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 text-indigo-700 font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{log.approver?.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {log.status !== "STORED_BACK" ? (
                            <>
                              <button
                                onClick={() => openEditModalAction(log)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-600 transition-colors"
                                title="Edit Qty"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openStoreBackModalAction(log)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                                title="Return to Warehouse (Store Back)"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold uppercase text-slate-400 border border-slate-200 rounded-full px-2 py-0.5" title="Fully Stored Back">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-bold text-slate-800">Tambah Adjust Entry</h2>
                  <p className="text-xs text-slate-400">Catat penyusutan stok fisik</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form id="form-adjust-item" onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Gudang</p>
                <p className="text-sm font-semibold text-slate-700">
                  {warehouses.find(w => w._id === warehouseId)?.name ?? "—"}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  Produk <span className="text-rose-500">*</span>
                </label>
                {loadingProducts ? (
                  <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ) : (
                  <select id="select-product" value={formProductId} onChange={e => setFormProductId(e.target.value)} required
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="">— Pilih Produk —</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.productName} {p.productId ? `(${p.productId})` : ""} — Stok: {p.available}
                      </option>
                    ))}
                  </select>
                )}
                {products.length === 0 && !loadingProducts && (
                  <p className="text-xs text-amber-600 mt-0.5">Tidak ada produk dengan stok tersedia di gudang ini.</p>
                )}
                {selectedProduct && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Stok tersedia: <strong>{selectedProduct.available}</strong> {selectedProduct.warehouseUnit || selectedProduct.saleUnit || ""}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Alasan <span className="text-rose-500">*</span></label>
                  <select id="select-reason" value={formReason} onChange={e => setFormReason(e.target.value)} required
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="SHRINKAGE">Shrinkage (Susut)</option>
                    <option value="DAMAGE">Damage (Rusak)</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Jumlah Susut <span className="text-rose-500">*</span></label>
                  <input id="input-qty" type="number" min="1" required value={formQty}
                    onChange={e => setFormQty(e.target.value)} placeholder="0"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Catatan <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input id="input-note" type="text" value={formNote} onChange={e => setFormNote(e.target.value)}
                  placeholder="Keterangan tambahan..."
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>

              <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 mt-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                  <span>Approval Code (PIN) <span className="text-rose-500">*</span></span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-3.5 text-orange-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </label>
                <input id="input-approval-code" type="password" required value={formApprovalCode}
                  onChange={e => setFormApprovalCode(e.target.value)} placeholder="Masukkan PIN SPV"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono tracking-widest text-black focus:outline-none focus:ring-2 focus:ring-orange-300 bg-orange-50/30" />
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4 mt-0.5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  {submitError}
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-xs text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Tercatat otomatis sebagai Outbound
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} disabled={submitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                  Batal
                </button>
                <button id="btn-confirm-adjust" type="submit" disabled={submitting}
                  className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-60 bg-orange-600 shadow-orange-200 hover:bg-orange-700">
                  {submitting ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                  Record Adjust
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEditModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Edit Qty Adjust</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 flex flex-col gap-4">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 mb-0.5">PRODUK</p>
                <p className="text-sm font-semibold text-slate-700">{selectedLog.product?.productName}</p>
                <p className="text-xs text-slate-500 mt-1">Qty Sebelumnya: <strong className="text-orange-600">{selectedLog.qty}</strong></p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Qty Baru</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editQty}
                  onChange={e => setEditQty(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Approval Code (Supervisor)</label>
                <input
                  type="password"
                  required
                  value={editApprovalCode}
                  onChange={e => setEditApprovalCode(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {submitError && (
                <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700">{submitError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-60">
                  {submitting ? "Menyimpan..." : "Simpan Qty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Store Back Modal ── */}
      {showStoreBackModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Store Back (Retur ke Gudang)</h2>
              <button onClick={() => setShowStoreBackModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleStoreBackSubmit} className="p-6 flex flex-col gap-4">
              <div className="rounded-xl bg-indigo-50 px-4 py-3">
                <p className="text-[10px] font-bold text-indigo-400 mb-0.5">PRODUK</p>
                <p className="text-sm font-semibold text-indigo-900">{selectedLog.product?.productName}</p>
                <p className="text-xs text-indigo-700 mt-1">Sisa belum retur: <strong>{selectedLog.qty - (selectedLog.storedBackQty || 0)}</strong></p>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Qty untuk Retur</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedLog.qty - (selectedLog.storedBackQty || 0)}
                  value={storeBackQty}
                  onChange={e => setStoreBackQty(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600">Approval Code (Supervisor)</label>
                <input
                  type="password"
                  required
                  value={storeBackApprovalCode}
                  onChange={e => setStoreBackApprovalCode(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {submitError && (
                <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700">{submitError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowStoreBackModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60">
                  {submitting ? "Menyimpan..." : "Mulai Store Back"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
