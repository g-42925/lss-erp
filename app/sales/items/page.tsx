/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { NumericFormat } from "react-number-format"

type Catalog = {
  _id: string
  catalogCode: string
  name: string
  category: string
  subCategory: string
  brand: string
  description: string
  unit: string
  image: string
  variantCount: number
}

type Variant = {
  _id: string
  productId: string
  productName: string
  variantName: string
  sellingPrice: number
  applicableTax: string
  sellingPriceTaxType: string
  discountType: string
  discountValue: number
  reorderPoint: number
  safetyStock: number
  remain: number
}

type CatalogFormData = {
  name: string
  category: string
  subCategory: string
  brand: string
  description: string
  unit: string
}

type VariantFormData = {
  variantName: string
  sellingPrice: string
  applicableTax: string
  sellingPriceTaxType: string
  discountType: string
  discountValue: string
  reorderPoint: string
  safetyStock: string
}

export default function SalesItemsPage() {
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()

  const addCatalogRef = useRef<HTMLDialogElement>(null)
  const editCatalogRef = useRef<HTMLDialogElement>(null)
  const addVariantRef = useRef<HTMLDialogElement>(null)
  const editVariantRef = useRef<HTMLDialogElement>(null)

  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [search, setSearch] = useState("")
  const [editCatalog, setEditCatalog] = useState<Catalog | null>(null)
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantSearch, setVariantSearch] = useState("")
  const [editVariant, setEditVariant] = useState<Variant | null>(null)
  const [catalogSubmitting, setCatalogSubmitting] = useState(false)
  const [variantSubmitting, setVariantSubmitting] = useState(false)
  const [variantLoading, setVariantLoading] = useState(false)

  const addCatalogForm = useForm<CatalogFormData>({
    defaultValues: { name: "", category: "", subCategory: "", brand: "", description: "", unit: "pcs" },
  })
  const editCatalogForm = useForm<CatalogFormData>()
  const addVariantForm = useForm<VariantFormData>({
    defaultValues: { variantName: "", sellingPrice: "", applicableTax: "none", sellingPriceTaxType: "inclusive", discountType: "none", discountValue: "0", reorderPoint: "0", safetyStock: "0" },
  })
  const editVariantForm = useForm<VariantFormData>()

  const getFn = useFetch<Catalog[], any>({ url: "", method: "GET", onError: (m) => alert(m) })

  const loadCatalogs = useCallback(() => {
    if (!masterAccountId) return
    getFn.fn(`/api/web/sales-catalog?id=${masterAccountId}`, {}, (result) => setCatalogs(result))
  }, [masterAccountId])

  useEffect(() => {
    if (hasHydrated && masterAccountId) loadCatalogs()
  }, [masterAccountId, hasHydrated])

  const loadVariants = useCallback(async (catalogId: string) => {
    setVariantLoading(true)
    try {
      const res = await fetch(`/api/web/products?id=${masterAccountId}&catalogId=${catalogId}`)
      const json = await res.json()
      setVariants(json.result ?? [])
    } catch {
      setVariants([])
    } finally {
      setVariantLoading(false)
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  const filteredCatalogs = search.trim()
    ? catalogs.filter((c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase()) ||
      c.brand?.toLowerCase().includes(search.toLowerCase()) ||
      c.catalogCode?.toLowerCase().includes(search.toLowerCase()))
    : catalogs

  const filteredVariants = variantSearch.trim()
    ? variants.filter((v) =>
      v.variantName?.toLowerCase().includes(variantSearch.toLowerCase()) ||
      v.productId?.toLowerCase().includes(variantSearch.toLowerCase()))
    : variants

  async function handleAddCatalog(data: CatalogFormData) {
    setCatalogSubmitting(true)
    try {
      const res = await fetch("/api/web/sales-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: masterAccountId, ...data }),
      })
      const json = await res.json()
      if (json.error || json.noResult) { alert(json.message || "Gagal menambahkan katalog"); return }
      loadCatalogs()
      addCatalogForm.reset()
      addCatalogRef.current?.close()
    } catch (e: any) { alert(e.message) } finally { setCatalogSubmitting(false) }
  }

  function openEditCatalog(c: Catalog) {
    setEditCatalog(c)
    editCatalogForm.reset({ name: c.name, category: c.category, subCategory: c.subCategory, brand: c.brand, description: c.description, unit: c.unit })
    editCatalogRef.current?.showModal()
  }

  async function handleEditCatalog(data: CatalogFormData) {
    if (!editCatalog) return
    setCatalogSubmitting(true)
    try {
      const res = await fetch("/api/web/sales-catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: masterAccountId, catalogId: editCatalog._id, ...data }),
      })
      const json = await res.json()
      if (json.error || json.noResult) { alert(json.message || "Gagal mengubah katalog"); return }
      loadCatalogs()
      if (selectedCatalog?._id === editCatalog._id) {
        setSelectedCatalog({ ...selectedCatalog, ...data, variantCount: selectedCatalog.variantCount })
      }
      editCatalogRef.current?.close()
    } catch (e: any) { alert(e.message) } finally { setCatalogSubmitting(false) }
  }

  function openCatalogVariants(c: Catalog) {
    setSelectedCatalog(c)
    setVariantSearch("")
    loadVariants(c._id)
  }

  function closeCatalogVariants() {
    setSelectedCatalog(null)
    setVariants([])
    setVariantSearch("")
    loadCatalogs()
  }

  async function handleAddVariant(data: VariantFormData) {
    if (!selectedCatalog) return
    setVariantSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("command", "addVariant")
      fd.append("id", masterAccountId ?? "")
      fd.append("catalogId", selectedCatalog._id)
      fd.append("variantName", data.variantName)
      fd.append("sellingPrice", data.sellingPrice || "0")
      fd.append("applicableTax", data.applicableTax || "none")
      fd.append("sellingPriceTaxType", data.sellingPriceTaxType || "inclusive")
      fd.append("discountType", data.discountType || "none")
      fd.append("discountValue", data.discountValue || "0")
      fd.append("reorderPoint", data.reorderPoint || "0")
      fd.append("safetyStock", data.safetyStock || "0")
      const res = await fetch("/api/web/products", { method: "POST", body: fd })
      const json = await res.json()
      if (json.error || json.noResult) { alert(json.message || "Gagal menambahkan varian"); return }
      loadVariants(selectedCatalog._id)
      addVariantForm.reset({ variantName: "", sellingPrice: "", applicableTax: "none", sellingPriceTaxType: "inclusive", discountType: "none", discountValue: "0", reorderPoint: "0", safetyStock: "0" })
      addVariantRef.current?.close()
    } catch (e: any) { alert(e.message) } finally { setVariantSubmitting(false) }
  }

  function openEditVariant(v: Variant) {
    setEditVariant(v)
    editVariantForm.reset({
      variantName: v.variantName,
      sellingPrice: String(v.sellingPrice),
      applicableTax: v.applicableTax || "none",
      sellingPriceTaxType: v.sellingPriceTaxType || "inclusive",
      discountType: v.discountType || "none",
      discountValue: String(v.discountValue || 0),
      reorderPoint: String(v.reorderPoint || 0),
      safetyStock: String(v.safetyStock || 0),
    })
    editVariantRef.current?.showModal()
  }

  async function handleEditVariant(data: VariantFormData) {
    if (!editVariant || !selectedCatalog) return
    setVariantSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("id", masterAccountId ?? "")
      fd.append("xId", editVariant._id)
      fd.append("productName", `${selectedCatalog.name} - ${data.variantName}`)
      fd.append("category", selectedCatalog.category || "")
      fd.append("description", selectedCatalog.description || selectedCatalog.name)
      fd.append("conversionRatioX", selectedCatalog.unit || "pcs")
      fd.append("conversionRatioY", selectedCatalog.unit || "pcs")
      fd.append("applicableTax", data.applicableTax || "none")
      fd.append("sellingPriceTaxType", data.sellingPriceTaxType || "inclusive")
      fd.append("productType", "good")
      fd.append("sellingPrice", data.sellingPrice || "0")
      fd.append("haveExpiredDate", "false")
      fd.append("discountType", data.discountType || "none")
      fd.append("discountValue", data.discountValue || "0")
      fd.append("conversionType", "value")
      fd.append("conversionValue", "1")
      fd.append("reorderPoint", data.reorderPoint || "0")
      fd.append("safetyStock", data.safetyStock || "0")
      fd.append("image", "")
      const res = await fetch("/api/web/products", { method: "PUT", body: fd })
      const json = await res.json()
      if (json.error || json.noResult) { alert(json.message || "Gagal mengubah varian"); return }
      loadVariants(selectedCatalog._id)
      editVariantRef.current?.close()
    } catch (e: any) { alert(e.message) } finally { setVariantSubmitting(false) }
  }

  function stockBadge(stock: number) {
    if (!stock || stock <= 0) return "bg-red-100 text-red-700 border border-red-200"
    if (stock <= 5) return "bg-amber-100 text-amber-700 border border-amber-200"
    return "bg-emerald-100 text-emerald-700 border border-emerald-200"
  }

  function taxLabel(tax: string) {
    if (tax === "ppn") return "PPN 11%"
    if (tax === "ppn12") return "PPN 12%"
    return "Tanpa pajak"
  }

  const inp = "text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
  const inpB = "text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
  const sel = `${inp} bg-white`
  const selB = `${inpB} bg-white`
  const lbl = "block text-sm font-semibold text-slate-600 mb-1"

  return (
    <>
      {/* ── CATALOG LIST VIEW ────────────────────────────────────────────── */}
      {!selectedCatalog && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sales Items</h1>
              <p className="text-slate-500 text-sm mt-1">Kelola katalog barang dan variannya untuk dijual / dipesan</p>
            </div>
            <button
              id="btn-add-catalog"
              onClick={() => { addCatalogForm.reset(); addCatalogRef.current?.showModal() }}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 transition-all text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tambah Katalog
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Total Katalog</p>
              <p className="text-3xl font-bold text-slate-800">{catalogs.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Total Varian</p>
              <p className="text-3xl font-bold text-emerald-600">{catalogs.reduce((s, c) => s + (c.variantCount || 0), 0)}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Tanpa Varian</p>
              <p className="text-3xl font-bold text-amber-500">{catalogs.filter((c) => !c.variantCount).length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium text-sm">{filteredCatalogs.length} katalog</span>
              <input
                type="search"
                placeholder="Cari nama, kategori, merek, kode…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-black border border-slate-200 rounded-xl px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {getFn.loading ? (
              <div className="flex justify-center items-center py-20">
                <span className="loading loading-spinner loading-lg text-emerald-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left">Kode</th>
                      <th className="px-6 py-3 text-left">Nama Katalog</th>
                      <th className="px-6 py-3 text-left">Kategori</th>
                      <th className="px-6 py-3 text-left">Sub Kategori</th>
                      <th className="px-6 py-3 text-left">Merek</th>
                      <th className="px-6 py-3 text-left">Satuan</th>
                      <th className="px-6 py-3 text-center">Varian</th>
                      <th className="px-6 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCatalogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-14 text-slate-400 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 mx-auto mb-3 text-slate-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                          </svg>
                          <p className="font-medium">{search ? "Tidak ada katalog yang cocok" : "Belum ada katalog"}</p>
                          {!search && <p className="text-xs mt-1 text-slate-300">Klik &quot;Tambah Katalog&quot; untuk memulai.</p>}
                        </td>
                      </tr>
                    ) : (
                      filteredCatalogs.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => openCatalogVariants(c)}>
                          <td className="px-6 py-4 font-mono text-slate-400 text-xs">{c.catalogCode}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">{c.name}</td>
                          <td className="px-6 py-4">
                            {c.category ? <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">{c.category}</span> : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            {c.subCategory ? <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{c.subCategory}</span> : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{c.brand || <span className="text-slate-300">—</span>}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{c.unit || "pcs"}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.variantCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              {c.variantCount} varian
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                id={`btn-edit-catalog-${c.catalogCode}`}
                                onClick={(e) => { e.stopPropagation(); openEditCatalog(c) }}
                                className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                              >
                                Edit
                              </button>
                              <button
                                id={`btn-variants-${c.catalogCode}`}
                                onClick={(e) => { e.stopPropagation(); openCatalogVariants(c) }}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                                </svg>
                                Varian
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VARIANT PANEL VIEW ───────────────────────────────────────────── */}
      {selectedCatalog && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <button
                id="btn-back-to-catalogs"
                onClick={closeCatalogVariants}
                className="mt-1 p-2 rounded-xl hover:bg-slate-200 transition-colors text-slate-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-slate-400 text-sm font-medium">Sales Items</span>
                  <span className="text-slate-300">/</span>
                  <span className="text-emerald-700 text-sm font-semibold">{selectedCatalog.name}</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{selectedCatalog.name}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {selectedCatalog.category && <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">{selectedCatalog.category}</span>}
                  {selectedCatalog.subCategory && <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">{selectedCatalog.subCategory}</span>}
                  {selectedCatalog.brand && <span className="text-slate-500 text-xs">🏷 {selectedCatalog.brand}</span>}
                  <span className="text-slate-400 text-xs">Satuan: <strong>{selectedCatalog.unit}</strong></span>
                  <span className="font-mono text-slate-300 text-xs">{selectedCatalog.catalogCode}</span>
                </div>
                {selectedCatalog.description && <p className="text-slate-400 text-sm mt-1 max-w-lg">{selectedCatalog.description}</p>}
              </div>
            </div>
            <button
              id="btn-add-variant"
              onClick={() => { addVariantForm.reset({ variantName: "", sellingPrice: "", applicableTax: "none", sellingPriceTaxType: "inclusive", discountType: "none", discountValue: "0", reorderPoint: "0", safetyStock: "0" }); addVariantRef.current?.showModal() }}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 transition-all text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 mt-1 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tambah Varian
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <span className="text-slate-600 font-medium text-sm">{filteredVariants.length} varian</span>
              <input
                type="search"
                placeholder="Cari nama varian atau kode…"
                value={variantSearch}
                onChange={(e) => setVariantSearch(e.target.value)}
                className="text-black border border-slate-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>

            {variantLoading ? (
              <div className="flex justify-center items-center py-20">
                <span className="loading loading-spinner loading-lg text-emerald-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left">Kode</th>
                      <th className="px-6 py-3 text-left">Nama Varian / Spesifikasi</th>
                      <th className="px-6 py-3 text-right">Harga Jual Default</th>
                      <th className="px-6 py-3 text-center">Pajak</th>
                      <th className="px-6 py-3 text-center">Stok</th>
                      <th className="px-6 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredVariants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-14 text-slate-400 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 mx-auto mb-3 text-slate-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                          </svg>
                          <p className="font-medium">{variantSearch ? "Tidak ada varian yang cocok" : "Belum ada varian"}</p>
                          {!variantSearch && <p className="text-xs mt-1 text-slate-300">Klik &quot;Tambah Varian&quot; untuk menambahkan spesifikasi / ukuran / warna, dll.</p>}
                        </td>
                      </tr>
                    ) : (
                      filteredVariants.map((v) => (
                        <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-400 text-xs">{v.productId}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-800">{v.variantName}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{selectedCatalog.name} — {v.variantName}</p>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-800">
                            Rp {Number(v.sellingPrice || 0).toLocaleString("id-ID")}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-xs text-slate-500">{taxLabel(v.applicableTax)}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${stockBadge(v.remain ?? 0)}`}>{v.remain ?? 0}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              id={`btn-edit-variant-${v.productId}`}
                              onClick={() => openEditVariant(v)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Catalog Modal ─────────────────────────────────────────────── */}
      <dialog ref={addCatalogRef} id="modal-add-catalog" className="modal">
        <div className="modal-box rounded-2xl max-w-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Tambah Katalog Baru</h2>
              <p className="text-slate-400 text-xs">Entitas induk — varian ditambahkan setelah katalog dibuat.</p>
            </div>
          </div>
          <form onSubmit={addCatalogForm.handleSubmit(handleAddCatalog)} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nama Katalog <span className="text-red-500">*</span></label>
              <input id="input-catalog-name" {...addCatalogForm.register("name", { required: true })} className={inp} placeholder="e.g. Kemeja Flanel, Laptop Gaming, Beras Premium" />
              {addCatalogForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">Nama wajib diisi.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Kategori <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input id="input-catalog-category" {...addCatalogForm.register("category")} className={inp} placeholder="e.g. Pakaian, Elektronik" />
              </div>
              <div>
                <label className={lbl}>Sub Kategori <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input id="input-catalog-subcategory" {...addCatalogForm.register("subCategory")} className={inp} placeholder="e.g. Atasan, Laptop" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Merek <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input id="input-catalog-brand" {...addCatalogForm.register("brand")} className={inp} placeholder="e.g. Uniqlo, ASUS" />
              </div>
              <div>
                <label className={lbl}>Satuan <span className="text-red-500">*</span></label>
                <input id="input-catalog-unit" {...addCatalogForm.register("unit", { required: true })} className={inp} placeholder="pcs, box, kg, lusin" />
                {addCatalogForm.formState.errors.unit && <p className="text-red-500 text-xs mt-1">Satuan wajib diisi.</p>}
              </div>
            </div>
            <div>
              <label className={lbl}>Deskripsi <span className="text-slate-400 font-normal">(opsional)</span></label>
              <textarea id="input-catalog-description" {...addCatalogForm.register("description")} className={`${inp} h-20 resize-none`} placeholder="Deskripsi singkat item ini" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { addCatalogRef.current?.close(); addCatalogForm.reset() }} className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm">Batal</button>
              <button id="btn-submit-add-catalog" type="submit" disabled={catalogSubmitting} className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-emerald-200">
                {catalogSubmitting ? <span className="loading loading-spinner loading-xs" /> : "Simpan Katalog"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* ── Edit Catalog Modal ────────────────────────────────────────────── */}
      <dialog ref={editCatalogRef} id="modal-edit-catalog" className="modal">
        <div className="modal-box rounded-2xl max-w-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Edit Katalog</h2>
              <p className="text-slate-400 text-xs">{editCatalog?.name}</p>
            </div>
          </div>
          <form onSubmit={editCatalogForm.handleSubmit(handleEditCatalog)} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nama Katalog <span className="text-red-500">*</span></label>
              <input id="input-edit-catalog-name" {...editCatalogForm.register("name", { required: true })} className={inpB} placeholder="Nama katalog" />
              {editCatalogForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">Nama wajib diisi.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Kategori</label>
                <input id="input-edit-catalog-category" {...editCatalogForm.register("category")} className={inpB} placeholder="Kategori" />
              </div>
              <div>
                <label className={lbl}>Sub Kategori</label>
                <input id="input-edit-catalog-subcategory" {...editCatalogForm.register("subCategory")} className={inpB} placeholder="Sub Kategori" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Merek</label>
                <input id="input-edit-catalog-brand" {...editCatalogForm.register("brand")} className={inpB} placeholder="Merek" />
              </div>
              <div>
                <label className={lbl}>Satuan <span className="text-red-500">*</span></label>
                <input id="input-edit-catalog-unit" {...editCatalogForm.register("unit", { required: true })} className={inpB} placeholder="pcs, box, kg" />
              </div>
            </div>
            <div>
              <label className={lbl}>Deskripsi</label>
              <textarea id="input-edit-catalog-description" {...editCatalogForm.register("description")} className={`${inpB} h-20 resize-none`} placeholder="Deskripsi" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { editCatalogRef.current?.close(); setEditCatalog(null) }} className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm">Batal</button>
              <button id="btn-submit-edit-catalog" type="submit" disabled={catalogSubmitting} className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-blue-200">
                {catalogSubmitting ? <span className="loading loading-spinner loading-xs" /> : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setEditCatalog(null)}>close</button></form>
      </dialog>

      {/* ── Add Variant Modal ─────────────────────────────────────────────── */}
      <dialog ref={addVariantRef} id="modal-add-variant" className="modal">
        <div className="modal-box rounded-2xl max-w-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Tambah Varian</h2>
              <p className="text-slate-400 text-xs">Katalog: <strong className="text-slate-600">{selectedCatalog?.name}</strong></p>
            </div>
          </div>
          <p className="text-slate-400 text-xs mb-5 ml-11">Varian ini akan tersedia di Purchase Requisition dan dapat dijual.</p>
          <form onSubmit={addVariantForm.handleSubmit(handleAddVariant)} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nama Varian / Spesifikasi <span className="text-red-500">*</span></label>
              <input id="input-variant-name" {...addVariantForm.register("variantName", { required: true })} className={inp} placeholder="e.g. Merah / L, 256GB, Wangi Lavender" />
              {addVariantForm.formState.errors.variantName && <p className="text-red-500 text-xs mt-1">Nama varian wajib diisi.</p>}
              <p className="text-slate-400 text-xs mt-1">Nama lengkap: <em>{selectedCatalog?.name}{addVariantForm.watch("variantName") ? ` — ${addVariantForm.watch("variantName")}` : " — ..."}</em></p>
            </div>
            <div>
              <label className={lbl}>Harga Jual Default <span className="text-red-500">*</span></label>
              <NumericFormat
                id="input-variant-price"
                onValueChange={(v) => addVariantForm.setValue("sellingPrice", v.value)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                className={inp}
                placeholder="Rp 0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Pajak Penjualan</label>
                <select id="input-variant-tax" {...addVariantForm.register("applicableTax")} className={sel}>
                  <option value="none">Tidak ada</option>
                  <option value="ppn">PPN 11%</option>
                  <option value="ppn12">PPN 12%</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Tipe Harga Pajak</label>
                <select id="input-variant-tax-type" {...addVariantForm.register("sellingPriceTaxType")} className={sel}>
                  <option value="inclusive">Inclusive</option>
                  <option value="exclusive">Exclusive</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Tipe Diskon</label>
                <select id="input-variant-discount-type" {...addVariantForm.register("discountType")} className={sel}>
                  <option value="none">Tidak ada</option>
                  <option value="percent">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Nilai Diskon</label>
                <input id="input-variant-discount-value" type="number" {...addVariantForm.register("discountValue")} className={inp} placeholder="0" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Reorder Point</label>
                <input id="input-variant-reorder" type="number" {...addVariantForm.register("reorderPoint")} className={inp} placeholder="0" min="0" />
              </div>
              <div>
                <label className={lbl}>Safety Stock</label>
                <input id="input-variant-safety" type="number" {...addVariantForm.register("safetyStock")} className={inp} placeholder="0" min="0" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { addVariantRef.current?.close(); addVariantForm.reset() }} className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm">Batal</button>
              <button id="btn-submit-add-variant" type="submit" disabled={variantSubmitting} className="flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-emerald-200">
                {variantSubmitting ? <span className="loading loading-spinner loading-xs" /> : "Simpan Varian"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* ── Edit Variant Modal ────────────────────────────────────────────── */}
      <dialog ref={editVariantRef} id="modal-edit-variant" className="modal">
        <div className="modal-box rounded-2xl max-w-lg p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Edit Varian</h2>
              <p className="text-slate-400 text-xs">{editVariant?.variantName} · {editVariant?.productId}</p>
            </div>
          </div>
          <form onSubmit={editVariantForm.handleSubmit(handleEditVariant)} className="flex flex-col gap-4">
            <div>
              <label className={lbl}>Nama Varian / Spesifikasi <span className="text-red-500">*</span></label>
              <input id="input-edit-variant-name" {...editVariantForm.register("variantName", { required: true })} className={inpB} placeholder="Nama varian" />
              {editVariantForm.formState.errors.variantName && <p className="text-red-500 text-xs mt-1">Nama varian wajib diisi.</p>}
            </div>
            <div>
              <label className={lbl}>Harga Jual Default</label>
              <NumericFormat
                id="input-edit-variant-price"
                value={editVariantForm.watch("sellingPrice")}
                onValueChange={(v) => editVariantForm.setValue("sellingPrice", v.value)}
                thousandSeparator="."
                decimalSeparator=","
                prefix="Rp "
                className={inpB}
                placeholder="Rp 0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Pajak Penjualan</label>
                <select id="input-edit-variant-tax" {...editVariantForm.register("applicableTax")} className={selB}>
                  <option value="none">Tidak ada</option>
                  <option value="ppn">PPN 11%</option>
                  <option value="ppn12">PPN 12%</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Tipe Harga Pajak</label>
                <select id="input-edit-variant-tax-type" {...editVariantForm.register("sellingPriceTaxType")} className={selB}>
                  <option value="inclusive">Inclusive</option>
                  <option value="exclusive">Exclusive</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Tipe Diskon</label>
                <select id="input-edit-variant-discount-type" {...editVariantForm.register("discountType")} className={selB}>
                  <option value="none">Tidak ada</option>
                  <option value="percent">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Nilai Diskon</label>
                <input id="input-edit-variant-discount-value" type="number" {...editVariantForm.register("discountValue")} className={inpB} placeholder="0" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Reorder Point</label>
                <input id="input-edit-variant-reorder" type="number" {...editVariantForm.register("reorderPoint")} className={inpB} placeholder="0" min="0" />
              </div>
              <div>
                <label className={lbl}>Safety Stock</label>
                <input id="input-edit-variant-safety" type="number" {...editVariantForm.register("safetyStock")} className={inpB} placeholder="0" min="0" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { editVariantRef.current?.close(); setEditVariant(null) }} className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm">Batal</button>
              <button id="btn-submit-edit-variant" type="submit" disabled={variantSubmitting} className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-blue-200">
                {variantSubmitting ? <span className="loading loading-spinner loading-xs" /> : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setEditVariant(null)}>close</button></form>
      </dialog>
    </>
  )
}
