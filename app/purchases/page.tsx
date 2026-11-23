/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import Link from "next/link"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import withAuth from "@/hofs/withAuth"
import { Controller, useForm } from "react-hook-form"
import { NumericFormat } from "react-number-format"
import React, { useRef, useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  CoinsDollarIcon,
  Edit03Icon,
  Cancel02Icon,
  CheckmarkCircle01Icon,
  MultiplicationSignIcon,
  BadgePercentIcon,
  Link01Icon
} from "@hugeicons/core-free-icons"

function Purchases() {
  const user = useAuth((state) => state.userId)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const orderRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const taxRef = useRef<HTMLDialogElement>(null)
  const nonCashRef = useRef<HTMLDialogElement>(null)
  const linkEditRef = useRef<HTMLDialogElement>(null)

  const [filterType, setFilterType] = useState<string>("product")
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pr, setPr] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [taxes, setTaxes] = useState<any[]>([])
  const [selectedPrForTax, setSelectedPrForTax] = useState<any>(null)
  const [poAvailableBalance, setPoAvailableBalance] = useState<number | null>(null)
  const [poBalanceLoading, setPoBalanceLoading] = useState(false)
  const [selectedPoBankAccountId, setSelectedPoBankAccountId] = useState<string | undefined>(undefined)
  const [nonCashEditTarget, setNonCashEditTarget] = useState<any>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [fPrice, setFPrice] = useState<number>(0)
  const [newFPrice, setNewFPrice] = useState<number>(0)

  // ─── State multi-item untuk Add PR ────────────────────────────────────────
  // Setiap entry: { productId, quantity, finalPrice (opsional), note (opsional) }
  const [addItems, setAddItems] = useState<any[]>([])
  // Form sementara untuk satu item yang sedang diisi
  const [addItemDraft, setAddItemDraft] = useState<any>({ productId: "", itemType: "inventory", quantity: 1, finalPrice: "", note: "" })
  // Mode override total: jika true, user bisa isi total manual
  const [addTotalOverride, setAddTotalOverride] = useState<string>("")
  const [addTotalMode, setAddTotalMode] = useState<"auto" | "manual">("auto")

  // ─── State multi-item untuk Edit PR ────────────────────────────────────────
  const [editItems, setEditItems] = useState<any[]>([])
  const [editItemDraft, setEditItemDraft] = useState<any>({ productId: "", itemType: "inventory", quantity: 1, finalPrice: "", note: "" })
  const [editTotalOverride, setEditTotalOverride] = useState<string>("")
  const [editTotalMode, setEditTotalMode] = useState<"auto" | "manual">("auto")
  // PR yang sedang diedit (untuk akses data lengkap di modal edit)
  const [editingPurchase, setEditingPurchase] = useState<any>(null)

  // ─── Expand row untuk melihat detail item multi-item PR ──────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())


  function toggleExpand(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  // ─── Riwayat harga terakhir saat pilih item ───────────────────────────────
  const [addLastPriceInfo, setAddLastPriceInfo] = useState<any>(null)
  const [addLastPriceLoading, setAddLastPriceLoading] = useState(false)
  const [editLastPriceInfo, setEditLastPriceInfo] = useState<any>(null)
  const [editLastPriceLoading, setEditLastPriceLoading] = useState(false)

  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false)

  const bankAccount = useFetch<any[], any>({
    url: "",
    method: "GET",
    onError: (message) => alert(message),
  })

  const getProductsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getSuppliersFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getItemsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getAssetsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getVendorsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getTaxesFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const addFn = useFetch<any, any>({
    url: "/api/web/purchases",
    method: "POST",
    onError: (message) => alert(message),
  })

  const editFn = useFetch<any, any>({
    url: "/api/web/purchases",
    method: "PUT",
    onError: (message) => alert(message),
  })

  const editLinkFn = useFetch<any, any>({
    url: "/api/web/purchases/link",
    method: 'PUT',
    onError: (message) => alert(message),
  })

  const editForm = useForm()
  const orderForm = useForm()
  const nonCashForm = useForm()
  const editLinkForm = useForm()

  const newPrForm = useForm({
    defaultValues: {
      finalPrice: "",
      description: "",
      quantity: "",
      vendorId: "",
      productId: "",
      supplierId: "",
      customSupplier: "",
      customDate: new Date().toISOString().split("T")[0],
    },
  })

  const taxForm = useForm()

  const watchPayAmount = orderForm.watch("payAmount")
  const watchPaymentMethod = orderForm.watch("paymentMethod")
  const watchTaxFormTaxIds = taxForm.watch("taxIds") || []

  // ─── Fetch riwayat harga terakhir untuk item yang dipilih ───────────────────
  async function fetchLastPurchasePrice(productId: string, form: "add" | "edit") {
    if (!productId || !masterAccountId) {
      if (form === "add") setAddLastPriceInfo(null)
      else setEditLastPriceInfo(null)
      return
    }

    if (form === "add") {
      setAddLastPriceLoading(true)
      setAddLastPriceInfo(null)
    }
    else {
      setEditLastPriceLoading(true)
      setEditLastPriceInfo(null)
    }

    try {
      const res = await fetch(
        `/api/web/purchases/last-price?id=${masterAccountId}&productId=${productId}&purchaseType=${filterType}`
      )
      const json = await res.json()

      if (form === "add") {
        setAddLastPriceInfo(json.noResult ? null : json.result)
      } else {
        setEditLastPriceInfo(json.noResult ? null : json.result)
      }
    }
    catch {
      if (form === "add") {
        setAddLastPriceInfo(null)
      }
      else {
        setEditLastPriceInfo(null)
      }
    }
    finally {
      if (form === "add") setAddLastPriceLoading(false)
      else setEditLastPriceLoading(false)
    }
  }

  // ─── Fetch saldo tersedia untuk form Buat PO ─────────────────────────────────
  async function fetchPoBalance(method: string, bankAccountId?: string, date?: string) {
    if (!masterAccountId) return
    setPoBalanceLoading(true)
    try {
      const params = new URLSearchParams({ id: masterAccountId, paymentMethod: method })
      if (bankAccountId) params.set('bankAccountId', bankAccountId)
      if (date) params.set('date', date)
      const res = await fetch(`/api/web/finance/balance?${params}`)
      const json = await res.json()
      if (!json.error) setPoAvailableBalance(json.result ?? 0)
      else setPoAvailableBalance(null)
    } catch {
      setPoAvailableBalance(null)
    } finally {
      setPoBalanceLoading(false)
    }
  }

  function fAsset(_id: string) {
    return assets?.find((f) => String(f._id) === String(_id))
  }

  function getPurchaseName(purchase: any) {
    // Multi-item purchase
    if (Array.isArray(purchase.items) && purchase.items.length > 0) {
      if (purchase.items.length === 1) {
        const it = purchase.items[0]
        const isAsset = it.itemType === 'asset' || (filterType === 'procurement' && it.product?.category && !it.product?.conversionRatioX)
        const name = it.product?.productName || it.product?.name || fAsset(it.productId)?.name || "-"
        return isAsset ? `${name}` : name
      }
      return `${purchase.items.length} item`
    }
    const isAssetSingle = purchase.itemType === 'asset' || (filterType === 'procurement' && purchase.product?.category && !purchase.product?.conversionRatioX)
    const name = purchase.description || purchase.product?.productName || purchase.product?.name || "-"
    return isAssetSingle ? `${name}` : name
  }

  function getPurchaseQuantity(purchase: any) {
    if (Array.isArray(purchase.items) && purchase.items.length > 0) {
      if (purchase.items.length === 1) {
        const it = purchase.items[0]
        const isAsset = it.itemType === 'asset' || (filterType === 'procurement' && it.product?.category && !it.product?.conversionRatioX)
        const unit = isAsset
          ? (it.product?.measurement || fAsset(it.productId)?.measurement || `${it.product?.unit?.name}`)
          : filterType === "procurement"
            ? (typeof it.product?.unit === 'string' ? it.product?.unit : it.product?.unit?.symbol || "")
            : it.product?.conversionRatioX
        return `${it.quantity}${unit ? ` (${unit})` : ""}`
      }
      const totalQty = purchase.items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)
      return `${totalQty} total`
    }
    return null // fallback ke kolom quantity lama
  }

  function getSupplierVendorName(purchase: any) {
    if (filterType === "service") {
      return purchase.vendor?.name || "-"
    }

    if (filterType === "procurement") {
      return purchase.customSupplier || "-"
    }

    return (
      purchase?.supplier?.bussinessName ||
      purchase?.customSupplier ||
      "-"
    )
  }

  function getUnit(purchase: any) {
    const isAsset = purchase.itemType === 'asset' ||
      purchase.items?.[0]?.itemType === 'asset' ||
      (filterType === "procurement" && (purchase.product?.category || purchase.items?.[0]?.product?.category) && !purchase.product?.conversionRatioX)

    if (isAsset) {
      return purchase.product?.measurement ||
        purchase.items?.[0]?.product?.measurement ||
        fAsset(purchase.productId)?.measurement ||
        fAsset(purchase.items?.[0]?.productId)?.measurement ||
        "Unit"
    }


    if (filterType === "procurement") {
      const u = purchase.product?.unit || purchase.items?.[0]?.product?.unit
      return typeof u === 'string' ? u : u?.symbol || u?.name || "-"
    }

    return purchase.product?.conversionRatioX || purchase.items?.[0]?.product?.conversionRatioX || "-"
  }

  function getGrossPrice(purchase: any) {
    return (
      parseFloat(
        purchase?.grossFinalPrice ||
        purchase?.finalPrice ||
        0
      ) || 0
    )
  }

  function printPurchase(purchase: any) {
    const printWindow = window.open("", "_blank", "width=900,height=700")

    if (!printWindow) {
      alert("Popup diblokir browser. Izinkan popup untuk mencetak purchase.")
      return
    }

    const escapeHtml = (value: any) =>
      String(value ?? "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")

    const currency = (value: any) =>
      `Rp ${Number(value || 0).toLocaleString("id-ID")}`

    const date = purchase.date
      ? new Date(purchase.date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      : "-"

    const isMultiItem =
      Array.isArray(purchase.items) && purchase.items.length > 0

    const purchaseItems = isMultiItem
      ? purchase.items
      : [{
        product: purchase.product,
        quantity: purchase.quantity || 1,
        finalPrice: purchase.finalPrice,
        note: "",
      }]

    const rows = purchaseItems.map((item: any, index: number) => {
      const isAsset = item.itemType === 'asset' ||
        purchase.itemType === 'asset' ||
        (filterType === "procurement" && item.product?.category && !item.product?.conversionRatioX)

      const rawName = filterType === "service"
        ? purchase.description
        : filterType === "procurement"
          ? item.product?.name || fAsset(item.productId)?.name || "-"
          : item.product?.productName || item.product?.name || "-"

      const name = isAsset ? `${rawName}` : rawName

      const unit = isAsset
        ? (item.product?.measurement || fAsset(item.productId)?.measurement || "Unit")
        : filterType === "procurement"
          ? (typeof item.product?.unit === 'string' ? item.product?.unit : item.product?.unit?.symbol || "")
          : item.product?.conversionRatioX || ""

      const quantity = Number(item.quantity || 1)
      const price = Number(item.finalPrice || 0)
      const subtotal = quantity * price

      return `
      <tr>
        <td>${index + 1}</td>
        <td>
          ${escapeHtml(name)}
          ${unit ? `(${escapeHtml(unit)})` : ""}
        </td>
        <td class="number">${quantity.toLocaleString("id-ID")}</td>
        <td class="number">${currency(price)}</td>
        <td class="number">${currency(price)}</td>
        <td>${escapeHtml(item.note || "-")}</td>
      </tr>
    `
    }).join("")

    const total = Number(
      purchase.grossFinalPrice ??
      purchase.finalPrice ??
      0
    )

    const shippingCost = Number(purchase.shippingCost || 0)
    const taxAmount = Number(purchase.taxAmount || 0)

    const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>Purchase ${escapeHtml(purchase.purchaseOrderNumber)}</title>

      <style>
        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          color: #111;
          font-size: 12px;
          padding: 24px;
        }

        h2 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .subtitle {
          color: #666;
          margin-bottom: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #222;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .meta {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 8px;
          margin-bottom: 24px;
        }

        .meta strong {
          font-weight: 600;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 9px;
          text-align: left;
        }

        th {
          background: #f2f2f2;
        }

        .number {
          text-align: right;
          white-space: nowrap;
        }

        .summary {
          width: 320px;
          margin: 20px 0 0 auto;
        }

        .summary div {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
        }

        .grand-total {
          border-top: 2px solid #222;
          font-size: 15px;
          font-weight: bold;
          margin-top: 5px;
          padding-top: 10px !important;
        }

        .signatures {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 50px;
          margin-top: 80px;
          text-align: center;
        }

        .signature-line {
          border-top: 1px solid #222;
          padding-top: 8px;
          margin-top: 65px;
        }

        @media print {
          body {
            padding: 0;
          }

          @page {
            size: A4;
            margin: 15mm;
          }
        }
      </style>
    </head>

    <body>
      <div class="header">
        <div>
          <h2>PURCHASE REQUISITION</h2>
          <div class="subtitle">Purchase Document</div>
        </div>

        <div>
          <strong>${escapeHtml(purchase.purchaseOrderNumber)}</strong>
          <div>Status: ${escapeHtml(purchase.status)}</div>
        </div>
      </div>

      <div class="meta">
        <strong>Tanggal</strong>
        <span>${escapeHtml(date)}</span>

        <strong>Supplier / Vendor</strong>
        <span>${escapeHtml(getSupplierVendorName(purchase))}</span>

      </div>

      <table>
        <thead>
          <tr>
            <th width="35">No.</th>
            <th>Item / Produk</th>
            <th>Qty</th>
            <th>Harga</th>
            <th>Subtotal</th>
            <th>Catatan</th>
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="summary">
        <div>
          <span>Harga Purchase</span>
          <strong>${currency(total)}</strong>
        </div>

        ${shippingCost > 0 ? `
          <div>
            <span>Shipping Cost</span>
            <strong>${currency(shippingCost)}</strong>
          </div>
        ` : ""}

        ${taxAmount > 0 ? `
          <div>
            <span>Tax Amount</span>
            <strong>${currency(taxAmount)}</strong>
          </div>
        ` : ""}

        <div class="grand-total">
          <span>Total</span>
          <span>${currency(total + shippingCost + taxAmount)}</span>
        </div>
      </div>

      <div class="signatures">
        <div>
          <div class="signature-line">Dibuat oleh</div>
        </div>

        <div>
          <div class="signature-line">Disetujui oleh</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.focus()
          window.print()
        }
      </script>
    </body>
    </html>
  `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  function calculateTaxes(
    grossPrice: number,
    taxIds: string[]
  ) {
    let netPrice = grossPrice
    let totalDeduction = 0
    let totalAddition = 0

    const appliedTaxes = taxIds
      .map((taxId) => {
        const tax = taxes.find((item) => item._id === taxId)

        if (!tax) return null

        const amount = Math.round(
          (tax.value / 100) * grossPrice
        )

        const isPPh = Boolean(tax.isPPh)

        if (isPPh) {
          netPrice -= amount
          totalDeduction += amount
        } else {
          netPrice += amount
          totalAddition += amount
        }

        return {
          taxId: tax._id,
          name: tax.name,
          rate: tax.value,
          isPPh,
          amount,
          type: isPPh ? "deduction" : "addition",
        }
      })
      .filter(Boolean)

    return {
      netPrice,
      totalDeduction,
      totalAddition,
      appliedTaxes,
    }
  }

  function getTaxPreview() {
    if (!selectedPrForTax) return null

    const grossPrice = getGrossPrice(selectedPrForTax)

    return calculateTaxes(
      grossPrice,
      watchTaxFormTaxIds
    )
  }

  // ─── Tambah item ke daftar (multi-item draft) ──────────────────────────────
  function addItemToDraft() {
    if (!addItemDraft.productId) {
      alert("Pilih produk/item terlebih dahulu")
      return
    }
    if (!addItemDraft.quantity || parseFloat(addItemDraft.quantity) <= 0) {
      alert("Quantity harus lebih dari 0")
      return
    }
    // Cek apakah produk yang sama sudah ada di list
    const existing = addItems.find(i => i.productId === addItemDraft.productId)
    if (existing) {
      alert("Produk ini sudah ada dalam daftar. Hapus dulu jika ingin mengubahnya.")
      return
    }

    const fFinalPrice = addItemDraft.finalPrice !== "" ? parseFloat(addItemDraft.finalPrice) || 0 : 0

    // Temukan info produk untuk ditampilkan
    let prod: any = null
    let productLabel = ""
    const isAsset = filterType === "procurement" && addItemDraft.itemType === "asset"

    if (isAsset) {
      prod = assets.find((a: any) => a._id === addItemDraft.productId)
      productLabel = `${prod?.name || "Asset"} (${prod?.measurement || "Unit"})`
    } else if (filterType === "procurement") {
      prod = items.find((p: any) => p._id === addItemDraft.productId)
      productLabel = `${prod?.name || ""} (${prod?.unit || ""})`
    } else {
      prod = products.find((p: any) => p._id === addItemDraft.productId)
      productLabel = `${prod?.productName || ""} (${prod?.conversionRatioX || ""})`
    }

    setAddItems(prev => [...prev, {
      productId: addItemDraft.productId,
      itemType: isAsset ? "asset" : (filterType === "product" ? "product" : "inventory"),
      quantity: parseFloat(addItemDraft.quantity),
      finalPrice: fFinalPrice,
      note: addItemDraft.note || "",
      _productLabel: productLabel,
      _product: prod,
      ppu: fFinalPrice / parseFloat(addItemDraft.quantity)
    }])
    // Reset draft
    setAddItemDraft({ productId: "", itemType: isAsset ? "asset" : "inventory", quantity: 1, finalPrice: "", note: "" })
    setAddLastPriceInfo(null)
  }

  function removeItemFromDraft(index: number) {
    setAddItems(prev => prev.filter((_, i) => i !== index))
  }

  // Hitung auto total dari items
  function calcAddItemsTotal() {
    return addItems.reduce((sum, it) => sum + (it.finalPrice || 0), 0)
  }

  // ─── Tambah item ke daftar edit (multi-item edit draft) ───────────────────
  function addEditItemToDraft() {
    if (!editItemDraft.productId) {
      alert("Pilih produk/item terlebih dahulu")
      return
    }
    if (!editItemDraft.quantity || parseFloat(editItemDraft.quantity) <= 0) {
      alert("Quantity harus lebih dari 0")
      return
    }
    const existing = editItems.find(i => i.productId === editItemDraft.productId)
    if (existing) {
      alert("Produk ini sudah ada dalam daftar. Hapus dulu jika ingin mengubahnya.")
      return
    }

    let prod: any = null
    let productLabel = ""
    const isAsset = filterType === "procurement" && editItemDraft.itemType === "asset"

    if (isAsset) {
      prod = assets.find((a: any) => a._id === editItemDraft.productId)
      productLabel = `${prod?.name || "Asset"} (${prod?.category?.name || "Aset"})`
    }
    else if (filterType === "procurement") {
      prod = items.find((p: any) => p._id === editItemDraft.productId)
      productLabel = `${prod?.name || ""} (${prod?.unit || ""})`
    }
    else {
      prod = products.find((p: any) => p._id === editItemDraft.productId)
      productLabel = `${prod?.productName || ""} (${prod?.conversionRatioX || ""})`
    }

    setEditItems(prev => [...prev, {
      productId: editItemDraft.productId,
      itemType: isAsset ? "asset" : (filterType === "product" ? "product" : "inventory"),
      quantity: parseFloat(editItemDraft.quantity),
      finalPrice: editItemDraft.finalPrice !== "" ? parseFloat(editItemDraft.finalPrice) || 0 : 0,
      note: editItemDraft.note || "",
      _productLabel: productLabel,
      _product: prod,
      pricePerUnit: editItemDraft.finalPrice / editItemDraft.quantity
    }])
    setEditItemDraft({ productId: "", itemType: isAsset ? "asset" : "inventory", quantity: 1, finalPrice: "", note: "" })
    setEditLastPriceInfo(null)
  }

  function removeEditItemFromDraft(index: number) {
    setEditItems(prev => prev.filter((_, i) => i !== index))
  }

  function calcTotal(_id: string) {
    const purchase = pr.find((item) => item._id === _id)
    if (!purchase) return 0

    if (Array.isArray(purchase.items) && purchase.items.length > 0) {
      const total = purchase.items.reduce((sum: number, it: any) => sum + (it.finalPrice || 0), 0)
      return total > 0 ? total : (purchase.finalPrice || 0)
    }

    return purchase.finalPrice || 0
  }

  function calcEditItemsTotal() {
    return editItems.reduce((sum, it) => sum + (it.finalPrice || 0), 0)
  }

  async function submit(data: any) {
    const isMultiItem = (filterType === "product" || filterType === "procurement")

    if (isMultiItem) {
      if (addItems.length === 0) {
        alert("Tambahkan setidaknya satu item")
        return
      }

      const autoTotal = calcAddItemsTotal()
      const finalPrice = addTotalMode === "manual" && addTotalOverride !== ""
        ? parseFloat(addTotalOverride) || 0
        : autoTotal

      const body = JSON.stringify({
        status: "requested",
        id: masterAccountId,
        date: data.customDate ? new Date(data.customDate) : new Date(),
        purchaseType: filterType,
        createdBy: user,
        customSupplier: data.customSupplier || "",
        items: addItems.map(it => ({
          productId: it.productId,
          itemType: it.itemType || (filterType === "procurement" ? "inventory" : "product"),
          quantity: it.quantity,
          finalPrice: it.finalPrice || 0,
          note: it.note || "",
          pricePerUnit: it.ppu
        })),
        finalPrice,
        ...(addTotalMode === "manual" && addTotalOverride !== "" ? { finalPriceOverride: parseFloat(addTotalOverride) } : {}),
      })

      addFn.fn("", body, (result) => {
        setPr((current) => [...current, result])
        modalRef.current?.close()
        newPrForm.reset()
        setAddItems([])
        setAddItemDraft({ productId: "", itemType: "inventory", quantity: 1, finalPrice: "", note: "" })
        setAddTotalOverride("")
        setAddTotalMode("auto")
        setAddLastPriceInfo(null)
        modalRef?.current?.close()
        window.location.href = '/purchases'
      })

      return
    }

    // Service: path lama
    // const body = JSON.stringify({
    //   ...data,
    //   status: "requested",
    //   id: masterAccountId,
    //   date: data.customDate ? new Date(data.customDate) : new Date(),
    //   purchaseType: filterType,
    //   createdBy: user,
    // })

    // console.log(JSON.parse(body))

    // addFn.fn("", body, (result) => {
    //   window.location.href = "/purchases"
    //   if (
    //     filterType === "service" &&
    //     data.vendorId &&
    //     vendors.length > 0
    //   ) {
    //     result.vendor = vendors.find(
    //       (vendor) => vendor._id === data.vendorId
    //     )
    //   }

    //   setPr((current) => [...current, result])
    //   modalRef.current?.close()
    //   newPrForm.reset()
    // })
  }

  function search(value: string) {
    if (!value.length) {
      setSearchResult([])
      return
    }

    const keyword = value.toLowerCase()

    const result = pr.filter((purchase) => {
      const name =
        filterType === "service"
          ? purchase.description
          : purchase.product?.productName ||
          purchase.product?.name ||
          ""

      const poNumber =
        purchase.purchaseOrderNumber || ""

      return (
        name.toLowerCase().includes(keyword) ||
        poNumber.toLowerCase().includes(keyword)
      )
    })

    setSearchResult(result)
  }

  async function editSubmit(data: any) {
    const target = pr.find(
      (purchase) => purchase._id === data._id
    )

    if (!target) return

    const isMultiItem = filterType === "product" || filterType === "procurement"

    if (isMultiItem) {
      if (editItems.length === 0) {
        alert("Tambahkan setidaknya satu item")
        return
      }

      const autoTotal = calcEditItemsTotal()
      const finalPrice = editTotalMode === "manual" && editTotalOverride !== ""
        ? parseFloat(editTotalOverride) || 0
        : autoTotal

      const payload = JSON.stringify({
        _id: data._id,
        date: data.customDate ? new Date(data.customDate) : undefined,
        action: "edit_pr",
        status: "requested",
        customSupplier: data.customSupplier || "",
        items: editItems.map(it => ({
          productId: it.productId,
          itemType: it.itemType || (filterType === "procurement" ? "inventory" : "product"),
          quantity: it.quantity,
          finalPrice: it.finalPrice || 0,
          note: it.note || "",
        })),
        finalPrice,
        ...(editTotalMode === "manual" && editTotalOverride !== "" ? { finalPriceOverride: parseFloat(editTotalOverride) } : {}),
      })

      await editFn.fn("", payload, () => {
        window.location.reload()
      })
      return
    }

    const payload = JSON.stringify({
      ...data,
      date: data.customDate ? new Date(data.customDate) : undefined,
      action: undefined,
      status: "requested",
    })

    await editFn.fn("", payload, (result) => {
      if (filterType === "service") {
        target.description = data.description
        target.finalPrice = data.finalPrice
        target.vendorId = data.vendorId
        target.vendor =
          vendors.find(
            (vendor) => vendor._id === data.vendorId
          ) || target.vendor
        if (data.customDate) target.date = new Date(data.customDate).toISOString()

        setPr([...pr])
        editRef.current?.close()
      }
    })
  }

  function openApplyTax(purchase: any) {
    setSelectedPrForTax(purchase)

    const appliedTaxIds =
      purchase.appliedTaxes?.map(
        (tax: any) => tax.taxId
      ) || []

    taxForm.reset({
      taxIds: appliedTaxIds,
    })

    taxRef.current?.showModal()
  }

  function openEditNonCash(purchase: any) {
    setNonCashEditTarget(purchase)
    nonCashForm.reset({
      _id: purchase._id,
      accountNumber: purchase.nonCashDst?.accountNumber || "",
      description: purchase.nonCashDst?.description || "",
    })
    nonCashRef.current?.showModal()
  }

  function openEditLink(p: any) {
    setNonCashEditTarget(p)
    editLinkForm.reset({
      link: p.link,
      _id: p._id
    })
    linkEditRef.current?.showModal()
  }

  async function editNonCashSubmit(data: any) {
    const payload = JSON.stringify({
      _id: data._id,
      action: "edit_noncash_dst",
      accountNumber: data.accountNumber,
      description: data.description,
    })


    await editFn.fn("", payload, () => {
      setPr((current) =>
        current.map((p) =>
          p._id !== data._id
            ? p
            : {
              ...p,
              nonCashDst: {
                accountNumber: data.accountNumber,
                description: data.description,
              },
            }
        )
      )
      nonCashRef.current?.close()
      setNonCashEditTarget(null)
    })
  }

  async function editLinkSubmit(data: any) {
    const payload = JSON.stringify({
      _id: data._id,
      link: data.link
    })

    await editLinkFn.fn("", payload, () => {
      window.location.href = "/purchases"
    })
  }

  async function applyTaxSubmit(data: any) {
    if (!selectedPrForTax) return

    const grossPrice = getGrossPrice(
      selectedPrForTax
    )

    const taxIds = data.taxIds || []

    const {
      netPrice,
      totalDeduction,
      totalAddition,
      appliedTaxes,
    } = calculateTaxes(grossPrice, taxIds)

    const confirmed = confirm(
      `Apply ${appliedTaxes.length} tax(es)?\n` +
      `Total Potongan: Rp ${totalDeduction.toLocaleString("id-ID")}\n` +
      `Total Tambahan: Rp ${totalAddition.toLocaleString("id-ID")}\n` +
      `Final price akan menjadi Rp ${netPrice.toLocaleString("id-ID")}.`
    )

    if (!confirmed) return

    const payload = JSON.stringify({
      _id: selectedPrForTax._id,
      action: "apply_pph_tax",
      appliedTaxes,
      grossFinalPrice: grossPrice,
      finalPrice: netPrice,
      userId: user,
    })

    await editFn.fn("", payload, () => {
      setPr((current) =>
        current.map((purchase) => {
          if (
            purchase._id !==
            selectedPrForTax._id
          ) {
            return purchase
          }

          return {
            ...purchase,
            finalPrice: netPrice,
            grossFinalPrice: grossPrice,
            appliedTaxes,

            // Hapus format tax lama
            pphTaxName: undefined,
            pphTaxRate: undefined,
            pphDeduction: undefined,
          }
        })
      )

      taxRef.current?.close()
      setSelectedPrForTax(null)
      taxForm.reset({ taxIds: [] })
    })
  }

  async function orderSubmit(data: any) {
    const finalPrice =
      parseFloat(data.finalPrice) || 0

    const payAmount =
      parseFloat(data.payAmount) || 0

    const shippingCost =
      parseFloat(data.shippingCost) || 0

    const taxAmount =
      parseFloat(data.taxAmount) || 0

    const netFinalPrice = finalPrice

    const totalLandedCost =
      netFinalPrice +
      shippingCost +
      taxAmount

    if (filterType === "product") {
      if (finalPrice <= 0) {
        alert("Price harus lebih dari 0")
        return
      }
    }
    else if (watchPayAmount === "") {
      alert("Please enter pay amount")
      orderForm.setValue("payAmount", 0)
      return
    }

    if (payAmount > totalLandedCost) {
      alert(
        `Pay amount (${payAmount.toLocaleString()}) ` +
        `tidak boleh melebihi total landed cost ` +
        `(${totalLandedCost.toLocaleString()})`
      )
      return
    }

    if (payAmount > 0 && poAvailableBalance !== null && payAmount > poAvailableBalance) {
      alert(
        `Saldo ${watchPaymentMethod || 'Cash'} tidak mencukupi.\n` +
        `Saldo tersedia: Rp ${poAvailableBalance.toLocaleString('id-ID')}\n` +
        `Jumlah pembayaran: Rp ${payAmount.toLocaleString('id-ID')}`
      )
      return
    }

    const payload = JSON.stringify({
      ...data,
      finalPrice,
      grossFinalPrice: undefined,
      appliedTaxes: [],
      shippingCost,
      taxAmount,
      payAmount,
      action: "convert_to_po",
      status:
        filterType === "product"
          ? undefined
          : "_approved",
      purchaseType: filterType,
      userId: user,
      bankAccountId: watchPaymentMethod !== 'Cash' ? selectedPoBankAccountId : undefined,
      nonCashDstNumber: data.nonCashDstNumber != "" ? data.nonCashDstNumber : '-',
      nonCashDstDescription: data.nonCashDstDesc != "" ? data.nonCashDstDesc : '-',
      link: data.link
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  function openOrder(id: string) {
    let fPriceX = 0;

    const purchase = pr.find(
      (item) => item._id === id
    )

    if (!purchase) return

    const { finalPrice, items } = purchase

    if (Array.isArray(items)) {
      items.forEach((it: any) => {
        fPriceX += it.finalPrice || 0
      })
    }

    // Determine product display label for multi-item
    const isMultiItem = Array.isArray(purchase.items) && purchase.items.length > 0

    const ffPrice = fPriceX > 0 ? fPriceX : finalPrice;

    if (filterType === "product") {
      const productLabel = isMultiItem
        ? purchase.items.map((it: any) => it.product?.productName || "-").join(", ")
        : purchase.product?.productName
      orderForm.reset({
        _id: purchase._id,
        finalPrice: ffPrice,
        product: productLabel,
        customSupplier: purchase.customSupplier || "",
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: "Cash",
      })
    }

    if (filterType === "procurement") {
      const productLabel = isMultiItem
        ? purchase.items.map((it: any) => {
          const isAsset = it.itemType === 'asset' || (it.product?.category && !it.product?.conversionRatioX)
          const name = it.product?.name || fAsset(it.productId)?.name || "-"
          return isAsset ? `${name}` : name
        }).join(", ")
        : (() => {
          const isAsset = purchase.itemType === 'asset' || (purchase.product?.category && !purchase.product?.conversionRatioX)
          const name = purchase.product?.name || "-"
          return isAsset ? `${name}` : name
        })()
      orderForm.reset({
        _id: purchase._id,
        finalPrice: ffPrice,
        product: productLabel,
        customSupplier: purchase.customSupplier,
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: "Cash",
      })
    }

    if (filterType === "service") {
      orderForm.reset({
        _id: purchase._id,
        description:
          purchase.description,
        finalPrice: purchase.finalPrice,
        status: purchase.status,
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: "Cash",
        pphTaxId: "",
        vendorId: purchase.vendorId,
      })
    }

    setSelectedPurchase(purchase)
    orderRef.current?.showModal()
    setPoAvailableBalance(null)
    fetchPoBalance('Cash', undefined, new Date().toISOString().split('T')[0])
  }

  function openEdit(id: string) {
    let fPriceX = 0;

    const purchase = pr.find(
      (item) => item._id === id
    )

    if (!purchase) return

    const { _id, items: purchaseItems, customSupplier, date, description, finalPrice, vendorId } = purchase

    // Reset riwayat harga sebelum fetch yang baru
    setEditLastPriceInfo(null)

    const isMultiItem = Array.isArray(purchaseItems) && purchaseItems.length > 0

    if (filterType === "product" || filterType === "procurement") {
      // Load existing items into editItems state
      if (isMultiItem) {
        const loaded = purchaseItems.map((it: any) => {
          const isAsset = it.itemType === 'asset' || (!it.product?.unit && it.product?.category)
          const prod = it.product || (isAsset
            ? assets.find((a: any) => String(a._id) === String(it.productId?._id || it.productId))
            : (filterType === "procurement" ? items : products).find((p: any) => String(p._id) === String(it.productId?._id || it.productId)))

          let label = ""
          if (filterType === "procurement") {
            label = isAsset
              ? `${prod?.name || it.product?.name || "Asset"} (${prod?.category?.name || it.product?.category?.name || "Aset"})`
              : `${prod?.name || it.product?.name || "Item"} (${prod?.unit || it.product?.unit || ""})`
          } else {
            label = `${prod?.productName || it.product?.productName || "Produk"} (${prod?.conversionRatioX || it.product?.conversionRatioX || ""})`
          }

          fPriceX += it.finalPrice

          return {
            productId: it.productId?._id || it.productId,
            itemType: isAsset ? "asset" : (filterType === "product" ? "product" : "inventory"),
            quantity: it.quantity,
            finalPrice: it.finalPrice,
            note: it.note || "",
            _productLabel: label,
            _product: prod,
            pricePerUnit: it.pricePerUnit
          }
        })

        console.log({ loaded })


        setEditItems(loaded)
      }
      else {
        // Single item legacy – wrap as single-element editItems
        // const prod = purchase.product
        // const productId = prod?._id || purchase.productId
        // const label = filterType === "procurement"
        //   ? `${prod?.name || ""} (${prod?.unit || ""})`
        //   : `${prod?.productName || ""} (${prod?.conversionRatioX || ""})`
        // const legacyFinalPrice = typeof purchase.finalPrice === 'number'
        //   ? purchase.finalPrice
        //   : (parseFloat(purchase.finalPrice) || 0)
        // setEditItems([{
        //   productId,
        //   quantity: purchase.quantity || 1,
        //   finalPrice: legacyFinalPrice,
        //   note: "",
        //   _productLabel: label,
        //   _product: prod,
        // }])
      }
      // Determine auto/manual total mode
      setEditTotalMode("auto")
      setEditTotalOverride("")
      setEditItemDraft({ productId: "", quantity: 1, finalPrice: "", note: "" })
      if (fPriceX > 0) {
        setFPrice(fPriceX)
      }
      else {
        setFPrice(finalPrice)
      }

      editForm.reset({
        _id: _id,
        customSupplier: customSupplier || "",
        customDate: date
          ? new Date(date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      })
    }

    if (filterType === "service") {
      editForm.reset({
        _id: _id,
        description:
          description,
        finalPrice: finalPrice,
        vendorId: vendorId,
        customDate: date
          ? new Date(date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      })
    }

    editRef.current?.showModal()
  }

  async function approve(id: string) {
    const payload = JSON.stringify({
      _id: id,
      action: "approve_pr",
      userId: user,
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  async function reject(id: string) {
    if (
      !confirm(
        "Are you sure you want to reject this requisition?"
      )
    ) {
      return
    }

    const payload = JSON.stringify({
      _id: id,
      action: "reject_pr",
      userId: user,
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  function makeVoid(purchase: any) {
    const approvalCode = prompt(
      "Enter approval code to void"
    )

    if (!approvalCode) {
      if (approvalCode === "") {
        alert("Please enter approval code")
      }

      return
    }

    const payload = JSON.stringify({
      _id: purchase._id,
      status: "void",
      approvalCode,
      voidedBy: user,
      voidedAt: new Date(),
    })

    editFn.fn("", payload, (result) => {
      if (result === null) return

      setPr((current) =>
        current.map((item) =>
          item._id === purchase._id
            ? {
              ...item,
              status: "void",
            }
            : item
        )
      )
    })
  }


  useEffect(() => {
    setFPrice(
      editItems.reduce((sum, item) => sum + (Number(item.finalPrice) || 0), 0)
    )
  }, [editItems])

  useEffect(() => {
    if (!hasHydrated) return

    setSearchResult([])

    const url =
      `/api/web/purchases` +
      `?id=${masterAccountId}` +
      `&f=requested` +
      `&type=${filterType}`

    const bankUrl =
      `/api/web/bank-accounts?id=${masterAccountId}`

    const body = JSON.stringify({})

    bankAccount.fn(
      bankUrl,
      body,
      () => { }
    )

    if (filterType === "product") {
      getProductsFn.fn(
        `/api/web/products?id=${masterAccountId}&type=good`,
        body,
        setProducts
      )

      getSuppliersFn.fn(
        `/api/web/suppliers?id=${masterAccountId}`,
        body,
        setSuppliers
      )
    }

    if (filterType === "procurement") {
      getItemsFn.fn(
        `/api/web/inv-items?id=${masterAccountId}`,
        body,
        setItems
      )
      getAssetsFn.fn(
        `/api/web/assets?id=${masterAccountId}`,
        body,
        setAssets
      )
    }

    if (filterType === "service") {
      getVendorsFn.fn(
        `/api/web/vendor?id=${masterAccountId}`,
        body,
        setVendors
      )

      getTaxesFn.fn(
        `/api/web/tax?id=${masterAccountId}`,
        body,
        setTaxes
      )
    }

    getFn.fn(
      url,
      body,
      setPr
    )
  }, [
    masterAccountId,
    hasHydrated,
    filterType,
  ])

  const displayedPurchases =
    searchResult.length > 0
      ? searchResult
      : pr

  const taxPreview = getTaxPreview()

  return (
    <>
      <div className="min-h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl text-black">
          Purchases Requisition
        </span>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          {/* FILTER */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex flex-row gap-2 items-center">
              <button
                onClick={() =>
                  setFilterType("product")
                }
                className={
                  `px-4 py-2 rounded-full text-sm font-semibold ` +
                  `transition-colors duration-200 ` +
                  (
                    filterType === "product"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )
                }
              >
                Barang
              </button>

              <button
                onClick={() =>
                  setFilterType("service")
                }
                className={
                  `px-4 py-2 rounded-full text-sm font-semibold ` +
                  `transition-colors duration-200 ` +
                  (
                    filterType === "service"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )
                }
              >
                Jasa
              </button>

              <button
                onClick={() =>
                  setFilterType("procurement")
                }
                className={
                  `px-4 py-2 rounded-full text-sm font-semibold ` +
                  `transition-colors duration-200 ` +
                  (
                    filterType === "procurement"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )
                }
              >
                Procurement
              </button>
            </div>

            <button
              onClick={() => {
                newPrForm.reset()
                setAddLastPriceInfo(null)
                modalRef.current?.showModal()
              }}
              className="btn ml-auto bg-blue-900 text-white hover:bg-blue-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>

              Add
            </button>
          </div>

          {/* TABLE */}
          {
            getFn.loading ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl" />
              </div>
            ) : getFn.error || getFn.noResult ? (
              <div>
                <p>{getFn.message}</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto w-full">
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>P.O Number</th>
                        <th>Link</th>

                        {filterType === "product" && (
                          <th>Created By</th>
                        )}

                        <th>
                          {
                            filterType === "service"
                              ? "Description"
                              : "Item/Product"
                          }
                        </th>

                        {filterType !== "service" && (
                          <th>Quantity</th>
                        )}

                        <th>Price</th>
                        <th>Status</th>
                        <th>Supplier / Vendor</th>
                        <th>...</th>
                      </tr>
                    </thead>

                    <tbody>

                      {displayedPurchases.map(
                        (purchase) => {
                          const itemName =
                            getPurchaseName(
                              purchase
                            )

                          const unit =
                            getUnit(purchase)

                          const supplierName =
                            getSupplierVendorName(
                              purchase
                            )

                          return (
                            <React.Fragment key={purchase._id}>
                              <tr>
                                <td>
                                  {new Date(
                                    purchase.date
                                  ).toLocaleDateString(
                                    "id-ID"
                                  )}
                                </td>

                                <td>
                                  {
                                    purchase.purchaseOrderNumber
                                  }
                                </td>


                                <td>
                                  {
                                    purchase.link ?? '-'
                                  }
                                </td>

                                {filterType === "product" && (
                                  <td>
                                    {
                                      purchase
                                        ?.createdBy
                                        ?.name
                                    }
                                  </td>
                                )}

                                <td
                                  onClick={() => {
                                    if (purchase.items?.length > 1) {
                                      setSelectedPurchase(purchase)
                                    }
                                  }}
                                  className={purchase.items?.length > 1 ? "hover:cursor-pointer underline" : ""}
                                >
                                  {itemName}
                                </td>

                                {filterType !== "service" && (
                                  <td
                                    className={Array.isArray(purchase.items) && purchase.items.length > 1 ? "cursor-pointer" : ""}
                                  >
                                    <div className="text-center">
                                      {(() => {
                                        const multiQty = getPurchaseQuantity(purchase)
                                        if (multiQty !== null && purchase.items?.length > 1) return '?'
                                        if (multiQty !== null) return `${multiQty}`
                                        return `${purchase.quantity} (${unit})`
                                      })()}
                                    </div>
                                  </td>
                                )}
                                <td>
                                  {purchase.items?.length > 0 ? calcTotal(purchase._id).toLocaleString("id-ID") : purchase.finalPrice.toLocaleString('id-ID')}
                                </td>
                                {
                                  /*
                                    <td>
                                      {
                                        purchase.status ===
                                          "ordered" ||
                                          purchase.status ===
                                          "completed"
                                          ? purchase.payAmount
                                          : "-"
                                      }
                                    </td>
                                */
                                }


                                <td>
                                  {purchase.status}
                                </td>

                                <td>
                                  {supplierName}
                                </td>
                                <td>
                                  <div className="flex flex-row justify-center items-center gap-2">
                                    {/* PRINT */}
                                    {["requested", "approved", "ordered"].includes(purchase.status) && (
                                      <button
                                        type="button"
                                        className="text-gray-700 hover:text-black"
                                        onClick={() => printPurchase(purchase)}
                                        title="Print Purchase"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          strokeWidth="1.7"
                                          stroke="currentColor"
                                          className="size-6"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6.75 8.25V3.75h10.5v4.5M6.75 17.25H4.5a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-2.25M6.75 14.25h10.5v6H6.75v-6Z"
                                          />
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M17.25 11.25h.008v.008h-.008z"
                                          />
                                        </svg>
                                      </button>
                                    )}

                                    {/* REQUESTED */}
                                    {purchase.status === "requested" && (
                                      <button
                                        type="button"
                                        className="text-blue-600"
                                        onClick={() => openEdit(purchase._id)}
                                        title="Edit"
                                      >
                                        <HugeiconsIcon
                                          icon={Edit03Icon}
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    )}

                                    {/* APPROVED */}
                                    {purchase.status === "approved" && (
                                      <button
                                        type="button"
                                        className="text-green-700"
                                        onClick={() => openOrder(purchase._id)}
                                        title="Create Purchase Order"
                                      >
                                        <HugeiconsIcon
                                          icon={CoinsDollarIcon}
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    )}

                                    {/* ORDERED SERVICE */}
                                    {purchase.status === "ordered" && filterType === "service" && (
                                      <>
                                        <button
                                          type="button"
                                          className="text-purple-600"
                                          onClick={() => openApplyTax(purchase)}
                                          title="Apply Tax"
                                        >
                                          <HugeiconsIcon
                                            icon={BadgePercentIcon}
                                            size={24}
                                            color="currentColor"
                                          />
                                        </button>

                                        <button
                                          type="button"
                                          className="text-red-600"
                                          onClick={() => makeVoid(purchase)}
                                          title="Void"
                                        >
                                          <HugeiconsIcon
                                            icon={Cancel02Icon}
                                            size={24}
                                            color="currentColor"
                                          />
                                        </button>
                                      </>
                                    )}

                                    {/* ORDERED PRODUCT / PROCUREMENT */}
                                    {purchase.status === "ordered" &&
                                      (filterType === "product" || filterType === "procurement") && (
                                        <button
                                          type="button"
                                          className="text-blue-600"
                                          onClick={() => openEditNonCash(purchase)}
                                          title="Edit Destinasi Non-Cash"
                                        >
                                          <HugeiconsIcon
                                            icon={Edit03Icon}
                                            size={24}
                                            color="currentColor"
                                          />
                                        </button>
                                      )
                                    }
                                    {
                                      (filterType === "product" || filterType === "procurement") && (
                                        <button
                                          type="button"
                                          className="text-blue-600"
                                          onClick={() => openEditLink(purchase)}
                                          title="Edit Link"
                                        >
                                          <HugeiconsIcon
                                            icon={Link01Icon}
                                            size={24}
                                            color="currentColor"
                                          />
                                        </button>
                                      )
                                    }
                                  </div>
                                </td>
                                {
                                  /*
                                <td>
                                  {purchase.status ===
                                    "requested" &&
                                    filterType ===
                                    "product" && (
                                      <button
                                        className="text-blue-600"
                                        onClick={() =>
                                          openEdit(
                                            purchase._id
                                          )
                                        }
                                        title="Edit"
                                      >
                                        <HugeiconsIcon
                                          icon={
                                            Edit03Icon
                                          }
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    )}

                                  {purchase.status ===
                                    "requested" &&
                                    filterType !==
                                    "product" && (
                                      <div className="flex flex-row justify-center gap-2">
                                        <button
                                          className="text-blue-600"
                                          onClick={() =>
                                            openEdit(
                                              purchase._id
                                            )
                                          }
                                          title="Edit"
                                        >
                                          <HugeiconsIcon
                                            icon={
                                              Edit03Icon
                                            }
                                            size={24}
                                            color="currentColor"
                                          />
                                        </button>
                                      </div>
                                    )}

                                  {purchase.status ===
                                    "approved" &&
                                    filterType ===
                                    "product" && (
                                      <button
                                        className="text-green-700"
                                        onClick={() =>
                                          openOrder(
                                            purchase._id
                                          )
                                        }
                                        title="Create Purchase Order"
                                      >
                                        <HugeiconsIcon
                                          icon={
                                            CoinsDollarIcon
                                          }
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    )}

                                  {purchase.status ===
                                    "approved" &&
                                    filterType !==
                                    "product" && (
                                      <div className="flex flex-row justify-center gap-2 items-center">
                                        <button
                                          className="btn btn-sm"
                                          onClick={() =>
                                            openOrder(
                                              purchase._id
                                            )
                                          }
                                          title="Convert to PO"
                                        >
                                          Make PO
                                        </button>
                                      </div>
                                    )}

                                  {
                                    (
                                      purchase.status ===
                                      "ordered" ||
                                      purchase.status ===
                                      "completed"
                                    ) &&
                                    filterType ===
                                    "service" && (
                                      <div className="flex flex-row justify-center gap-2">
                                        {purchase.status ===
                                          "ordered" && (
                                            <button
                                              className="text-purple-600"
                                              onClick={() =>
                                                openApplyTax(
                                                  purchase
                                                )
                                              }
                                              title="Apply Tax"
                                            >
                                              <HugeiconsIcon
                                                icon={
                                                  BadgePercentIcon
                                                }
                                                size={24}
                                                color="currentColor"
                                              />
                                            </button>
                                          )}

                                        <button
                                          className="text-red-600"
                                          onClick={() =>
                                            makeVoid(
                                              purchase
                                            )
                                          }
                                          title="Void"
                                        >
                                          <HugeiconsIcon
                                            icon={
                                              Cancel02Icon
                                            }
                                            size={24}
                                            color="currentColor"
                                          />
                                        </button>
                                      </div>
                                    )
                                  }

                                  {
                                    purchase.status === "ordered" &&
                                    (filterType === "product" || filterType === "procurement") && (
                                      <button
                                        className="text-blue-600"
                                        onClick={() => openEditNonCash(purchase)}
                                        title="Edit Destinasi Non-Cash"
                                      >
                                        <HugeiconsIcon
                                          icon={Edit03Icon}
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    )
                                  }

                                </td>
                                  */
                                }
                              </tr>
                            </React.Fragment>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                  {selectedPurchase && (
                    <dialog open className="modal modal-open">
                      <div className="modal-box w-11/12 max-w-4xl">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg">
                              Purchase Details
                            </h3>
                            <p className="text-sm text-gray-500">
                              {selectedPurchase.purchaseOrderNumber}
                            </p>
                          </div>

                          <button
                            className="btn btn-sm btn-circle btn-ghost"
                            onClick={() => setSelectedPurchase(null)}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="table table-xs text-xs w-full">
                            <thead className="bg-base-200">
                              <tr>
                                <th>Produk/Item</th>
                                <th className="text-center">Qty</th>
                                <th className="text-right">Harga/unit</th>
                                <th className="text-right">Subtotal</th>
                                {selectedPurchase.items.some((it: any) => it.note) && (
                                  <th>Note</th>
                                )}
                              </tr>
                            </thead>

                            <tbody>
                              {selectedPurchase.items.map((it: any, idx: number) => {
                                const isAsset = it.itemType === "asset" || (filterType === "procurement" && it.product?.category && !it.product?.conversionRatioX)
                                const pName = filterType === "procurement"
                                  ? (isAsset ? `${it.product?.name || fAsset(it.productId)?.name || "-"}` : (it.product?.name || "-"))
                                  : it.product?.productName || ""

                                const pUnit = isAsset
                                  ? (it.product?.measurement || fAsset(it.productId)?.measurement || it.product.unit.name)
                                  : filterType === "procurement"
                                    ? (typeof it.product?.unit === "string" ? it.product?.unit : it.product?.unit?.symbol || "")
                                    : it.product?.conversionRatioX || ""

                                const hasNotes = selectedPurchase.items.some(
                                  (x: any) => x.note
                                )

                                return (
                                  <tr key={idx}>
                                    <td>
                                      {pName}
                                    </td>
                                    <td className="text-center">
                                      {it.quantity} {pUnit}
                                    </td>
                                    <td className="text-right">
                                      {it.finalPrice > 0
                                        ? `Rp ${(it.finalPrice / it.quantity).toLocaleString("id-ID")}`
                                        : "-"
                                      }
                                    </td>
                                    <td className="text-right font-medium">
                                      {it.finalPrice > 0
                                        ? `Rp ${(it.finalPrice).toLocaleString("id-ID")}`
                                        : "-"
                                      }
                                    </td>
                                    {hasNotes && (
                                      <td className="text-gray-600 italic">
                                        {it.note || ""}
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="modal-action">
                          <button
                            className="btn"
                            onClick={() => setSelectedPurchase(null)}
                          >
                            Tutup
                          </button>
                        </div>
                      </div>

                      <div
                        className="modal-backdrop"
                        onClick={() => setSelectedPurchase(null)}
                      />
                    </dialog>
                  )}
                </div>
              </div>
            )
          }
        </div>
      </div >

      {/* =====================================================
          MODAL EDIT REQUISITION
      ===================================================== */}
      <dialog
        ref={editRef}
        className="modal text-slate-900"
      >
        <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-xl bg-white shadow-xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Purchase Requisition
              </h3>
            </div>

            <form
              onSubmit={editForm.handleSubmit(editSubmit)}
              className="flex flex-col gap-4"
            >
              {/* ── Header: Tanggal + Supplier / Vendor ─────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tanggal Pembelian
                  </label>
                  <input
                    {...editForm.register("customDate", { required: true })}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    type="date"
                  />
                </div>

                {(filterType === "product" || filterType === "procurement") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Supplier / Asal
                    </label>
                    <input
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      {...editForm.register("customSupplier")}
                      type="text"
                      placeholder="Nama supplier (opsional)"
                    />
                  </div>
                )}

                {filterType === "service" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Vendor
                    </label>
                    <select
                      {...editForm.register("vendorId", { required: true })}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      {vendors.map((vendor) => (
                        <option value={vendor._id} key={vendor._id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Service: single fields ─────────────────────────────── */}
              {filterType === "service" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Description (Jasa)
                    </label>
                    <input
                      {...editForm.register("description", { required: true })}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Price (Rp)
                    </label>
                    <input
                      {...editForm.register("finalPrice", { required: true })}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      type="number"
                    />
                  </div>
                </div>
              )}

              {/* ── Product / Procurement: multi-item ─────────────────── */}
              {(filterType === "product" || filterType === "procurement") && (
                <div className="flex flex-col gap-4">
                  {/* Item draft input */}
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/70 p-3.5 flex flex-col gap-3">
                    <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Tambah / Ubah Item
                    </p>

                    {filterType === "procurement" && (
                      <div className="flex flex-wrap items-center gap-4 pb-2.5 border-b border-blue-200/80">
                        <span className="text-xs font-semibold text-slate-700">
                          Tipe Item:
                        </span>
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="editItemType"
                            checked={editItemDraft.itemType !== "asset"}
                            onChange={() => {
                              setEditItemDraft((d: any) => ({
                                ...d,
                                itemType: "inventory",
                                productId: "",
                              }));
                              setEditLastPriceInfo(null);
                            }}
                            className="h-4 w-4 accent-blue-700 cursor-pointer"
                          />
                          <span>Inventory Item</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-950 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="editItemType"
                            checked={editItemDraft.itemType === "asset"}
                            onChange={() => {
                              setEditItemDraft((d: any) => ({
                                ...d,
                                itemType: "asset",
                                productId: "",
                              }));
                              setEditLastPriceInfo(null);
                            }}
                            className="h-4 w-4 accent-blue-700 cursor-pointer"
                          />
                          <span>Company Asset</span>
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      {/* Pilih Produk */}
                      <div className="sm:col-span-5 flex flex-col gap-1 min-w-0">
                        <label className="text-xs font-medium text-slate-700">
                          {filterType === "product"
                            ? "Produk"
                            : editItemDraft.itemType === "asset"
                              ? "Aset"
                              : "Item"}
                        </label>
                        <select
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={editItemDraft.productId}
                          onChange={(e) => {
                            setEditItemDraft((d: any) => ({
                              ...d,
                              productId: e.target.value,
                            }));
                            setEditLastPriceInfo(null);
                            fetchLastPurchasePrice(e.target.value, "edit");
                          }}
                        >
                          <option value="">-- Pilih --</option>
                          {filterType === "product"
                            ? products.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.productName} ({product.conversionRatioX})
                              </option>
                            ))
                            : editItemDraft.itemType === "asset"
                              ? assets.map((asset) => (
                                <option key={asset._id} value={asset._id}>
                                  {asset.name} ({asset.category?.name || "Aset"})
                                </option>
                              ))
                              : items.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {item.name} ({item?.unit?.symbol || "Unit"})
                                </option>
                              ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="sm:col-span-2 flex flex-col gap-1 min-w-0">
                        <label className="text-xs font-medium text-slate-700">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          value={editItemDraft.quantity}
                          onChange={(e) =>
                            setEditItemDraft((d: any) => ({
                              ...d,
                              quantity: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {/* Harga per item */}
                      <div className="sm:col-span-3 flex flex-col gap-1 min-w-0">
                        <label className="text-xs font-medium text-slate-700">
                          Total / Item
                        </label>
                        <NumericFormat
                          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-right text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          thousandSeparator="."
                          decimalSeparator=","
                          decimalScale={0}
                          allowNegative={false}
                          placeholder="0"
                          value={editItemDraft.finalPrice}
                          onValueChange={(vals) =>
                            setEditItemDraft((d: any) => ({
                              ...d,
                              finalPrice: vals.value,
                            }))
                          }
                        />
                      </div>

                      {/* Tombol Tambah */}
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={addEditItemToDraft}
                          className="h-10 w-full whitespace-nowrap rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 active:bg-blue-900 transition cursor-pointer"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>

                    {/* Riwayat harga terakhir */}
                    {editLastPriceLoading && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="loading loading-spinner loading-xs" />
                        <span>Mengambil riwayat harga...</span>
                      </div>
                    )}

                    {!editLastPriceLoading && editLastPriceInfo && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-3.5 shrink-0 text-amber-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">Terakhir dibeli:</span>
                          <span className="font-bold">
                            Rp{" "}
                            {(editLastPriceInfo.finalPrice ?? 0).toLocaleString(
                              "id-ID"
                            )}
                          </span>
                          <span className="text-amber-500">·</span>
                          <span>
                            qty:{" "}
                            <span className="font-semibold">
                              {editLastPriceInfo.quantity}
                            </span>
                          </span>
                          {editLastPriceInfo.date && (
                            <>
                              <span className="text-amber-500">·</span>
                              <span className="text-amber-700">
                                {new Date(editLastPriceInfo.date).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </>
                          )}
                          {editLastPriceInfo.customSupplier && (
                            <>
                              <span className="text-amber-500">·</span>
                              <span className="italic text-amber-800">
                                {editLastPriceInfo.customSupplier}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Daftar item yang sudah ada */}
                  {editItems.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Daftar Item ({editItems.length})
                      </p>

                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                          <thead className="bg-slate-100 text-xs font-semibold text-slate-700">
                            <tr>
                              <th className="py-2.5 px-3 text-left">Produk/Item</th>
                              <th className="py-2.5 px-2 text-center w-20">Qty</th>
                              <th className="py-2.5 px-2 text-center w-24">Ppu</th>
                              <th className="py-2.5 px-3 text-right w-32">
                                Total/Item
                              </th>
                              <th className="py-2.5 px-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {editItems.map((it, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="py-2 px-3 text-left font-medium text-slate-800">
                                  {it._productLabel}
                                </td>

                                <td className="py-2 px-2 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    className="h-7 w-16 rounded border border-slate-300 bg-white px-1.5 text-center text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                                    value={it.quantity}
                                    onChange={(e) => {
                                      const quantity = Math.max(
                                        1,
                                        parseFloat(e.target.value) || 1
                                      );

                                      setEditItems((prev) =>
                                        prev.map((x, i) =>
                                          i === idx
                                            ? {
                                              ...x,
                                              quantity,
                                              pricePerUnit: x.finalPrice / quantity,
                                              finalPrice:
                                                (x.finalPrice / quantity) * quantity,
                                            }
                                            : x
                                        )
                                      );
                                    }}
                                  />
                                </td>

                                <td className="py-2 px-2 text-center">
                                  <input
                                    readOnly
                                    type="number"
                                    className="h-7 w-20 rounded border border-slate-200 bg-slate-50 px-1.5 text-center text-xs text-slate-700 focus:outline-none"
                                    value={it.pricePerUnit ?? it.finalPrice / it.quantity}
                                  />
                                </td>

                                <td className="py-2 px-3 text-right">
                                  <NumericFormat
                                    className="h-7 w-28 rounded border border-slate-300 bg-white px-2 text-right text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                                    thousandSeparator="."
                                    decimalSeparator=","
                                    decimalScale={0}
                                    allowNegative={false}
                                    placeholder="0"
                                    value={it.finalPrice > 0 ? it.finalPrice : ""}
                                    onValueChange={(vals) => {
                                      const finalPrice = vals.floatValue ?? 0;

                                      setEditItems((prev) =>
                                        prev.map((x, i) =>
                                          i === idx
                                            ? {
                                              ...x,
                                              finalPrice,
                                              pricePerUnit: finalPrice / x.quantity,
                                            }
                                            : x
                                        )
                                      );
                                    }}
                                  />
                                </td>

                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeEditItemFromDraft(idx)}
                                    className="inline-flex items-center justify-center rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                                    title="Hapus item"
                                  >
                                    <HugeiconsIcon
                                      icon={MultiplicationSignIcon}
                                      size={16}
                                      color="currentColor"
                                    />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Total Section */}
                      <div className="flex items-center justify-between pt-2 px-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Total Keseluruhan
                        </span>

                        {editTotalMode === "auto" ? (
                          <span className="font-bold text-blue-800 text-base">
                            Rp {calcEditItemsTotal().toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <NumericFormat
                              className="h-8 w-40 rounded-lg border border-slate-300 bg-white px-2.5 text-right text-sm font-bold text-blue-800 focus:border-blue-600 focus:outline-none"
                              thousandSeparator="."
                              decimalSeparator=","
                              decimalScale={0}
                              allowNegative={false}
                              placeholder="Total harga"
                              value={editTotalOverride}
                              onValueChange={(vals) =>
                                setEditTotalOverride(vals.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {editItems.length === 0 && (
                    <div className="text-center py-5 text-sm text-slate-400 border border-dashed border-slate-300 rounded-xl">
                      Belum ada item. Gunakan form di atas untuk menambahkan item.
                    </div>
                  )}
                </div>
              )}

              {(editFn.noResult || editFn.error) && (
                <p className="text-xs font-medium text-red-600">
                  something went wrong
                </p>
              )}

              <div className="mt-2 pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    editRef.current?.close();
                    setEditItems([]);
                    setEditItemDraft({
                      productId: "",
                      quantity: 1,
                      finalPrice: "",
                      note: "",
                    });
                    setEditTotalOverride("");
                    setEditTotalMode("auto");
                    setEditLastPriceInfo(null);
                    setEditingPurchase(null);
                  }}
                  className="h-10 px-4 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg text-sm font-semibold text-white bg-blue-900 hover:bg-blue-950 transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* =====================================================
          MODAL ADD REQUISITION
      ===================================================== */}
      <dialog
        ref={modalRef}
        id="add-purchase-requisition"
        className="modal text-black"
      >
        <div className="modal-box max-h-[90vh] overflow-y-auto w-11/12 max-w-3xl">
          <div className="flex flex-col gap-4">
            <span className="text-lg font-bold">
              Add Purchase Requisition
            </span>

            <form
              onSubmit={newPrForm.handleSubmit(submit)}
              className="flex flex-col gap-4"
            >
              {/* ── Header: Tanggal + Supplier ─────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">Tanggal Pembelian</label>
                  <input
                    {...newPrForm.register("customDate", { required: true })}
                    className="input input-bordered w-full"
                    type="date"
                  />
                </div>

                {(filterType === "product" || filterType === "procurement") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700">Supplier / Asal</label>
                    <input
                      className="input input-bordered w-full"
                      {...newPrForm.register("customSupplier")}
                      type="text"
                      placeholder="Nama supplier (opsional)"
                    />
                  </div>
                )}

                {filterType === "service" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700">Vendor</label>
                    <select
                      {...newPrForm.register("vendorId", { required: true })}
                      className="select select-bordered w-full"
                    >
                      {vendors.map((vendor) => (
                        <option value={vendor._id} key={vendor._id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── Service: single description + price ───────────────── */}
              {filterType === "service" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700">Description (Jasa)</label>
                    <input
                      {...newPrForm.register("description", { required: true })}
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700">Price (Rp)</label>
                    <Controller
                      control={newPrForm.control}
                      name="finalPrice"
                      render={({ field: { onChange, ...fieldRest } }) => (
                        <NumericFormat
                          {...fieldRest}
                          value={fieldRest.value ?? ""}
                          onValueChange={(values) => onChange(values.floatValue ?? "")}
                          thousandSeparator="."
                          decimalSeparator=","
                          decimalScale={2}
                          fixedDecimalScale
                          allowNegative={false}
                          className="input input-bordered w-full"
                          placeholder="Contoh: 160000"
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {/* ── Product / Procurement: multi-item ─────────────────── */}
              {(filterType === "product" || filterType === "procurement") && (
                <div className="flex flex-col gap-3">
                  {/* Item draft input */}
                  <div className="border border-blue-100 rounded-lg bg-blue-50/60 p-4 flex flex-col gap-3">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                      Tambah Item ke Daftar
                    </p>

                    {filterType === "procurement" && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2.5 px-3 bg-white rounded-md border border-blue-200">
                        <span className="text-xs font-semibold text-gray-700">Tipe Item:</span>
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input
                              type="radio"
                              name="addItemType"
                              checked={addItemDraft.itemType !== "asset"}
                              onChange={() => {
                                setAddItemDraft((d: any) => ({ ...d, itemType: "inventory", productId: "" }))
                                setAddLastPriceInfo(null)
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-gray-800 font-medium">Inventory Item</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                            <input
                              type="radio"
                              name="addItemType"
                              checked={addItemDraft.itemType === "asset"}
                              onChange={() => {
                                setAddItemDraft((d: any) => ({ ...d, itemType: "asset", productId: "" }))
                                setAddLastPriceInfo(null)
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-blue-900 font-semibold">Company Asset</span>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      {/* Pilih Produk */}
                      <div className="md:col-span-5 flex flex-col gap-1">
                        <label className="text-xs text-gray-600 font-medium">
                          {filterType === "product" ? "Produk" : (addItemDraft.itemType === "asset" ? "Aset" : "Item")}
                        </label>
                        <select
                          className="input input-bordered w-full text-sm h-10"
                          value={addItemDraft.productId}
                          onChange={(e) => {
                            setAddItemDraft((d: any) => ({ ...d, productId: e.target.value }))
                            setAddLastPriceInfo(null)
                            fetchLastPurchasePrice(e.target.value, "add")
                          }}
                        >
                          <option value="">-- Pilih --</option>
                          {filterType === "product"
                            ? products.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.productName} ({product.conversionRatioX})
                              </option>
                            ))
                            : addItemDraft.itemType === "asset"
                              ? assets.map((asset) => (
                                <option key={asset._id} value={asset._id}>
                                  {asset.name} ({asset.measurement})
                                </option>
                              ))
                              : items.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {item.name} ({item?.unit?.symbol || "Unit"})
                                </option>
                              ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="md:col-span-2 flex flex-col gap-1">
                        <label className="text-xs text-gray-600 font-medium">Qty</label>
                        <input
                          type="number"
                          min="1"
                          className="input input-bordered w-full text-sm h-10"
                          value={addItemDraft.quantity}
                          onChange={(e) => setAddItemDraft((d: any) => ({ ...d, quantity: e.target.value }))}
                        />
                      </div>

                      {/* Harga per item (opsional) */}
                      <div className="md:col-span-3 flex flex-col gap-1">
                        <label className="text-xs text-gray-600 font-medium">Total / Item</label>
                        <NumericFormat
                          className="input input-bordered w-full text-sm h-10"
                          thousandSeparator="."
                          decimalSeparator=","
                          decimalScale={0}
                          allowNegative={false}
                          placeholder="0"
                          value={addItemDraft.finalPrice}
                          onValueChange={(vals) => setAddItemDraft((d: any) => ({ ...d, finalPrice: vals.value }))}
                        />
                      </div>

                      {/* Tombol Tambah */}
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={addItemToDraft}
                          className="btn w-full bg-blue-700 text-white hover:bg-blue-800 btn-sm h-10"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>

                    {/* Riwayat harga terakhir */}
                    {addLastPriceLoading && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span className="loading loading-spinner loading-xs" />
                        Mengambil riwayat harga...
                      </div>
                    )}
                    {!addLastPriceLoading && addLastPriceInfo?.length > 0 && (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50">
                        <button
                          type="button"
                          onClick={() => setShowPurchaseHistory(prev => !prev)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-amber-800 font-medium">Riwayat pembelian</span>
                          </div>

                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`size-4 shrink-0 text-amber-700 transition-transform ${showPurchaseHistory ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                          </svg>
                        </button>

                        {showPurchaseHistory && (
                          <div className="border-t border-amber-200 divide-y divide-amber-200">
                            {addLastPriceInfo.map((item: any, index: number) => (
                              <div
                                key={`${item.date}-${index}`}
                                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                              >
                                <div>
                                  <div className="text-xs font-bold text-amber-900">
                                    Rp {Number(item.pricePerUnit ?? 0).toLocaleString("id-ID")}
                                    {index === 0 && (
                                      <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium">
                                        Terbaru
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-[11px] text-amber-700">
                                    Qty: {item.quantity}
                                    <span className="mx-1">·</span>
                                    Total: Rp {Number(item.finalPrice ?? 0).toLocaleString("id-ID")}
                                  </div>
                                </div>
                                <span className="text-[11px] text-amber-700">
                                  {new Date(item.date).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric"
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Daftar item yang sudah ditambahkan */}
                  {addItems.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Daftar Item ({addItems.length})
                      </p>
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="table table-sm text-sm w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left">Produk/Item</th>
                              <th className="text-center">Qty</th>
                              <th className="text-center">Ppu</th>
                              <th className="text-right">Total/Item</th>
                              <th className="text-right">Subtotal</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {addItems.map((it, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="text-left">{it._productLabel}</td>
                                <td className="text-center">{it.quantity}</td>
                                <td className="text-center">{it.ppu.toLocaleString("id-ID")}</td>
                                <td className="text-right">
                                  {it.finalPrice > 0
                                    ? `Rp ${it.finalPrice.toLocaleString("id-ID")}`
                                    : <span className="text-gray-400 italic text-xs">belum diisi</span>}
                                </td>
                                <td className="text-right font-medium">
                                  {it.finalPrice > 0
                                    ? `Rp ${(it.finalPrice).toLocaleString("id-ID")}`
                                    : "-"}
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeItemFromDraft(idx)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Hapus item"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Total Section */}
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between">
                          {addTotalMode === "auto" ? (
                            <span className="font-bold text-blue-800 text-base">
                              Rp {calcAddItemsTotal().toLocaleString("id-ID")}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <NumericFormat
                                className="input input-sm input-bordered w-40 text-right font-bold text-blue-800"
                                thousandSeparator="."
                                decimalSeparator=","
                                decimalScale={0}
                                allowNegative={false}
                                placeholder="Total harga"
                                value={addTotalOverride}
                                onValueChange={(vals) => setAddTotalOverride(vals.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {addItems.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400 border border-dashed rounded-lg">
                      Belum ada item. Gunakan form di atas untuk menambahkan item.
                    </div>
                  )}
                </div>
              )}

              {(addFn.noResult || addFn.error) && (
                <label className="text-red-600 text-xs">
                  something went wrong
                </label>
              )}

              <div className="mt-4 flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    modalRef.current?.close()
                    setAddItems([])
                    setAddItemDraft({ productId: "", quantity: 1, finalPrice: "", note: "" })
                    setAddTotalOverride("")
                    setAddTotalMode("auto")
                    setAddLastPriceInfo(null)
                  }}
                  className="btn btn-ghost text-black bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addFn.loading}
                  className="btn bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {addFn.loading ? "Menyimpan..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      {/* =====================================================
          MODAL MAKE PO
      ===================================================== */}
      < dialog
        ref={orderRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Create Purchase Order
            </span>

            <form
              onSubmit={orderForm.handleSubmit(
                orderSubmit
              )}
              className="flex flex-col gap-3 pb-4"
            >
              {/* ── Multi-item summary (product / procurement) ────────── */}
              {(filterType === "product" || filterType === "procurement") &&
                selectedPurchase &&
                Array.isArray(selectedPurchase.items) &&
                selectedPurchase.items.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Items dalam PR ({selectedPurchase.items.length})
                    </p>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="table table-xs text-xs w-full">
                        <thead className="bg-base-200">
                          <tr>
                            <th className="text-left">Produk/Item</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Harga/item</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPurchase.items.map((it: any, idx: number) => {
                            const isAsset = it.itemType === "asset" || (filterType === "procurement" && it.product?.category && !it.product?.conversionRatioX)
                            const pName = filterType === "procurement"
                              ? (isAsset ? `${it.product?.name || fAsset(it.productId)?.name || "-"}` : (it.product?.name || "-"))
                              : it.product?.productName || "-"
                            const pUnit = isAsset
                              ? (it.product?.measurement || fAsset(it.productId)?.measurement || "Unit")
                              : filterType === "procurement"
                                ? (typeof it.product?.unit === "string" ? it.product?.unit : it.product?.unit?.symbol || "")
                                : it.product?.conversionRatioX || ""
                            return (
                              <tr key={idx}>
                                <td>{pName} {pUnit ? typeof pUnit === 'string' ? `(${pUnit})` : `(${pUnit?.symbol})` : ""}</td>
                                <td className="text-center">{it.quantity}</td>
                                <td className="text-right">
                                  {it.finalPrice > 0
                                    ? `Rp ${it.finalPrice.toLocaleString("id-ID")}`
                                    : "-"}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* ── Service: description readonly ─────────────────────── */}
              {filterType === "service" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Description</legend>
                  <input
                    className="input w-full bg-gray-50"
                    {...orderForm.register("description")}
                    type="text"
                    readOnly
                  />
                </fieldset>
              )}

              {/* ── Price editable ────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset col-span-2 sm:col-span-1">
                  <legend className="fieldset-legend">
                    Price (Rp)
                  </legend>
                  <input
                    className="input w-full"
                    {...orderForm.register("finalPrice")}
                    type="number"
                  />
                </fieldset>
              </div>

              {
                /*
              {filterType === "product" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Supplier
                  </legend>
     
                  <select
                    {...orderForm.register(
                      "supplierId"
                    )}
                    className="select w-full"
                    required
                  >
                    <option value="">
                      -- Pilih Supplier --
                    </option>
     
                    {suppliers.map(
                      (supplier) => (
                        <option
                          key={supplier._id}
                          value={supplier._id}
                        >
                          {
                            supplier.bussinessName
                          }
                        </option>
                      )
                    )}
                  </select>
                </fieldset>
              )}
                
                */
              }

              {filterType === "product" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Supplier / Asal
                  </legend>

                  <input
                    className="input w-full"
                    {...orderForm.register(
                      "customSupplier"
                    )}
                    type="text"
                  />
                </fieldset>
              )}

              {filterType === "procurement" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Supplier / Asal
                  </legend>

                  <input
                    className="input w-full"
                    {...orderForm.register(
                      "customSupplier"
                    )}
                    type="text"
                  />
                </fieldset>
              )}

              {filterType === "service" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Vendor
                  </legend>

                  <select
                    {...orderForm.register(
                      "vendorId",
                      { required: true }
                    )}
                    className="select w-full"
                  >
                    {vendors.map(
                      (vendor) => (
                        <option
                          value={vendor._id}
                          key={vendor._id}
                        >
                          {vendor.name}
                        </option>
                      )
                    )}
                  </select>
                </fieldset>
              )}

              {filterType === "procurement" || filterType == "product" ? (
                <>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Link
                    </legend>

                    <input
                      className="input w-full"
                      {...orderForm.register(
                        "link"
                      )}
                      type="text"
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      No. Rekening Tujuam
                    </legend>

                    <input
                      className="input w-full"
                      {...orderForm.register(
                        "nonCashDstNumber"
                      )}
                      type="text"
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Bank Tujuan
                    </legend>

                    <input
                      className="input w-full"
                      {...orderForm.register(
                        "nonCashDstDesc"
                      )}
                      type="text"
                    />
                  </fieldset>
                </>

              ) : (
                <></>
              )}


              <div className="grid grid-cols-2 gap-3 hidden">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Initial Pay Amount (Rp)
                  </legend>

                  <input
                    className="input w-full"
                    {...orderForm.register(
                      "payAmount"
                    )}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                </fieldset>

                <fieldset
                  className={
                    `fieldset ${watchPayAmount > 0
                      ? ""
                      : "hidden"
                    }`
                  }
                >
                  <legend className="fieldset-legend">
                    Payment Method
                  </legend>

                  <select
                    {...orderForm.register(
                      "paymentMethod"
                    )}
                    className="select w-full"
                    onChange={e => {
                      const val = e.target.value
                      orderForm.setValue('paymentMethod', val)
                      const matchedBank = bankAccount.result?.find(
                        (b: any) => `Transfer - ${b.bank}` === val
                      )
                      setSelectedPoBankAccountId(matchedBank?._id)
                      fetchPoBalance(val, matchedBank?._id, new Date().toISOString().split('T')[0])
                    }}
                  >
                    <option value="Cash">
                      Cash
                    </option>

                    {bankAccount.result?.map(
                      (bank: any) => (
                        <option
                          key={bank._id}
                          value={
                            `Transfer - ${bank.bank}`
                          }
                        >
                          Transfer -{" "}
                          {bank.bank} (
                          {
                            bank.accountName
                          }
                          )
                        </option>
                      )
                    )}
                  </select>

                  {/* Tampilan sisa saldo */}
                  {watchPayAmount > 0 && (
                    <div className="mt-2">
                      {poBalanceLoading ? (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <span className="loading loading-spinner loading-xs"></span> Memuat saldo...
                        </span>
                      ) : poAvailableBalance !== null ? (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${poAvailableBalance <= 0
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : parseFloat(String(watchPayAmount)) > poAvailableBalance
                            ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : 'bg-green-50 border-green-200 text-green-700'
                          }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                          </svg>
                          <span>Saldo tersedia: <strong>Rp {poAvailableBalance.toLocaleString('id-ID')}</strong></span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </fieldset>
              </div>

              {editFn.error && (
                <p className="text-red-600 text-sm">
                  Terjadi kesalahan, coba lagi.
                </p>
              )}

              <div className="flex flex-row gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() =>
                    orderRef.current?.close()
                  }
                  className="p-3 rounded-md border border-gray-300 text-gray-700"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={editFn.loading || (
                    watchPayAmount > 0 &&
                    poAvailableBalance !== null &&
                    parseFloat(String(watchPayAmount)) > poAvailableBalance
                  )}
                  title={
                    watchPayAmount > 0 && poAvailableBalance !== null && parseFloat(String(watchPayAmount)) > poAvailableBalance
                      ? `Saldo tidak mencukupi. Tersedia: Rp ${poAvailableBalance.toLocaleString('id-ID')}`
                      : ''
                  }
                >
                  {editFn.loading
                    ? "Processing..."
                    : "Buat PO"}
                </button>
              </div>
            </form>
          </div>
        </div >
      </dialog >

      {/* =====================================================
          MODAL APPLY TAX
      ===================================================== */}
      < dialog
        ref={taxRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-lg">
          <div className="flex flex-col gap-4">
            <span className="page-title">
              Apply Tax
            </span>

            {selectedPrForTax && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
                <p className="font-semibold text-gray-800">
                  {getPurchaseName(
                    selectedPrForTax
                  )}
                </p>

                <div className="flex justify-between">
                  <span>Harga Bruto</span>

                  <span className="font-semibold">
                    Rp{" "}
                    {getGrossPrice(
                      selectedPrForTax
                    ).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>

                {selectedPrForTax.appliedTaxes
                  ?.length > 0 && (
                    <div className="flex flex-col gap-1 bg-gray-100 p-2 rounded">
                      {selectedPrForTax.appliedTaxes.map(
                        (
                          tax: any,
                          index: number
                        ) => (
                          <div
                            key={
                              tax.taxId ||
                              index
                            }
                            className={
                              `flex justify-between gap-3 ` +
                              (
                                tax.type ===
                                  "deduction"
                                  ? "text-red-700"
                                  : "text-green-700"
                              )
                            }
                          >
                            <span>
                              {
                                tax.type ===
                                  "deduction"
                                  ? "Potongan"
                                  : "Tambahan"
                              }{" "}
                              {tax.name} (
                              {tax.rate}%)
                            </span>

                            <span className="font-semibold whitespace-nowrap">
                              {
                                tax.type ===
                                  "deduction"
                                  ? "-"
                                  : "+"
                              }{" "}
                              Rp{" "}
                              {parseFloat(
                                tax.amount ||
                                0
                              ).toLocaleString(
                                "id-ID"
                              )}
                            </span>
                          </div>
                        )
                      )}

                      <div className="border-t border-gray-300 pt-1 flex justify-between">
                        <span>
                          Price saat ini
                        </span>

                        <span className="font-semibold text-blue-700">
                          Rp{" "}
                          {parseFloat(
                            selectedPrForTax.finalPrice ||
                            0
                          ).toLocaleString(
                            "id-ID"
                          )}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}

            <form
              onSubmit={taxForm.handleSubmit(
                applyTaxSubmit
              )}
              className="flex flex-col gap-4"
            >
              {/* TAX SELECTION */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Pilih Tax
                </legend>

                <div className="flex flex-col gap-2">
                  {taxes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Tidak ada tax tersedia.
                    </p>
                  ) : (
                    taxes.map((tax: any) => (
                      <label
                        key={tax._id}
                        className="flex items-center gap-2 cursor-pointer rounded-md p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          value={tax._id}
                          {...taxForm.register(
                            "taxIds"
                          )}
                          className="checkbox checkbox-sm !w-4 !h-4 !min-w-4 !min-h-4 shrink-0"
                        />

                        <span className="flex-1 min-w-0">
                          {tax.name} (
                          {tax.value}%)
                        </span>

                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {tax.isPPh
                            ? "(Potongan/PPh)"
                            : "(Tambahan/PPN)"}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>

              {/* TAX PREVIEW */}
              {taxPreview &&
                selectedPrForTax &&
                watchTaxFormTaxIds.length >
                0 && (
                  <div className="flex flex-col gap-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>
                        Harga Bruto:
                      </span>

                      <span className="font-medium">
                        Rp{" "}
                        {getGrossPrice(
                          selectedPrForTax
                        ).toLocaleString(
                          "id-ID"
                        )}
                      </span>
                    </div>

                    {taxPreview.appliedTaxes.map(
                      (tax: any) => (
                        <div
                          key={tax.taxId}
                          className={
                            `flex justify-between gap-3 ` +
                            (
                              tax.isPPh
                                ? "text-red-700"
                                : "text-green-700"
                            )
                          }
                        >
                          <span>
                            {
                              tax.isPPh
                                ? "Potongan"
                                : "Tambahan"
                            }{" "}
                            {tax.name} (
                            {tax.rate}%):
                          </span>

                          <span className="font-medium whitespace-nowrap">
                            {tax.isPPh
                              ? "-"
                              : "+"}{" "}
                            Rp{" "}
                            {tax.amount.toLocaleString(
                              "id-ID"
                            )}
                          </span>
                        </div>
                      )
                    )}

                    <div className="flex justify-between gap-3 border-t border-amber-300 pt-1 font-bold text-gray-900">
                      <span>
                        Final Price:
                      </span>

                      <span className="whitespace-nowrap">
                        Rp{" "}
                        {taxPreview.netPrice.toLocaleString(
                          "id-ID"
                        )}
                      </span>
                    </div>
                  </div>
                )}

              {/* ACTION */}
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    taxRef.current?.close()
                    setSelectedPrForTax(null)
                    taxForm.reset({
                      taxIds: [],
                    })
                  }}
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-amber-600"
                  disabled={editFn.loading}
                >
                  {editFn.loading
                    ? "Memproses..."
                    : "Apply Tax"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog >

      {/* =====================================================
          MODAL EDIT NON-CASH DESTINATION
      ===================================================== */}
      < dialog
        ref={nonCashRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-lg">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Edit Rekening Tujuan
            </span>

            {nonCashEditTarget && (
              <p className="text-sm text-gray-500">
                PO:{" "}
                <strong>
                  {nonCashEditTarget.purchaseOrderNumber}
                </strong>
              </p>
            )}

            <form
              onSubmit={nonCashForm.handleSubmit(
                editNonCashSubmit
              )}
              className="flex flex-col gap-3"
            >
              <input
                type="hidden"
                {...nonCashForm.register("_id")}
              />

              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  No. Rekening Tujuan (accountNumber)
                </legend>

                <input
                  {...nonCashForm.register("accountNumber")}
                  className="input w-full"
                  type="text"
                  placeholder="Contoh: 1234567890"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Keterangan (description)
                </legend>

                <input
                  {...nonCashForm.register("description")}
                  className="input w-full"
                  type="text"
                  placeholder="Contoh: Transfer ke supplier X"
                />
              </fieldset>

              {(editFn.error || editFn.noResult) && (
                <label className="input-validator text-red-900">
                  Terjadi kesalahan, coba lagi.
                </label>
              )}

              <div className="mt-auto ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    nonCashRef.current?.close()
                    setNonCashEditTarget(null)
                  }}
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900"
                  disabled={editFn.loading}
                >
                  {editFn.loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog >


      <dialog
        ref={linkEditRef}
        className="modal text-black"
      >
        <div className="modal-box max-w-lg">
          <h3 className="font-bold text-lg mb-4">
            Edit Link Pembelian Online
          </h3>

          <form
            onSubmit={editLinkForm.handleSubmit(editLinkSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  Link Pembelian
                </span>
              </label>



              <input
                type="url"
                {...editLinkForm.register("link")}
                placeholder="https://tokopedia.com/..."
                className="input input-bordered w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => linkEditRef.current?.close()}
              >
                Batal
              </button>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>

        <form method="dialog" className="modal-backdrop">
          <button>Tutup</button>
        </form>
      </dialog>

    </>
  )
}

export default withAuth(Purchases)