
"use client"

import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

import { AddCircleHalfDotIcon, Edit03Icon, Delete01Icon } from "@hugeicons/core-free-icons"


import useAuth from "@/store/auth"



// ─── Types ────────────────────────────────────────────────────────────────────

type AssetCategory = {
  _id: string
  name: string
}

type AssetUnit = {
  _id: string
  label: string
  condition: "good" | "fair" | "poor" | "damaged"
  status: "active" | "inactive" | "disposed" | "under_maintenance"
  addedAt: string
  purchaseId?: string
  receivingId?: string
}

type Asset = {
  _id: string
  name: string
  category: AssetCategory | null
  units: AssetUnit[]
  desc?: string
  measurement?: string
  createdAt: string
}

type UnitForm = {
  label: string
  condition: AssetUnit["condition"]
  status: AssetUnit["status"]
  addedAt: string
}


// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: "good", label: "Good", color: "bg-emerald-100 text-emerald-700" },
  { value: "fair", label: "Fair", color: "bg-blue-100 text-blue-700" },
  { value: "poor", label: "Poor", color: "bg-amber-100 text-amber-700" },
  { value: "damaged", label: "Damaged", color: "bg-rose-100 text-rose-700" },
] as const

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "inactive", label: "Inactive", color: "bg-slate-100 text-slate-600" },
  { value: "under_maintenance", label: "Maintenance", color: "bg-amber-100 text-amber-700" },
  { value: "disposed", label: "Disposed", color: "bg-rose-100 text-rose-700" },
] as const

const today = () => new Date().toISOString().slice(0, 10)

const createUnit = (): UnitForm => ({
  label: "",
  condition: "good",
  status: "active",
  addedAt: today()
})

const fmtDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
    : "-"

// ─── Components ───────────────────────────────────────────────────────────────

function Badge({ value, options }: { value: string, options: readonly { value: string; label: string; color: string }[] }) {
  const opt = options.find(o => o.value === value)

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${opt?.color ?? "bg-slate-100 text-slate-600"}`}>
      {opt?.label ?? value}
    </span>
  )
}

function Modal({ open, onClose, title, children }: { open: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
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
      <div className="w-20 h-20 rounded-3xl bg-violet-100 flex items-center justify-center text-4xl">
        📦
      </div>

      <p className="text-slate-500 font-semibold">
        Belum ada asset terdaftar
      </p>

      <p className="text-slate-400 text-sm text-center max-w-xs">
        Mulai dengan menambahkan asset perusahaan pertama Anda
      </p>

      <button
        onClick={onAdd}
        className="mt-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
      >
        + Tambah Asset
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const router = useRouter()

  const hasHydrated = useAuth(s => s._hasHydrated)
  const loggedIn = useAuth(s => s.loggedIn)
  const masterAccountId = useAuth(s => s.masterAccountId)

  // Data
  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [assetUnitCondition, setAssetUnitCondition] = useState<Record<string, string>>({})

  // Modals
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showEditAsset, setShowEditAsset] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Asset | null>(null)
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

  // Saving states
  const [catName, setCatName] = useState("")
  const [catSaving, setCatSaving] = useState("")
  const [assetSaving, setAssetSaving] = useState(false)
  const [editAssetSaving, setEditAssetSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [editFormError, setEditFormError] = useState("")

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [savingUnit, setSavingUnit] = useState(false)

  const [editingUnit, setEditingUnit] = useState<AssetUnit | null>(null)
  const [showEditUnitModal, setShowEditUnitModal] = useState(false)
  const [savingEditUnit, setSavingEditUnit] = useState(false)

  const [unitForm, setUnitForm] = useState<UnitForm>({
    label: "",
    condition: "good",
    status: "active",
    addedAt: new Date().toISOString().slice(0, 10)
  })

  const [editUnitForm, setEditUnitForm] = useState<UnitForm>({
    label: "",
    condition: "good",
    status: "active",
    addedAt: new Date().toISOString().slice(0, 10)
  })

  // Asset form
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: "",
    measurement: "",
    desc: ""
  })

  // Edit Asset form
  const [editAssetForm, setEditAssetForm] = useState({
    name: "",
    category: "",
    measurement: "",
    desc: ""
  })

  const [unitForms, setUnitForms] = useState<UnitForm[]>([
    createUnit()
  ])

  const getLocalDate = () => {
    const date = new Date()
    const offset = date.getTimezoneOffset() * 60000

    return new Date(date.getTime() - offset)
      .toISOString()
      .slice(0, 10)
  }

  const handleAddUnit = async () => {
    if (!selectedAsset) return

    if (!unitForm.label.trim()) {
      alert("Label unit wajib diisi")
      return
    }

    try {
      setSavingUnit(true)

      const response = await fetch("/api/web/assets/units", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          masterAccountId,
          assetId: selectedAsset._id,
          unit: unitForm
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.message || "Gagal menambahkan unit")
      }

      // Perbarui asset yang bersangkutan tanpa fetch ulang seluruh halaman.
      setAssets((prev) =>
        prev.map((asset) =>
          asset._id === data.result._id
            ? data.result
            : asset
        )
      )

      setShowUnitModal(false)
      setSelectedAsset(null)

      setUnitForm({
        label: "",
        condition: "good",
        status: "active",
        addedAt: getLocalDate()
      })
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan")
    } finally {
      setSavingUnit(false)
    }
  }

  const formatInputDate = (d?: string) => {
    if (!d) return getLocalDate()
    try {
      return new Date(d).toISOString().slice(0, 10)
    } catch {
      return getLocalDate()
    }
  }

  const handleOpenEditUnit = (asset: Asset, unit: AssetUnit) => {
    setSelectedAsset(asset)
    setEditingUnit(unit)
    setEditUnitForm({
      label: unit.label,
      condition: unit.condition,
      status: unit.status,
      addedAt: formatInputDate(unit.addedAt)
    })
    setShowEditUnitModal(true)
  }

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset || !editingUnit) return

    if (!editUnitForm.label.trim()) {
      alert("Label unit wajib diisi")
      return
    }

    try {
      setSavingEditUnit(true)

      const response = await fetch("/api/web/assets/units", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          masterAccountId,
          assetId: selectedAsset._id,
          unitId: editingUnit._id,
          unit: editUnitForm
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.message || "Gagal memperbarui unit")
      }

      setAssets((prev) =>
        prev.map((asset) =>
          asset._id === data.result._id
            ? data.result
            : asset
        )
      )

      setShowEditUnitModal(false)
      setEditingUnit(null)
      setSelectedAsset(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan")
    } finally {
      setSavingEditUnit(false)
    }
  }

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!masterAccountId) return

    setLoading(true)

    try {
      const [asRes, catRes] = await Promise.all([
        fetch(`/api/web/assets?id=${masterAccountId}`),
        fetch(`/api/web/asset-categories?id=${masterAccountId}`)
      ])

      const [aj, cj] = await Promise.all([
        asRes.json(),
        catRes.json()
      ])

      if (!asRes.ok || aj.error) {
        throw new Error(aj.message || "Gagal mengambil data asset")
      }

      if (!cj.error) setCategories(cj.result ?? [])

      setAssets(aj.result ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [masterAccountId])

  useEffect(() => {
    if (hasHydrated && loggedIn) fetchAll()
  }, [hasHydrated, loggedIn, fetchAll])

  useEffect(() => {
    if (hasHydrated && !loggedIn) {
      router.push("/login")
    }
  }, [hasHydrated, loggedIn, router])

  // ─── Unit Form Helpers ──────────────────────────────────────────────────────

  function updateUnit(index: number, data: Partial<UnitForm>) {
    setUnitForms(prev =>
      prev.map((unit, i) =>
        i === index ? { ...unit, ...data } : unit
      )
    )
  }

  function addUnit() {
    setUnitForms(prev => [...prev, createUnit()])
  }

  function removeUnit(index: number) {
    setUnitForms(prev => prev.filter((_, i) => i !== index))
  }

  function resetAssetForm() {
    setAssetForm({
      name: "",
      category: "",
      measurement: "",
      desc: ""
    })

    setUnitForms([createUnit()])
    setFormError("")
  }

  // ─── Category ──────────────────────────────────────────────────────────────

  async function handleAddCategory() {
    if (!catName.trim()) return

    setCatSaving("saving")

    try {
      const res = await fetch("/api/web/asset-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          masterAccountId
        })
      })

      const j = await res.json()

      if (!res.ok || j.error) {
        throw new Error(j.message || "Gagal menyimpan kategori")
      }

      setCategories(prev => [...prev, j.result])
      setCatName("")
      setCatSaving("done")
    } catch {
      setCatSaving("error")
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      const res = await fetch(`/api/web/asset-categories?id=${id}`, {
        method: "DELETE"
      })

      const j = await res.json()

      if (!res.ok || j.error) return

      setCategories(prev => prev.filter(c => c._id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  // ─── Create Asset ──────────────────────────────────────────────────────────

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!assetForm.name.trim()) {
      setFormError("Nama asset wajib diisi")
      return
    }

    if (!assetForm.category) {
      setFormError("Pilih kategori asset")
      return
    }

    if (!assetForm.measurement.trim()) {
      setFormError("Satuan asset wajib diisi")
      return
    }

    setAssetSaving(true)

    try {
      const res = await fetch("/api/web/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterAccountId,
          name: assetForm.name.trim(),
          category: assetForm.category,
          measurement: assetForm.measurement.trim(),
          desc: assetForm.desc.trim()
        })
      })

      const j = await res.json()

      if (!res.ok || j.error) {
        throw new Error(j.message || "Gagal menyimpan asset")
      }

      setAssets(prev => [j.result, ...prev])
      setShowAddAsset(false)
      resetAssetForm()

    }
    catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Terjadi kesalahan"
      )
    }
    finally {
      setAssetSaving(false)
    }
  }

  // ─── Edit Asset ────────────────────────────────────────────────────────────

  function handleOpenEdit(asset: Asset) {
    setEditingAsset(asset)
    setEditAssetForm({
      name: asset.name || "",
      category: asset.category?._id || "",
      measurement: asset.measurement || "",
      desc: asset.desc || ""
    })
    setEditFormError("")
    setShowEditAsset(true)
  }

  async function handleUpdateAsset(e: React.FormEvent) {
    e.preventDefault()
    if (!editingAsset) return
    setEditFormError("")

    if (!editAssetForm.name.trim()) {
      setEditFormError("Nama asset wajib diisi")
      return
    }

    if (!editAssetForm.category) {
      setEditFormError("Pilih kategori asset")
      return
    }

    if (!editAssetForm.measurement.trim()) {
      setEditFormError("Satuan asset wajib diisi")
      return
    }

    setEditAssetSaving(true)

    try {
      const res = await fetch("/api/web/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingAsset._id,
          name: editAssetForm.name.trim(),
          category: editAssetForm.category,
          measurement: editAssetForm.measurement.trim(),
          desc: editAssetForm.desc.trim()
        })
      })

      const j = await res.json()

      if (!res.ok || j.error) {
        throw new Error(j.message || "Gagal memperbarui asset")
      }

      setAssets(prev =>
        prev.map(a =>
          a._id === editingAsset._id
            ? { ...a, ...j.result, units: j.result.units ?? a.units }
            : a
        )
      )
      setShowEditAsset(false)
      setEditingAsset(null)
    } catch (e) {
      setEditFormError(
        e instanceof Error ? e.message : "Terjadi kesalahan"
      )
    } finally {
      setEditAssetSaving(false)
    }
  }

  // ─── Delete Asset ──────────────────────────────────────────────────────────

  async function handleDeleteAsset(id: string) {
    try {
      const res = await fetch(`/api/web/assets?id=${id}`, {
        method: "DELETE"
      })

      const j = await res.json()

      if (!res.ok || j.error) {
        throw new Error(j.message || "Gagal menghapus asset")
      }

      setAssets(prev => prev.filter(a => a._id !== id))
      setDeleteConfirm(null)

    } catch (e) {
      console.error(e)
    }
  }

  // ─── Statistics ────────────────────────────────────────────────────────────

  const allUnits = assets.flatMap(asset => asset.units ?? [])

  const totalUnits = allUnits.length

  const activeCount = allUnits.filter(
    unit => unit.status === "active"
  ).length

  const goodCount = allUnits.filter(
    unit => unit.condition === "good"
  ).length

  const damagedCount = allUnits.filter(
    unit => unit.condition === "damaged"
  ).length

  // ─── Filtering ─────────────────────────────────────────────────────────────

  const filtered = assets.filter(asset => {
    const q = search.trim().toLowerCase()

    const matchCategory =
      !filterCategory || asset.category?._id === filterCategory

    if (!matchCategory) return false

    if (q) {
      const matchAsset =
        asset.name.toLowerCase().includes(q) ||
        (asset.desc ?? "").toLowerCase().includes(q)

      const matchUnit = (asset.units ?? []).some(unit =>
        unit.label.toLowerCase().includes(q)
      )

      return matchAsset || matchUnit
    }

    return true
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!hasHydrated || !loggedIn) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-violet-50/30 text-slate-800">

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">
            Asset Perusahaan
          </h1>

          <p className="text-xs text-slate-400">
            {assets.length} jenis asset · {totalUnits} unit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategories(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kategori
          </button>

          <button
            onClick={() => {
              resetAssetForm()
              setShowAddAsset(true)
            }}
            className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 shadow-md"
          >
            + Tambah Asset
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Jenis Asset",
              value: assets.length,
              icon: "📦",
              grad: "from-violet-600 to-purple-700"
            },
            {
              label: "Total Unit",
              value: totalUnits,
              icon: "🗃️",
              grad: "from-blue-500 to-indigo-600"
            },
            {
              label: "Aktif",
              value: activeCount,
              icon: "✅",
              grad: "from-emerald-500 to-teal-600"
            },
            {
              label: "Rusak",
              value: damagedCount,
              icon: "⚠️",
              grad: "from-rose-500 to-red-600"
            }
          ].map(s => (
            <div
              key={s.label}
              className={`rounded-2xl p-5 text-white bg-gradient-to-br ${s.grad} shadow-md relative overflow-hidden`}
            >
              <div className="absolute -right-3 -top-3 w-20 h-20 rounded-full bg-white/10" />

              <p className="text-3xl mb-1">{s.icon}</p>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">
                {s.label}
              </p>
              <p className="text-2xl font-extrabold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Cari nama atau deskripsi asset..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {(search || filterCategory) && (
              <button
                onClick={() => {
                  setSearch("")
                  setFilterCategory("")
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Asset Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 grid gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              onAdd={() => {
                resetAssetForm()
                setShowAddAsset(true)
              }}
            />
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="text-3xl mb-2">🔍</p>
              <p className="font-semibold text-slate-700">Tidak ada asset yang ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                Coba ubah kata kunci pencarian atau pilih kategori lain.
              </p>
              <button
                onClick={() => {
                  setSearch("")
                  setFilterCategory("")
                }}
                className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Nama Asset
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Kategori
                    </th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Total Unit
                    </th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Aktif
                    </th>
                    <th className="text-center px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Kondisi Baik
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400 hidden md:table-cell">
                      Deskripsi
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-400">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {filtered.map(asset => {
                    const units = asset.units ?? []
                    const currentCondition = assetUnitCondition[asset._id] || ""
                    const visibleUnits = units.filter(unit => {
                      if (!currentCondition) return true
                      return unit.condition === currentCondition
                    })

                    const active = units.filter(
                      unit => unit.status === "active"
                    ).length

                    const good = units.filter(
                      unit => unit.condition === "good"
                    ).length

                    const expanded = expandedAsset === asset._id

                    return (
                      <tbody key={asset._id} className="contents">
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div>
                              <p className="font-semibold text-slate-800">
                                {asset.name}
                              </p>

                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedAsset(expanded ? null : asset._id)
                                  }}
                                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
                                >
                                  {expanded ? "Tutup unit ↑" : "Lihat unit ↓"}
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-xs text-violet-700 bg-violet-50 rounded-full px-2.5 py-0.5 font-medium">
                              {asset.category?.name ?? "-"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center font-bold">
                            {units.length}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="text-emerald-600 font-semibold">
                              {active}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className="text-emerald-600 font-semibold">
                              {good}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <p className="text-xs text-slate-400 truncate max-w-[160px]">
                              {asset.desc || "—"}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Tambah Unit"
                                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                onClick={() => {
                                  setSelectedAsset(asset)
                                  setUnitForm({
                                    label: "",
                                    condition: "good",
                                    status: "active",
                                    addedAt: getLocalDate()
                                  })
                                  setShowUnitModal(true)
                                }}
                              >
                                <HugeiconsIcon
                                  icon={AddCircleHalfDotIcon}
                                  size={18}
                                  strokeWidth={1.5}
                                />
                              </button>

                              <button
                                type="button"
                                title="Edit Asset"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                onClick={() => handleOpenEdit(asset)}
                              >
                                <HugeiconsIcon
                                  icon={Edit03Icon}
                                  size={18}
                                  strokeWidth={1.5}
                                />
                              </button>

                              <button
                                type="button"
                                title="Hapus Asset"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                onClick={() => setDeleteConfirm(asset)}
                              >
                                <HugeiconsIcon
                                  icon={Delete01Icon}
                                  size={18}
                                  strokeWidth={1.5}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr>
                            <td colSpan={7} className="px-5 py-4 bg-slate-50/80">
                              <div className="space-y-3">
                                {/* Header & Unit Condition Filter Bar per Asset Entity */}
                                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                  {/* Filter Kondisi Unit pada Entity Asset ini */}
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="text-slate-400 text-[11px] font-medium mr-1">
                                      Kondisi:
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAssetUnitCondition(prev => ({
                                          ...prev,
                                          [asset._id]: ""
                                        }))
                                      }
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${!currentCondition
                                        ? "bg-violet-600 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                    >
                                      Semua ({units.length})
                                    </button>

                                    {CONDITION_OPTIONS.map(opt => {
                                      const count = units.filter(u => u.condition === opt.value).length
                                      const isActive = currentCondition === opt.value

                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          disabled={count === 0}
                                          onClick={() =>
                                            setAssetUnitCondition(prev => ({
                                              ...prev,
                                              [asset._id]: isActive ? "" : opt.value
                                            }))
                                          }
                                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${isActive
                                            ? "ring-2 ring-violet-500 font-bold " + opt.color
                                            : count > 0
                                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                              : "bg-slate-50 text-slate-300 cursor-not-allowed"
                                            }`}
                                        >
                                          <span>{opt.label}</span>
                                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-black/10" : "bg-white text-slate-500 font-bold"}`}>
                                            {count}
                                          </span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {visibleUnits.length === 0 ? (
                                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                                    <p>Tidak ada unit dengan kondisi "{CONDITION_OPTIONS.find(o => o.value === currentCondition)?.label}".</p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAssetUnitCondition(prev => ({
                                          ...prev,
                                          [asset._id]: ""
                                        }))
                                      }
                                      className="mt-2 text-violet-600 font-semibold hover:underline text-xs"
                                    >
                                      Tampilkan semua unit
                                    </button>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {visibleUnits.map(unit => (
                                      <div
                                        key={unit._id}
                                        className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3"
                                      >
                                        <div>
                                          <p className="font-semibold text-sm text-slate-800">
                                            {unit.label}
                                          </p>
                                          <p className="text-xs text-slate-400 mt-1">
                                            Ditambahkan: {fmtDate(unit.addedAt)}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <div className="flex flex-wrap gap-1.5">
                                            <Badge
                                              value={unit.condition}
                                              options={CONDITION_OPTIONS}
                                            />

                                            <Badge
                                              value={unit.status}
                                              options={STATUS_OPTIONS}
                                            />
                                          </div>

                                          <button
                                            type="button"
                                            title="Edit Unit"
                                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                            onClick={() => handleOpenEditUnit(asset, unit)}
                                          >
                                            <HugeiconsIcon
                                              icon={Edit03Icon}
                                              size={16}
                                              strokeWidth={1.5}
                                            />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    )
                  })}
                </tbody>
              </table>

              <div className="px-5 py-3 border-t border-slate-50 text-xs text-slate-400">
                Menampilkan {filtered.length} dari {assets.length} jenis asset
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Asset */}
      <Modal
        open={showAddAsset}
        onClose={() => setShowAddAsset(false)}
        title="Tambah Asset Baru"
      >
        <form onSubmit={handleAddAsset} className="space-y-5">

          {formError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">
              {formError}
            </div>
          )}

          {/* Master Asset */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Informasi Asset
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Asset *
              </label>

              <input
                type="text"
                value={assetForm.name}
                onChange={e => setAssetForm(f => ({
                  ...f,
                  name: e.target.value
                }))}
                placeholder="Contoh: Mesin Sablon"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kategori *
              </label>

              <div className="flex gap-2">
                <select
                  value={assetForm.category}
                  onChange={e => setAssetForm(f => ({
                    ...f,
                    category: e.target.value
                  }))}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"
                  required
                >
                  <option value="">Pilih kategori...</option>

                  {categories.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  className="rounded-xl border border-violet-200 bg-violet-50 text-violet-600 px-3"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Satuan *
              </label>

              <input
                type="text"
                value={assetForm.measurement}
                onChange={e => setAssetForm(f => ({
                  ...f,
                  measurement: e.target.value
                }))}
                placeholder="Contoh: Unit, Pcs, Set"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi
              </label>

              <textarea
                value={assetForm.desc}
                onChange={e => setAssetForm(f => ({
                  ...f,
                  desc: e.target.value
                }))}
                placeholder="Deskripsi atau catatan asset (opsional)..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50"
              />
            </div>

          </div>

          <div className="border-t border-slate-100" />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddAsset(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={assetSaving}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {assetSaving ? "Menyimpan..." : "Simpan Asset"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Asset */}
      <Modal
        open={showEditAsset}
        onClose={() => {
          setShowEditAsset(false)
          setEditingAsset(null)
          setEditFormError("")
        }}
        title="Edit Asset"
      >
        <form onSubmit={handleUpdateAsset} className="space-y-5">

          {editFormError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">
              {editFormError}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Informasi Asset
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nama Asset *
              </label>

              <input
                type="text"
                value={editAssetForm.name}
                onChange={e => setEditAssetForm(f => ({
                  ...f,
                  name: e.target.value
                }))}
                placeholder="Contoh: Mesin Sablon"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kategori *
              </label>

              <div className="flex gap-2">
                <select
                  value={editAssetForm.category}
                  onChange={e => setEditAssetForm(f => ({
                    ...f,
                    category: e.target.value
                  }))}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
                  required
                >
                  <option value="">Pilih kategori...</option>

                  {categories.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  className="rounded-xl border border-violet-200 bg-violet-50 text-violet-600 px-3 hover:bg-violet-100"
                  title="Tambah Kategori Baru"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Satuan *
              </label>

              <input
                type="text"
                value={editAssetForm.measurement}
                onChange={e => setEditAssetForm(f => ({
                  ...f,
                  measurement: e.target.value
                }))}
                placeholder="Contoh: Unit, Pcs, Set"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi
              </label>

              <textarea
                value={editAssetForm.desc}
                onChange={e => setEditAssetForm(f => ({
                  ...f,
                  desc: e.target.value
                }))}
                placeholder="Deskripsi atau catatan asset (opsional)..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>

          </div>

          <div className="border-t border-slate-100" />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowEditAsset(false)
                setEditingAsset(null)
                setEditFormError("")
              }}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={editAssetSaving}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {editAssetSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Category */}
      <Modal
        open={showAddCategory}
        onClose={() => {
          setShowAddCategory(false)
          setCatName("")
          setCatSaving("")
        }}
        title="Tambah Kategori"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAddCategory()
              }
            }}
            placeholder="Contoh: Elektronik, Kendaraan..."
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50"
          />

          {catSaving === "done" && (
            <p className="text-emerald-600 text-sm">
              Kategori berhasil ditambahkan!
            </p>
          )}

          {catSaving === "error" && (
            <p className="text-rose-600 text-sm">
              Gagal menyimpan kategori.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowAddCategory(false)
                setCatName("")
                setCatSaving("")
              }}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
            >
              Selesai
            </button>

            <button
              type="button"
              onClick={handleAddCategory}
              disabled={catSaving === "saving" || !catName.trim()}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {catSaving === "saving" ? "Menyimpan..." : "+ Tambah"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Manage Categories */}
      <Modal
        open={showCategories}
        onClose={() => setShowCategories(false)}
        title="Kelola Kategori Asset"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddCategory()
                }
              }}
              placeholder="Nama kategori baru..."
              className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50"
            />

            <button
              type="button"
              onClick={handleAddCategory}
              disabled={catSaving === "saving" || !catName.trim()}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 text-sm font-semibold disabled:opacity-60"
            >
              Tambah
            </button>
          </div>

          {catSaving === "done" && (
            <p className="text-emerald-600 text-sm">
              Kategori berhasil ditambahkan!
            </p>
          )}

          {catSaving === "error" && (
            <p className="text-rose-600 text-sm">
              Gagal menyimpan.
            </p>
          )}

          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto rounded-xl border border-slate-100">
            {categories.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                Belum ada kategori
              </p>
            ) : (
              categories.map(c => (
                <div
                  key={c._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {c.name}
                  </span>

                  <button
                    onClick={() => handleDeleteCategory(c._id)}
                    className="text-slate-300 hover:text-rose-500 p-1"
                    title="Hapus"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setShowCategories(false)}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>
      </Modal>

      {/* Modal: Delete Confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-center">
            <p className="text-2xl mb-2">🗑️</p>

            <p className="text-sm text-rose-800 font-medium">
              Hapus asset <strong>{deleteConfirm?.name}</strong>?
            </p>

            <p className="text-xs text-rose-600 mt-1">
              Seluruh unit di dalam asset ini juga akan terhapus.
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
            >
              Batal
            </button>

            <button
              onClick={() => deleteConfirm && handleDeleteAsset(deleteConfirm._id)}
              className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-sm font-semibold"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
      {showUnitModal && selectedAsset && (
        <dialog open className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              Tambah Unit
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Asset: {selectedAsset.name}
            </p>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Label Unit</span>
              </label>

              <input
                type="text"
                className="input input-bordered"
                placeholder="Contoh: MS-004"
                value={unitForm.label}
                onChange={(e) =>
                  setUnitForm((prev) => ({
                    ...prev,
                    label: e.target.value
                  }))
                }
              />
            </div>

            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">Kondisi</span>
              </label>

              <select
                className="select select-bordered"
                value={unitForm.condition}
                onChange={(e) =>
                  setUnitForm((prev) => ({
                    ...prev,
                    condition: e.target.value as UnitForm["condition"]
                  }))
                }
              >
                <option value="good">Baik</option>
                <option value="fair">Cukup</option>
                <option value="poor">Buruk</option>
                <option value="damaged">Rusak</option>
              </select>
            </div>

            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">Status</span>
              </label>

              <select
                className="select select-bordered"
                value={unitForm.status}
                onChange={(e) =>
                  setUnitForm((prev) => ({
                    ...prev,
                    status: e.target.value as UnitForm["status"]
                  }))
                }
              >
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="disposed">Dihapus</option>
                <option value="under_maintenance">Dalam Perbaikan</option>
              </select>
            </div>

            <div className="form-control mt-3">
              <label className="label">
                <span className="label-text">Tanggal Penambahan</span>
              </label>

              <input
                type="date"
                className="input input-bordered"
                value={unitForm.addedAt}
                onChange={(e) =>
                  setUnitForm((prev) => ({
                    ...prev,
                    addedAt: e.target.value
                  }))
                }
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn"
                disabled={savingUnit}
                onClick={() => setShowUnitModal(false)}
              >
                Batal
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={savingUnit || !unitForm.label.trim()}
                onClick={handleAddUnit}
              >
                {savingUnit ? "Menyimpan..." : "Simpan Unit"}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="modal-backdrop"
            onClick={() => setShowUnitModal(false)}
            aria-label="Tutup modal"
          />
        </dialog>
      )}

      {/* Modal: Edit Unit */}
      <Modal
        open={showEditUnitModal && !!editingUnit}
        onClose={() => {
          setShowEditUnitModal(false)
          setEditingUnit(null)
          setSelectedAsset(null)
        }}
        title={`Edit Unit Asset ${selectedAsset ? `— ${selectedAsset.name}` : ""}`}
      >
        <form onSubmit={handleUpdateUnit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Label Unit *
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              placeholder="Contoh: MS-004"
              value={editUnitForm.label}
              onChange={(e) =>
                setEditUnitForm((prev) => ({
                  ...prev,
                  label: e.target.value
                }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Kondisi *
            </label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              value={editUnitForm.condition}
              onChange={(e) =>
                setEditUnitForm((prev) => ({
                  ...prev,
                  condition: e.target.value as UnitForm["condition"]
                }))
              }
            >
              <option value="good">Baik (Good)</option>
              <option value="fair">Cukup (Fair)</option>
              <option value="poor">Buruk (Poor)</option>
              <option value="damaged">Rusak (Damaged)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Status *
            </label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              value={editUnitForm.status}
              onChange={(e) =>
                setEditUnitForm((prev) => ({
                  ...prev,
                  status: e.target.value as UnitForm["status"]
                }))
              }
            >
              <option value="active">Aktif (Active)</option>
              <option value="inactive">Tidak Aktif (Inactive)</option>
              <option value="disposed">Dihapus (Disposed)</option>
              <option value="under_maintenance">Dalam Perbaikan (Maintenance)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tanggal Penambahan
            </label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              value={editUnitForm.addedAt}
              onChange={(e) =>
                setEditUnitForm((prev) => ({
                  ...prev,
                  addedAt: e.target.value
                }))
              }
            />
          </div>

          <div className="border-t border-slate-100 pt-3 flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              disabled={savingEditUnit}
              onClick={() => {
                setShowEditUnitModal(false)
                setEditingUnit(null)
                setSelectedAsset(null)
              }}
            >
              Batal
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              disabled={savingEditUnit || !editUnitForm.label.trim()}
            >
              {savingEditUnit ? "Menyimpan..." : "Simpan Perubahan Unit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
