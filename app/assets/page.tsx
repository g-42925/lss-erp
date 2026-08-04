"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import useAuth from "@/store/auth"

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetCategory = { _id: string; name: string }

type Asset = {
  _id: string
  name: string
  category: AssetCategory | null
  addedAt: string
  condition: "good" | "fair" | "poor" | "damaged"
  status: "active" | "inactive" | "disposed" | "under_maintenance"
  desc?: string
}

// ─── Enums ───────────────────────────────────────────────────────────────────
const CONDITION_OPTIONS = [
  { value: "good", label: "Good", color: "bg-emerald-100 text-emerald-700" },
  { value: "fair", label: "Fair", color: "bg-blue-100 text-blue-700" },
  { value: "poor", label: "Poor", color: "bg-amber-100 text-amber-700" },
  { value: "damaged", label: "Damaged", color: "bg-rose-100 text-rose-700" },
]

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "inactive", label: "Inactive", color: "bg-slate-100 text-slate-600" },
  { value: "under_maintenance", label: "Maintenance", color: "bg-amber-100 text-amber-700" },
  { value: "disposed", label: "Disposed", color: "bg-rose-100 text-rose-700" },
]

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

function Badge({ value, options }: { value: string; options: { value: string; label: string; color: string }[] }) {
  const opt = options.find(o => o.value === value)
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${opt?.color ?? "bg-slate-100 text-slate-600"}`}>
      {opt?.label ?? value}
    </span>
  )
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10 text-violet-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      </div>
      <p className="text-slate-500 font-semibold">Belum ada asset terdaftar</p>
      <p className="text-slate-400 text-sm text-center max-w-xs">Mulai dengan menambahkan asset perusahaan pertama Anda</p>
      <button
        onClick={onAdd}
        className="mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all shadow-md"
      >
        + Tambah Asset
      </button>
    </div>
  )
}

export default function AssetsPage() {
  const router = useRouter()
  const hasHydrated = useAuth(s => s._hasHydrated)
  const loggedIn = useAuth(s => s.loggedIn)
  const masterAccountId = useAuth(s => s.masterAccountId)

  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterCondition, setFilterCondition] = useState("")
  const [filterCategory, setFilterCategory] = useState("")

  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Asset | null>(null)

  const [catName, setCatName] = useState("")
  const [catSaving, setCatSaving] = useState("")
  const [assetSaving, setAssetSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [assetForm, setAssetForm] = useState({
    name: "", category: "", addedAt: new Date().toISOString().slice(0, 10),
    condition: "good", status: "active", desc: ""
  })

  const fetchAll = useCallback(async () => {
    if (!masterAccountId) return
    setLoading(true)
    try {
      const [asRes, catRes] = await Promise.all([
        fetch(`/api/web/assets?id=${masterAccountId}`),
        fetch(`/api/web/asset-categories?id=${masterAccountId}`)
      ])
      const [aj, cj] = await Promise.all([asRes.json(), catRes.json()])
      if (!aj.error) setAssets(aj.result ?? [])
      if (!cj.error) setCategories(cj.result ?? [])
    } finally {
      setLoading(false)
    }
  }, [masterAccountId])

  useEffect(() => {
    if (hasHydrated && loggedIn) fetchAll()
  }, [hasHydrated, loggedIn, fetchAll])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  const filtered = assets.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || a.name.toLowerCase().includes(q) || (a.desc ?? "").toLowerCase().includes(q)
    const matchStatus = !filterStatus || a.status === filterStatus
    const matchCond = !filterCondition || a.condition === filterCondition
    const matchCat = !filterCategory || a.category?._id === filterCategory
    return matchSearch && matchStatus && matchCond && matchCat
  })

  async function handleAddCategory() {
    if (!catName.trim()) return
    setCatSaving("saving")
    const res = await fetch("/api/web/asset-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), masterAccountId })
    })
    const j = await res.json()
    if (!j.error) {
      setCategories(prev => [...prev, j.result])
      setCatName("")
      setCatSaving("done")
      setTimeout(() => setCatSaving(""), 1500)
    } else {
      setCatSaving("error")
    }
  }

  async function handleDeleteCategory(id: string) {
    await fetch(`/api/web/asset-categories?id=${id}`, { method: "DELETE" })
    setCategories(prev => prev.filter(c => c._id !== id))
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    if (!assetForm.name.trim()) { setFormError("Nama asset wajib diisi"); return }
    if (!assetForm.category) { setFormError("Pilih kategori asset"); return }
    setAssetSaving(true)
    const res = await fetch("/api/web/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...assetForm, masterAccountId })
    })
    const j = await res.json()
    setAssetSaving(false)
    if (!j.error) {
      setAssets(prev => [j.result, ...prev])
      setShowAddAsset(false)
      setAssetForm({ name: "", category: "", addedAt: new Date().toISOString().slice(0, 10), condition: "good", status: "active", desc: "" })
    } else {
      setFormError(j.message)
    }
  }

  async function handleDeleteAsset(id: string) {
    await fetch(`/api/web/assets?id=${id}`, { method: "DELETE" })
    setAssets(prev => prev.filter(a => a._id !== id))
    setDeleteConfirm(null)
  }

  const activeCount = assets.filter(a => a.status === "active").length
  const goodCount = assets.filter(a => a.condition === "good").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-violet-50/30 text-slate-800">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 leading-tight">Asset Perusahaan</h1>
          <p className="text-xs text-slate-400">{assets.length} asset terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategories(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Kategori
          </button>
          <button
            onClick={() => { setShowAddAsset(true); setFormError("") }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Tambah Asset
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Asset", value: assets.length, icon: "📦", grad: "from-violet-600 to-purple-700" },
            { label: "Aktif", value: activeCount, icon: "✅", grad: "from-emerald-500 to-teal-600" },
            { label: "Kondisi Baik", value: goodCount, icon: "🌟", grad: "from-amber-500 to-orange-500" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-5 text-white bg-gradient-to-br ${s.grad} shadow-md relative overflow-hidden`}>
              <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-white/10" />
              <p className="text-3xl mb-1">{s.icon}</p>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">{s.label}</p>
              <p className="text-2xl font-extrabold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px] relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Cari nama atau deskripsi..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-slate-50"
              />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50 text-slate-700">
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50 text-slate-700">
              <option value="">Semua Status</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50 text-slate-700">
              <option value="">Semua Kondisi</option>
              {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {(search || filterStatus || filterCondition || filterCategory) && (
              <button onClick={() => { setSearch(""); setFilterStatus(""); setFilterCondition(""); setFilterCategory("") }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Asset Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 grid gap-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onAdd={() => { setShowAddAsset(true); setFormError("") }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">Nama Asset</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">Kategori</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">Ditambahkan</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">Kondisi</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400 hidden md:table-cell">Deskripsi</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(asset => (
                    <tr key={asset._id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{asset.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-violet-700 bg-violet-50 rounded-full px-2.5 py-0.5 font-medium">
                          {asset.category?.name ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(asset.addedAt)}</td>
                      <td className="px-4 py-3.5">
                        <Badge value={asset.condition} options={CONDITION_OPTIONS} />
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge value={asset.status} options={STATUS_OPTIONS} />
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{asset.desc || "—"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setDeleteConfirm(asset)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 hover:bg-rose-50 text-rose-400 hover:text-rose-600"
                          title="Hapus"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400">
                Menampilkan {filtered.length} dari {assets.length} asset
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Asset */}
      <Modal open={showAddAsset} onClose={() => setShowAddAsset(false)} title="Tambah Asset Baru">
        <form onSubmit={handleAddAsset} className="space-y-4">
          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Asset <span className="text-rose-400">*</span></label>
              <input
                type="text"
                value={assetForm.name}
                onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Laptop Dell XPS 15"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-slate-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori <span className="text-rose-400">*</span></label>
              <div className="flex gap-2">
                <select
                  value={assetForm.category}
                  onChange={e => setAssetForm(f => ({ ...f, category: e.target.value }))}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
                  required
                >
                  <option value="">Pilih kategori...</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  title="Tambah kategori baru"
                  className="rounded-xl border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 px-2.5 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Penambahan <span className="text-rose-400">*</span></label>
              <input
                type="date"
                value={assetForm.addedAt}
                onChange={e => setAssetForm(f => ({ ...f, addedAt: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-slate-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kondisi <span className="text-rose-400">*</span></label>
              <select
                value={assetForm.condition}
                onChange={e => setAssetForm(f => ({ ...f, condition: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
              >
                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status <span className="text-rose-400">*</span></label>
              <select
                value={assetForm.status}
                onChange={e => setAssetForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deskripsi</label>
              <textarea
                value={assetForm.desc}
                onChange={e => setAssetForm(f => ({ ...f, desc: e.target.value }))}
                placeholder="Keterangan tambahan asset (opsional)..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-slate-50 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddAsset(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={assetSaving}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all disabled:opacity-60 shadow-md"
            >
              {assetSaving ? "Menyimpan..." : "Simpan Asset"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Category (from inside add asset form) */}
      <Modal open={showAddCategory} onClose={() => { setShowAddCategory(false); setCatName(""); setCatSaving("") }} title="Tambah Kategori">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Kategori</label>
            <input
              type="text"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddCategory() }}
              placeholder="Contoh: Elektronik, Kendaraan..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-slate-50"
            />
          </div>
          {catSaving === "done" && <p className="text-emerald-600 text-sm">Kategori berhasil ditambahkan!</p>}
          {catSaving === "error" && <p className="text-rose-600 text-sm">Gagal menyimpan kategori.</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowAddCategory(false); setCatName(""); setCatSaving("") }}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Selesai
            </button>
            <button
              onClick={handleAddCategory}
              disabled={catSaving === "saving" || !catName.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm font-semibold text-white hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {catSaving === "saving" ? "Menyimpan..." : "+ Tambah"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Manage Categories */}
      <Modal open={showCategories} onClose={() => setShowCategories(false)} title="Kelola Kategori Asset">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddCategory() }}
              placeholder="Nama kategori baru..."
              className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
            />
            <button
              onClick={handleAddCategory}
              disabled={catSaving === "saving" || !catName.trim()}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 text-sm font-semibold active:scale-95 transition-all disabled:opacity-60"
            >
              Tambah
            </button>
          </div>
          {catSaving === "done" && <p className="text-emerald-600 text-sm">Kategori berhasil ditambahkan!</p>}
          {catSaving === "error" && <p className="text-rose-600 text-sm">Gagal menyimpan.</p>}
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
            {categories.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">Belum ada kategori</p>
            ) : (
              categories.map(c => (
                <div key={c._id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700">{c.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c._id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded"
                    title="Hapus"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setShowCategories(false)}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
          >
            Tutup
          </button>
        </div>
      </Modal>

      {/* Modal: Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Konfirmasi Hapus">
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
            <p className="text-2xl mb-2">🗑️</p>
            <p className="text-sm text-rose-800 font-medium">Hapus asset <strong>{deleteConfirm?.name}</strong>?</p>
            <p className="text-xs text-rose-600 mt-1">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              onClick={() => deleteConfirm && handleDeleteAsset(deleteConfirm._id)}
              className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-sm font-semibold active:scale-95 transition-all"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
