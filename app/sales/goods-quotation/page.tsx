/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import useAuth from "@/store/auth"
import { NumericFormat } from "react-number-format"
import { formatDate } from "@/lib/utils"
import Swal from "sweetalert2"

type Catalog = {
  _id: string
  catalogCode: string
  name: string
  category: string
  unit: string
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
  catalogId?: string
}

type QuotationItem = {
  productId: string
  catalogId: string
  productName: string
  variantName: string
  qty: number
  unit: string
  unitPrice: number
  discountType: "percent" | "fixed" | "none"
  discountValue: number
  applicableTax: string
  taxType: string
  subTotal: number
}

type GoodsQuotation = {
  _id: string
  quotationNumber: string
  date: string
  validUntil?: string
  status: "draft" | "sent" | "accepted" | "rejected" | "expired"
  customerId?: any
  customCustomer?: { name: string; address: string; phone: string; email: string }
  items: any[]
  subtotal: number
  totalDiscount: number
  totalTax: number
  grandTotal: number
  note: string
  termsConditions?: string
  locked: boolean
}

const TAX_RATES: Record<string, number> = { ppn: 0.11, ppn12: 0.12, none: 0 }

function calcItemSubtotal(item: QuotationItem): number {
  let price = item.unitPrice
  if (item.discountType === "percent") price -= price * (item.discountValue / 100)
  else if (item.discountType === "fixed") price -= item.discountValue
  let sub = price * item.qty
  if (item.taxType === "exclusive") {
    const rate = TAX_RATES[item.applicableTax] ?? 0
    sub += sub * rate
  }
  return Math.max(0, Math.round(sub))
}

function calcTotals(items: QuotationItem[], globalDiscType: string, globalDiscVal: number) {
  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.qty, 0)
  let afterItemDisc = items.reduce((s, it) => {
    let p = it.unitPrice
    if (it.discountType === "percent") p -= p * (it.discountValue / 100)
    else if (it.discountType === "fixed") p -= it.discountValue
    return s + Math.max(0, p) * it.qty
  }, 0)

  let globalDisc = 0
  if (globalDiscType === "percent") globalDisc = afterItemDisc * (globalDiscVal / 100)
  else if (globalDiscType === "fixed") globalDisc = globalDiscVal
  afterItemDisc -= globalDisc

  let totalTax = 0
  for (const it of items) {
    const rate = TAX_RATES[it.applicableTax] ?? 0
    if (rate > 0 && it.taxType === "exclusive") {
      let base = it.unitPrice
      if (it.discountType === "percent") base -= base * (it.discountValue / 100)
      else if (it.discountType === "fixed") base -= it.discountValue
      totalTax += Math.max(0, base) * it.qty * rate
    }
  }

  const grandTotal = Math.round(afterItemDisc + totalTax)
  return { subtotal: Math.round(subtotal), totalDiscount: Math.round(globalDisc), totalTax: Math.round(totalTax), grandTotal }
}

const IDR = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border border-slate-200",
  sent: "bg-blue-100 text-blue-700 border border-blue-200",
  accepted: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-100 text-red-700 border border-red-200",
  expired: "bg-amber-100 text-amber-700 border border-amber-200",
}

export default function GoodsQuotationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><span className="loading loading-spinner loading-lg text-teal-600" /></div>}>
      <GoodsQuotationContent />
    </Suspense>
  )
}

function GoodsQuotationContent() {
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()
  const searchParams = useSearchParams()
  const initCatalogId = searchParams.get("catalogId")

  // ── State: List ────────────────────────────────────────────────────────────
  const [quotations, setQuotations] = useState<GoodsQuotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // ── State: Create/Edit Modal ───────────────────────────────────────────────
  const createModalRef = useRef<HTMLDialogElement>(null)
  const viewModalRef = useRef<HTMLDialogElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editTarget, setEditTarget] = useState<GoodsQuotation | null>(null)
  const [viewTarget, setViewTarget] = useState<GoodsQuotation | null>(null)

  // Form state
  const [customerMode, setCustomerMode] = useState<"custom" | "existing">("custom")
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [custName, setCustName] = useState("")
  const [custAddress, setCustAddress] = useState("")
  const [custPhone, setCustPhone] = useState("")
  const [custEmail, setCustEmail] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [note, setNote] = useState("")
  const [termsConditions, setTermsConditions] = useState("")
  const [formStatus, setFormStatus] = useState<string>("draft")
  const [globalDiscType, setGlobalDiscType] = useState<"percent" | "fixed" | "none">("none")
  const [globalDiscVal, setGlobalDiscVal] = useState(0)

  // Items
  const [items, setItems] = useState<QuotationItem[]>([])

  // Product picker
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [catalogSearch, setCatalogSearch] = useState("")
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [pickerStep, setPickerStep] = useState<"catalog" | "variant">("catalog")
  const productPickerRef = useRef<HTMLDialogElement>(null)

  // ── Computed ───────────────────────────────────────────────────────────────
  const totals = calcTotals(items, globalDiscType, globalDiscVal)
  const filteredQuotations = search.trim()
    ? quotations.filter((q) => {
      const cname =
        q.customerId?.name || q.customerId?.bussinessName || q.customCustomer?.name || ""
      return (
        cname.toLowerCase().includes(search.toLowerCase()) ||
        q.quotationNumber.toLowerCase().includes(search.toLowerCase())
      )
    })
    : quotations

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async () => {
    if (!masterAccountId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/web/goods-quotation?id=${masterAccountId}`)
      const json = await res.json()
      setQuotations(json.result ?? [])
    } catch {
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }, [masterAccountId])

  // ── Fetch catalogs for picker ──────────────────────────────────────────────
  const fetchCatalogs = useCallback(async () => {
    if (!masterAccountId) return
    try {
      const res = await fetch(`/api/web/sales-catalog?id=${masterAccountId}`)
      const json = await res.json()
      setCatalogs(json.result ?? [])
    } catch { setCatalogs([]) }
  }, [masterAccountId])

  // ── Fetch customers ────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    if (!masterAccountId) return
    try {
      const res = await fetch(`/api/web/customers?id=${masterAccountId}`)
      const json = await res.json()
      setCustomers(json.result ?? [])
    } catch { setCustomers([]) }
  }, [masterAccountId])

  // ── Fetch variants for catalog ─────────────────────────────────────────────
  async function fetchVariants(catalogId: string) {
    setVariantsLoading(true)
    try {
      const res = await fetch(`/api/web/products?id=${masterAccountId}&catalogId=${catalogId}`)
      const json = await res.json()
      setVariants(json.result ?? [])
    } catch { setVariants([]) } finally { setVariantsLoading(false) }
  }

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      fetchQuotations()
      fetchCatalogs()
      fetchCustomers()
    }
  }, [masterAccountId, hasHydrated])

  // ── Auto-open create modal when coming from sales/items with catalogId ──────
  useEffect(() => {
    if (!initCatalogId || catalogs.length === 0) return
    const found = catalogs.find((c) => c._id === initCatalogId)
    if (!found) return
    // Open create modal then immediately jump to variant picker for this catalog
    resetForm()
    setEditTarget(null)
    createModalRef.current?.showModal()
    // Open product picker pre-seeded to this catalog
    setTimeout(() => {
      setSelectedCatalog(found)
      setPickerStep("variant")
      fetchVariants(found._id)
      productPickerRef.current?.showModal()
    }, 200)
    // Bersihkan query param dari URL
    router.replace("/sales/goods-quotation", { scroll: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initCatalogId, catalogs])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ── Open create form ───────────────────────────────────────────────────────
  function openCreate() {
    setEditTarget(null)
    resetForm()
    createModalRef.current?.showModal()
  }

  function openEdit(q: GoodsQuotation) {
    setEditTarget(q)
    // Customer
    if (q.customerId) {
      setCustomerMode("existing")
      setSelectedCustomerId(q.customerId._id ?? q.customerId)
    } else {
      setCustomerMode("custom")
      setCustName(q.customCustomer?.name ?? "")
      setCustAddress(q.customCustomer?.address ?? "")
      setCustPhone(q.customCustomer?.phone ?? "")
      setCustEmail(q.customCustomer?.email ?? "")
    }
    setValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : "")
    setNote(q.note ?? "")
    setTermsConditions(q.termsConditions ?? "")
    setFormStatus(q.status)
    // Items
    const mapped: QuotationItem[] = (q.items ?? []).map((it: any) => ({
      productId: it.productId?._id ?? it.productId ?? "",
      catalogId: it.catalogId?._id ?? it.catalogId ?? "",
      productName: it.productName ?? "",
      variantName: it.variantName ?? "",
      qty: it.qty ?? 1,
      unit: it.unit ?? "pcs",
      unitPrice: it.unitPrice ?? 0,
      discountType: it.discountType ?? "none",
      discountValue: it.discountValue ?? 0,
      applicableTax: it.applicableTax ?? "none",
      taxType: it.taxType ?? "inclusive",
      subTotal: it.subTotal ?? 0,
    }))
    setItems(mapped)
    setGlobalDiscType("none")
    setGlobalDiscVal(0)
    createModalRef.current?.showModal()
  }

  function openView(q: GoodsQuotation) {
    setViewTarget(q)
    viewModalRef.current?.showModal()
  }

  function resetForm() {
    setCustomerMode("custom")
    setSelectedCustomerId("")
    setCustName(""); setCustAddress(""); setCustPhone(""); setCustEmail("")
    setValidUntil("")
    setNote(""); setTermsConditions("")
    setFormStatus("draft")
    setGlobalDiscType("none"); setGlobalDiscVal(0)
    setItems([])
  }

  // ── Product picker ─────────────────────────────────────────────────────────
  function openProductPicker() {
    setPickerStep("catalog")
    setSelectedCatalog(null)
    setVariants([])
    setCatalogSearch("")
    productPickerRef.current?.showModal()
  }

  function selectCatalog(c: Catalog) {
    setSelectedCatalog(c)
    setPickerStep("variant")
    fetchVariants(c._id)
  }

  function addVariantToItems(v: Variant) {
    const existing = items.findIndex((it) => it.productId === v._id)
    if (existing >= 0) {
      setItems((prev) => prev.map((it, i) => i === existing ? { ...it, qty: it.qty + 1, subTotal: calcItemSubtotal({ ...it, qty: it.qty + 1 }) } : it))
    } else {
      const newItem: QuotationItem = {
        productId: v._id,
        catalogId: selectedCatalog?._id ?? "",
        productName: `${selectedCatalog?.name ?? ""} - ${v.variantName}`,
        variantName: v.variantName,
        qty: 1,
        unit: selectedCatalog?.unit ?? "pcs",
        unitPrice: v.sellingPrice ?? 0,
        discountType: (v.discountType ?? "none") as any,
        discountValue: v.discountValue ?? 0,
        applicableTax: v.applicableTax ?? "none",
        taxType: v.sellingPriceTaxType ?? "inclusive",
        subTotal: 0,
      }
      newItem.subTotal = calcItemSubtotal(newItem)
      setItems((prev) => [...prev, newItem])
    }
    productPickerRef.current?.close()
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof QuotationItem, val: any) {
    setItems((prev) => {
      const next = prev.map((it, idx) => {
        if (idx !== i) return it
        const updated = { ...it, [field]: val }
        updated.subTotal = calcItemSubtotal(updated)
        return updated
      })
      return next
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (items.length === 0) { alert("Tambahkan minimal satu item barang."); return }
    if (customerMode === "custom" && !custName.trim()) { alert("Nama pelanggan wajib diisi."); return }

    setSubmitting(true)
    try {
      const payload: any = {
        masterAccountId,
        customerId: customerMode === "existing" ? selectedCustomerId || undefined : undefined,
        customCustomer: customerMode === "custom" ? { name: custName, address: custAddress, phone: custPhone, email: custEmail } : undefined,
        validUntil: validUntil || undefined,
        items: items.map((it) => ({ ...it, subTotal: calcItemSubtotal(it) })),
        discountType: globalDiscType,
        discountValue: globalDiscVal,
        ...totals,
        note,
        termsConditions,
        status: formStatus,
      }

      let res: Response
      if (editTarget) {
        res = await fetch(`/api/web/goods-quotation/${editTarget._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/web/goods-quotation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const json = await res.json()
      if (json.error) { alert(json.message || "Terjadi kesalahan"); return }

      createModalRef.current?.close()
      resetForm()
      fetchQuotations()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(q: GoodsQuotation) {
    const confirm = await Swal.fire({
      title: "Hapus Quotation?",
      text: `${q.quotationNumber} akan dihapus secara permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus",
    })
    if (!confirm.isConfirmed) return
    try {
      const res = await fetch(`/api/web/goods-quotation/${q._id}`, { method: "DELETE" })
      const json = await res.json()
      if (json.error) { Swal.fire("Error", json.message, "error"); return }
      Swal.fire({ title: "Terhapus!", icon: "success", timer: 1500, showConfirmButton: false })
      fetchQuotations()
    } catch (e: any) {
      Swal.fire("Error", e.message, "error")
    }
  }

  // ── Update status ──────────────────────────────────────────────────────────
  async function handleStatusChange(q: GoodsQuotation, newStatus: string) {
    try {
      const res = await fetch(`/api/web/goods-quotation/${q._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.error) { alert(json.message); return }
      fetchQuotations()
    } catch (e: any) { alert(e.message) }
  }

  const inp = "text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
  const lbl = "block text-xs font-semibold text-slate-600 mb-1"

  const filteredCatalogs = catalogSearch.trim()
    ? catalogs.filter((c) =>
      c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.category?.toLowerCase().includes(catalogSearch.toLowerCase())
    )
    : catalogs

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Quotation Barang</h1>
            <p className="text-slate-500 text-sm mt-1">Buat dan kelola penawaran harga barang untuk pelanggan</p>
          </div>
          <button
            id="btn-create-goods-quotation"
            onClick={openCreate}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 active:scale-95 transition-all text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-teal-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Buat Quotation
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {(["draft", "sent", "accepted", "rejected"] as const).map((s) => (
            <div key={s} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">{s}</p>
              <p className="text-2xl font-bold text-slate-800">{quotations.filter((q) => q.status === s).length}</p>
            </div>
          ))}
        </div>

        {/* Search + Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <span className="text-slate-600 font-medium text-sm">{filteredQuotations.length} quotation</span>
            <input
              type="search"
              placeholder="Cari nomor atau nama pelanggan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-black border border-slate-200 rounded-xl px-4 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="loading loading-spinner loading-lg text-teal-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Nomor</th>
                    <th className="px-6 py-3 text-left">Tanggal</th>
                    <th className="px-6 py-3 text-left">Pelanggan</th>
                    <th className="px-6 py-3 text-center">Items</th>
                    <th className="px-6 py-3 text-right">Grand Total</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-14 text-slate-400 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 mx-auto mb-3 text-slate-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <p className="font-medium">{search ? "Tidak ada quotation yang cocok" : "Belum ada quotation barang"}</p>
                        {!search && <p className="text-xs mt-1 text-slate-300">Klik &quot;Buat Quotation&quot; untuk memulai.</p>}
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q) => (
                      <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-700 text-xs font-semibold">{q.quotationNumber}</td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(q.date)}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {q.customerId?.name || q.customerId?.bussinessName || q.customCustomer?.name || "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                            {q.items?.length ?? 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">{IDR(q.grandTotal)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[q.status] ?? ""}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-view-gq-${q._id}`}
                              onClick={() => openView(q)}
                              title="Lihat detail"
                              className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              </svg>
                            </button>
                            <button
                              id={`btn-print-gq-${q._id}`}
                              onClick={() => window.open(`/sales/goods-quotation/print?id=${q._id}`, "_blank")}
                              title="Cetak"
                              className="bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                              </svg>
                            </button>
                            {!q.locked && (
                              <button
                                id={`btn-edit-gq-${q._id}`}
                                onClick={() => openEdit(q)}
                                title="Edit"
                                className="bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                                </svg>
                              </button>
                            )}
                            {!q.locked && (
                              <button
                                id={`btn-delete-gq-${q._id}`}
                                onClick={() => handleDelete(q)}
                                title="Hapus"
                                className="bg-red-50 hover:bg-red-100 text-red-600 text-xs px-2.5 py-1.5 rounded-lg transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                              </button>
                            )}
                            {/* Status dropdown */}
                            <div className="dropdown dropdown-left">
                              <button tabIndex={0} className="bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs px-2.5 py-1.5 rounded-lg transition-all" title="Ubah status">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                              </button>
                              <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-xl bg-white rounded-xl border border-slate-100 w-36 text-xs">
                                {(["draft", "sent", "accepted", "rejected", "expired"] as const).map((s) => (
                                  <li key={s}>
                                    <button onClick={() => handleStatusChange(q, s)} className={q.status === s ? "font-bold" : ""}>
                                      {s}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
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

      {/* ── Create/Edit Modal ──────────────────────────────────────────────── */}
      <dialog ref={createModalRef} id="modal-create-goods-quotation" className="modal">
        <div className="modal-box rounded-2xl max-w-4xl w-full p-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-8 py-5 flex items-center gap-3 flex-shrink-0">
            <div className="bg-white/20 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{editTarget ? "Edit Quotation" : "Buat Quotation Barang"}</h2>
              <p className="text-teal-100 text-xs">{editTarget ? editTarget.quotationNumber : "Isi form di bawah untuk membuat penawaran harga barang"}</p>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-8">
            {/* Customer section */}
            <div className="mb-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Informasi Pelanggan</p>
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setCustomerMode("custom")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${customerMode === "custom" ? "bg-teal-700 text-white shadow-lg shadow-teal-200" : "bg-slate-100 text-slate-600"}`}
                >
                  Manual / Custom
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${customerMode === "existing" ? "bg-teal-700 text-white shadow-lg shadow-teal-200" : "bg-slate-100 text-slate-600"}`}
                >
                  Dari Database
                </button>
              </div>

              {customerMode === "custom" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Nama Pelanggan <span className="text-red-500">*</span></label>
                    <input
                      value={custName} onChange={(e) => setCustName(e.target.value)}
                      className={inp} placeholder="Nama pelanggan atau perusahaan"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Telepon</label>
                    <input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className={inp} placeholder="08xx" />
                  </div>
                  <div>
                    <label className={lbl}>Email</label>
                    <input value={custEmail} onChange={(e) => setCustEmail(e.target.value)} className={inp} placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className={lbl}>Alamat</label>
                    <input value={custAddress} onChange={(e) => setCustAddress(e.target.value)} className={inp} placeholder="Alamat" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={lbl}>Pilih Pelanggan</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className={`${inp} bg-white`}
                  >
                    <option value="">— Pilih pelanggan —</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>{c.bussinessName || c.name} ({c.name})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div>
                <label className={lbl}>Berlaku Hingga</label>
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className={`${inp} bg-white`}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Item Barang</p>
                <button
                  id="btn-add-item-to-quotation"
                  type="button"
                  onClick={openProductPicker}
                  className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs px-3 py-2 rounded-xl transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Tambah Barang
                </button>
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 text-center text-slate-400 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10 mx-auto mb-2 text-slate-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                  Klik &quot;Tambah Barang&quot; untuk memilih produk dari katalog
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="table w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2 text-left">Barang</th>
                        <th className="px-4 py-2 text-right w-20">Qty</th>
                        <th className="px-4 py-2 text-left w-24">Satuan</th>
                        <th className="px-4 py-2 text-right w-36">Harga Satuan</th>
                        <th className="px-4 py-2 text-center w-28">Diskon</th>
                        <th className="px-4 py-2 text-center w-24">Pajak</th>
                        <th className="px-4 py-2 text-right w-32">Sub Total</th>
                        <th className="px-4 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{it.productName}</p>
                            {it.variantName && <p className="text-slate-400">{it.variantName}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number" min="1"
                              value={it.qty}
                              onChange={(e) => updateItem(i, "qty", Number(e.target.value) || 1)}
                              className="text-black w-16 border border-slate-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500">{it.unit}</td>
                          <td className="px-4 py-3">
                            <NumericFormat
                              value={it.unitPrice}
                              onValueChange={(v) => updateItem(i, "unitPrice", v.floatValue ?? 0)}
                              thousandSeparator="."
                              decimalSeparator=","
                              prefix="Rp "
                              className="text-black w-full border border-slate-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <select
                                value={it.discountType}
                                onChange={(e) => updateItem(i, "discountType", e.target.value)}
                                className="text-black border border-slate-200 rounded-lg px-1 py-1 text-xs bg-white focus:outline-none"
                              >
                                <option value="none">—</option>
                                <option value="percent">%</option>
                                <option value="fixed">Rp</option>
                              </select>
                              {it.discountType !== "none" && (
                                <input
                                  type="number" min="0"
                                  value={it.discountValue}
                                  onChange={(e) => updateItem(i, "discountValue", Number(e.target.value) || 0)}
                                  className="text-black w-14 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            <select
                              value={it.applicableTax}
                              onChange={(e) => updateItem(i, "applicableTax", e.target.value)}
                              className="text-black border border-slate-200 rounded-lg px-1 py-1 text-xs bg-white focus:outline-none"
                            >
                              <option value="none">Tidak ada</option>
                              <option value="ppn">PPN 11%</option>
                              <option value="ppn12">PPN 12%</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {IDR(calcItemSubtotal(it))}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals */}
            {items.length > 0 && (
              <div className="flex justify-end mb-6">
                <div className="w-80 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-semibold">{IDR(totals.subtotal)}</span>
                  </div>
                  {/* Global discount */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-500 text-sm flex-shrink-0">Diskon Global</span>
                    <select
                      value={globalDiscType}
                      onChange={(e) => setGlobalDiscType(e.target.value as any)}
                      className="text-black border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                    >
                      <option value="none">—</option>
                      <option value="percent">%</option>
                      <option value="fixed">Rp</option>
                    </select>
                    {globalDiscType !== "none" && (
                      <input
                        type="number" min="0"
                        value={globalDiscVal}
                        onChange={(e) => setGlobalDiscVal(Number(e.target.value) || 0)}
                        className="text-black border border-slate-200 rounded-lg px-2 py-1 text-xs w-24"
                      />
                    )}
                  </div>
                  {totals.totalDiscount > 0 && (
                    <div className="flex justify-between text-sm mb-2 text-red-600">
                      <span>- Diskon</span>
                      <span>{IDR(totals.totalDiscount)}</span>
                    </div>
                  )}
                  {totals.totalTax > 0 && (
                    <div className="flex justify-between text-sm mb-2 text-blue-600">
                      <span>+ Pajak</span>
                      <span>{IDR(totals.totalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-2 mt-2">
                    <span>Grand Total</span>
                    <span className="text-teal-700">{IDR(totals.grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className={lbl}>Catatan</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className={`${inp} h-24 resize-none`} placeholder="Catatan untuk pelanggan…" />
              </div>
              <div>
                <label className={lbl}>Syarat & Ketentuan</label>
                <textarea value={termsConditions} onChange={(e) => setTermsConditions(e.target.value)} className={`${inp} h-24 resize-none`} placeholder="Syarat & ketentuan penawaran…" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 bg-white">
            <button
              type="button"
              onClick={() => { createModalRef.current?.close(); resetForm() }}
              className="border border-slate-200 text-slate-600 font-semibold rounded-xl px-6 py-2.5 hover:bg-slate-50 transition-colors text-sm"
            >
              Batal
            </button>
            <button
              id="btn-submit-goods-quotation"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-semibold rounded-xl px-8 py-2.5 transition-colors text-sm shadow-lg shadow-teal-200 flex items-center gap-2"
            >
              {submitting ? <span className="loading loading-spinner loading-xs" /> : null}
              {editTarget ? "Simpan Perubahan" : "Buat Quotation"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={resetForm}>close</button></form>
      </dialog>

      {/* ── Product Picker Modal ───────────────────────────────────────────── */}
      <dialog ref={productPickerRef} id="modal-product-picker" className="modal">
        <div className="modal-box rounded-2xl max-w-2xl p-0 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
          <div className="bg-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-white">
                {pickerStep === "catalog" ? "Pilih Katalog" : `Pilih Varian — ${selectedCatalog?.name}`}
              </h3>
              <p className="text-slate-400 text-xs">
                {pickerStep === "catalog" ? "Klik katalog untuk melihat varian" : "Klik varian untuk ditambahkan ke quotation"}
              </p>
            </div>
            {pickerStep === "variant" && (
              <button
                type="button"
                onClick={() => { setPickerStep("catalog"); setSelectedCatalog(null) }}
                className="text-slate-400 hover:text-white text-sm font-semibold transition-colors"
              >
                ← Kembali
              </button>
            )}
          </div>

          <div className="p-4 border-b border-slate-100 flex-shrink-0">
            {pickerStep === "catalog" && (
              <input
                type="search"
                placeholder="Cari katalog…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="text-black w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {pickerStep === "catalog" ? (
              <div className="p-4 grid grid-cols-2 gap-3">
                {filteredCatalogs.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => selectCatalog(c)}
                    className="text-left p-4 bg-white border border-slate-100 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-all group"
                  >
                    <p className="font-semibold text-slate-800 group-hover:text-teal-700 text-sm">{c.name}</p>
                    {c.category && <p className="text-xs text-slate-400 mt-0.5">{c.category}</p>}
                    <p className="text-xs text-slate-300 mt-1 font-mono">{c.catalogCode}</p>
                  </button>
                ))}
                {filteredCatalogs.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-400 text-sm">Tidak ada katalog</div>
                )}
              </div>
            ) : (
              <div className="p-4">
                {variantsLoading ? (
                  <div className="flex justify-center py-10"><span className="loading loading-spinner loading-md text-teal-600" /></div>
                ) : variants.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Tidak ada varian tersedia</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {variants.map((v) => {
                      const alreadyAdded = items.some((it) => it.productId === v._id)
                      return (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => addVariantToItems(v)}
                          className={`flex items-center justify-between p-4 border rounded-xl text-left transition-all ${alreadyAdded ? "border-teal-300 bg-teal-50" : "border-slate-100 bg-white hover:border-teal-300 hover:bg-teal-50"}`}
                        >
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{v.variantName}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{v.productId}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800 text-sm">{IDR(v.sellingPrice)}</p>
                            {alreadyAdded && <span className="text-xs text-teal-600 font-semibold">✓ Ditambahkan</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* ── View Modal ────────────────────────────────────────────────────── */}
      <dialog ref={viewModalRef} id="modal-view-goods-quotation" className="modal">
        {viewTarget && (
          <div className="modal-box rounded-2xl max-w-2xl p-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-slate-400 text-xs font-mono">{viewTarget.quotationNumber}</p>
                <h3 className="text-xl font-bold text-white">Detail Quotation</h3>
              </div>
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColors[viewTarget.status] ?? ""}`}>
                {viewTarget.status}
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Pelanggan</p>
                  <p className="text-slate-800 font-semibold mt-0.5">
                    {viewTarget.customerId?.name || viewTarget.customerId?.bussinessName || viewTarget.customCustomer?.name || "-"}
                  </p>
                  {viewTarget.customCustomer?.phone && <p className="text-xs text-slate-500">{viewTarget.customCustomer.phone}</p>}
                  {viewTarget.customCustomer?.address && <p className="text-xs text-slate-500">{viewTarget.customCustomer.address}</p>}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold">Tanggal</p>
                  <p className="text-slate-800 font-semibold mt-0.5">{formatDate(viewTarget.date)}</p>
                  {viewTarget.validUntil && (
                    <>
                      <p className="text-xs text-slate-400 font-semibold mt-2">Berlaku Hingga</p>
                      <p className="text-slate-800 text-sm">{formatDate(viewTarget.validUntil)}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
                <table className="table w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 text-left">Barang</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Harga</th>
                      <th className="px-4 py-2 text-right">Sub Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewTarget.items ?? []).map((it: any, i: number) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{it.productName}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">{it.qty} {it.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{IDR(it.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{IDR(it.subTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mb-4">
                <div className="w-64 bg-slate-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                    <span>Grand Total</span>
                    <span className="text-teal-700">{IDR(viewTarget.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {viewTarget.note && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">Catatan:</p>
                  <p>{viewTarget.note}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
              <button
                onClick={() => window.open(`/sales/goods-quotation/print?id=${viewTarget._id}`, "_blank")}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                Cetak / Print
              </button>
              <div className="flex gap-3">
                <button onClick={() => { viewModalRef.current?.close(); openEdit(viewTarget) }} className="bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-sm px-5 py-2 rounded-xl transition-colors">
                  Edit
                </button>
                <button onClick={() => viewModalRef.current?.close()} className="border border-slate-200 text-slate-600 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  )
}
