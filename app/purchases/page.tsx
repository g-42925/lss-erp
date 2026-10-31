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

  const [filterType, setFilterType] = useState<string>("product")
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pr, setPr] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [taxes, setTaxes] = useState<any[]>([])
  const [selectedPrForTax, setSelectedPrForTax] = useState<any>(null)
  const [poAvailableBalance, setPoAvailableBalance] = useState<number | null>(null)
  const [poBalanceLoading, setPoBalanceLoading] = useState(false)
  const [selectedPoBankAccountId, setSelectedPoBankAccountId] = useState<string | undefined>(undefined)
  const [nonCashEditTarget, setNonCashEditTarget] = useState<any>(null)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [fPrice, setFPrice] = useState<number>(0)

  // ─── State multi-item untuk Add PR ────────────────────────────────────────
  // Setiap entry: { productId, quantity, finalPrice (opsional), note (opsional) }
  const [addItems, setAddItems] = useState<any[]>([])
  // Form sementara untuk satu item yang sedang diisi
  const [addItemDraft, setAddItemDraft] = useState<any>({ productId: "", quantity: 1, finalPrice: "", note: "" })
  // Mode override total: jika true, user bisa isi total manual
  const [addTotalOverride, setAddTotalOverride] = useState<string>("")
  const [addTotalMode, setAddTotalMode] = useState<"auto" | "manual">("auto")

  // ─── State multi-item untuk Edit PR ────────────────────────────────────────
  const [editItems, setEditItems] = useState<any[]>([])
  const [editItemDraft, setEditItemDraft] = useState<any>({ productId: "", quantity: 1, finalPrice: "", note: "" })
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

  const editForm = useForm()
  const orderForm = useForm()
  const nonCashForm = useForm()

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
  async function fetchLastPurchasePrice(
    productId: string,
    form: "add" | "edit"
  ) {
    if (!productId || !masterAccountId) {
      if (form === "add") setAddLastPriceInfo(null)
      else setEditLastPriceInfo(null)
      return
    }

    if (form === "add") {
      setAddLastPriceLoading(true)
      setAddLastPriceInfo(null)
    } else {
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
    } catch {
      if (form === "add") setAddLastPriceInfo(null)
      else setEditLastPriceInfo(null)
    } finally {
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

  function getPurchaseName(purchase: any) {
    // Multi-item purchase
    if (Array.isArray(purchase.items) && purchase.items.length > 0) {
      if (purchase.items.length === 1) {
        const it = purchase.items[0]
        return it.product?.productName || it.product?.name || "-"
      }
      return `${purchase.items.length} item`
    }
    return (
      purchase.description ||
      purchase.product?.productName ||
      purchase.product?.name ||
      "-"
    )
  }

  function getPurchaseQuantity(purchase: any) {
    if (Array.isArray(purchase.items) && purchase.items.length > 0) {
      if (purchase.items.length === 1) {
        const it = purchase.items[0]
        const unit = filterType === "procurement"
          ? it.product?.unit
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
    if (filterType === "procurement") {
      return purchase.product?.unit || "-"
    }

    return purchase.product?.conversionRatioX || "-"
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
    // Temukan info produk untuk ditampilkan
    const productList = filterType === "procurement" ? items : products
    const prod = productList.find((p: any) => p._id === addItemDraft.productId)
    setAddItems(prev => [...prev, {
      productId: addItemDraft.productId,
      quantity: parseFloat(addItemDraft.quantity),
      finalPrice: addItemDraft.finalPrice !== "" ? parseFloat(addItemDraft.finalPrice) || 0 : 0,
      note: addItemDraft.note || "",
      _productLabel: filterType === "procurement"
        ? `${prod?.name || ""} (${prod?.unit || ""})`
        : `${prod?.productName || ""} (${prod?.conversionRatioX || ""})`,
      _product: prod,
    }])
    // Reset draft
    setAddItemDraft({ productId: "", quantity: 1, finalPrice: "", note: "" })
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
    const productList = filterType === "procurement" ? items : products
    const prod = productList.find((p: any) => p._id === editItemDraft.productId)
    setEditItems(prev => [...prev, {
      productId: editItemDraft.productId,
      quantity: parseFloat(editItemDraft.quantity),
      finalPrice: editItemDraft.finalPrice !== "" ? parseFloat(editItemDraft.finalPrice) || 0 : 0,
      note: editItemDraft.note || "",
      _productLabel: filterType === "procurement"
        ? `${prod?.name || ""} (${prod?.unit || ""})`
        : `${prod?.productName || ""} (${prod?.conversionRatioX || ""})`,
      _product: prod,
    }])
    setEditItemDraft({ productId: "", quantity: 1, finalPrice: "", note: "" })
    setEditLastPriceInfo(null)
  }

  function removeEditItemFromDraft(index: number) {
    setEditItems(prev => prev.filter((_, i) => i !== index))
  }

  function calcTotal(_id: string) {
    const [{ finalPrice, items }] = pr.filter(
      (item) => item._id === _id
    )

    let total = 0

    items.forEach((it: any) => {
      total += it.finalPrice
    })

    return total > 0 ? total : finalPrice
  }

  function calcEditItemsTotal() {
    return fPrice
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
          quantity: it.quantity,
          finalPrice: it.finalPrice || 0,
          note: it.note || "",
        })),
        finalPrice,
        ...(addTotalMode === "manual" && addTotalOverride !== "" ? { finalPriceOverride: parseFloat(addTotalOverride) } : {}),
      })

      addFn.fn("", body, (result) => {
        setPr((current) => [...current, result])
        modalRef.current?.close()
        newPrForm.reset()
        setAddItems([])
        setAddItemDraft({ productId: "", quantity: 1, finalPrice: "", note: "" })
        setAddTotalOverride("")
        setAddTotalMode("auto")
        setAddLastPriceInfo(null)
      })
      return
    }

    // Service: path lama
    const body = JSON.stringify({
      ...data,
      status: "requested",
      id: masterAccountId,
      date: data.customDate ? new Date(data.customDate) : new Date(),
      purchaseType: filterType,
      createdBy: user,
    })

    console.log(JSON.parse(body))

    addFn.fn("", body, (result) => {
      window.location.href = "/purchases"
      // if (
      //   filterType === "service" &&
      //   data.vendorId &&
      //   vendors.length > 0
      // ) {
      //   result.vendor = vendors.find(
      //     (vendor) => vendor._id === data.vendorId
      //   )
      // }

      // setPr((current) => [...current, result])
      // modalRef.current?.close()
      // newPrForm.reset()
    })
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
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  function openOrder(id: string) {

    // ke sini

    let fPriceX = 0;

    const [{ finalPrice, items }] = pr.filter(
      (item) => item._id === id
    )

    items.forEach((it: any) => {
      fPriceX += it.finalPrice
    })

    const purchase = pr.find(
      (item) => item._id === id
    )

    if (!purchase) return

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
        ? purchase.items.map((it: any) => it.product?.name || "-").join(", ")
        : purchase.product?.name
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

    const [{ _id, items, customSupplier, date, description, finalPrice, vendorId }] = pr.filter(
      (item) => item._id === id
    )

    //if (!items) return

    // Reset riwayat harga sebelum fetch yang baru
    setEditLastPriceInfo(null)
    //set{ items }EditingPurchase(purchase)

    const isMultiItem = Array.isArray(items) && items.length > 0
    const productList = filterType === "procurement" ? items : products

    if (filterType === "product" || filterType === "procurement") {
      // Load existing items into editItems state
      if (isMultiItem) {
        const loaded = items.map((it: any) => {
          // `it.product` sudah di-embed oleh aggregation pipeline dari API
          const prod = it.product ||
            productList.find((p: any) => String(p._id) === String(it.productId?._id || it.productId))
          // Label: utamakan data embedded dari API
          const label = filterType === "procurement"
            ? `${prod?.name || it.product?.name || "Item"} (${prod?.unit || it.product?.unit || ""})`
            : `${prod?.productName || it.product?.productName || "Produk"} (${prod?.conversionRatioX || it.product?.conversionRatioX || ""})`
          // finalPrice: pastikan selalu number
          const itemFinalPrice = typeof it.finalPrice === 'number'
            ? it.finalPrice
            : (parseFloat(it.finalPrice) || 0)

          fPriceX += it.finalPrice

          return {
            productId: it.productId?._id || it.productId,
            quantity: it.quantity,
            finalPrice: it.finalPrice,
            note: it.note || "",
            _productLabel: label,
            _product: prod,
          }
        })


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
                                    <div className="flex items-center gap-1">
                                      {(() => {
                                        const multiQty = getPurchaseQuantity(purchase)
                                        if (multiQty !== null) return '?'
                                        return `${purchase.quantity} (${unit})`
                                      })()}
                                    </div>
                                  </td>
                                )}
                                <td>
                                  {purchase.items?.length > 0 ? calcTotal(purchase._id) : purchase.finalPrice}
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
                                  {/* REQUESTED */}
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

                                  {/* APPROVED */}
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

                                  {/* ORDERED / COMPLETED SERVICE */}
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

                                  {/* ORDERED – edit nonCashDst (product / procurement) */}
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
                                const pName = filterType === "procurement"
                                  ? it.product?.name || "-"
                                  : it.product?.productName || ""

                                const pUnit = filterType === "procurement"
                                  ? it.product?.unit || ""
                                  : it.product?.conversionRatioX || ""

                                const hasNotes = selectedPurchase.items.some(
                                  (x: any) => x.note
                                )

                                return (
                                  <tr key={idx}>
                                    <td>
                                      {pName} {pUnit ? `(${pUnit})` : ""}
                                    </td>
                                    <td className="text-center">
                                      {it.quantity}
                                    </td>
                                    <td className="text-right">
                                      {it.finalPrice > 0
                                        ? `Rp ${it.finalPrice.toLocaleString("id-ID")}`
                                        : "-"
                                      }
                                    </td>
                                    <td className="text-right font-medium">
                                      {it.finalPrice > 0
                                        ? `Rp ${(it.finalPrice * it.quantity).toLocaleString("id-ID")}`
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
      < dialog
        ref={editRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Edit Purchase Requisition
            </span>

            <form
              onSubmit={editForm.handleSubmit(editSubmit)}
              className="flex flex-col gap-4"
            >
              {/* ── Header: Tanggal + Supplier ─────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tanggal Pembelian</legend>
                  <input
                    {...editForm.register("customDate", { required: true })}
                    className="input w-full"
                    type="date"
                  />
                </fieldset>

                {(filterType === "product" || filterType === "procurement") && (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Supplier / Asal</legend>
                    <input
                      className="input w-full"
                      {...editForm.register("customSupplier")}
                      type="text"
                      placeholder="Nama supplier (opsional)"
                    />
                  </fieldset>
                )}

                {filterType === "service" && (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Vendor</legend>
                    <select
                      {...editForm.register("vendorId", { required: true })}
                      className="select w-full"
                    >
                      {vendors.map((vendor) => (
                        <option value={vendor._id} key={vendor._id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                )}
              </div>

              {/* ── Service: single fields ─────────────────────────────── */}
              {filterType === "service" && (
                <div className="flex flex-col gap-3">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Description (Jasa)</legend>
                    <input
                      {...editForm.register("description", { required: true })}
                      className="input w-full"
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Price (Rp)</legend>
                    <input
                      {...editForm.register("finalPrice", { required: true })}
                      className="input w-full"
                      type="number"
                    />
                  </fieldset>
                </div>
              )}

              {/* ── Product / Procurement: multi-item ─────────────────── */}
              {(filterType === "product" || filterType === "procurement") && (
                <div className="flex flex-col gap-3">
                  {/* Item draft input */}
                  <div className="border border-blue-100 rounded-lg bg-blue-50 p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                      Tambah / Ubah Item
                    </p>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      {/* Pilih Produk */}
                      <div className="col-span-5 flex flex-col gap-1">
                        <label className="text-xs text-gray-600">
                          {filterType === "product" ? "Produk" : "Item"}
                        </label>
                        <select
                          className="input w-full text-sm"
                          value={editItemDraft.productId}
                          onChange={(e) => {
                            setEditItemDraft((d: any) => ({ ...d, productId: e.target.value }))
                            setEditLastPriceInfo(null)
                            fetchLastPurchasePrice(e.target.value, "edit")
                          }}
                        >
                          <option value="">-- Pilih --</option>
                          {filterType === "product"
                            ? products.map((product) => (
                              <option key={product._id} value={product._id}>
                                {product.productName} ({product.conversionRatioX})
                              </option>
                            ))
                            : items.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-xs text-gray-600">Qty</label>
                        <input
                          type="number"
                          min="1"
                          className="input w-full text-sm"
                          value={editItemDraft.quantity}
                          onChange={(e) => setEditItemDraft((d: any) => ({ ...d, quantity: e.target.value }))}
                        />
                      </div>

                      {/* Harga per item */}
                      <div className="col-span-3 flex flex-col gap-1">
                        <label className="text-xs text-gray-600">total / item</label>
                        <NumericFormat
                          className="input w-full text-sm"
                          thousandSeparator="."
                          decimalSeparator=","
                          decimalScale={0}
                          allowNegative={false}
                          placeholder="0"
                          value={editItemDraft.finalPrice}
                          onValueChange={(vals) => setEditItemDraft((d: any) => ({ ...d, finalPrice: vals.value }))}
                        />
                      </div>

                      {/* Tombol Tambah */}
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={addEditItemToDraft}
                          className="btn w-full bg-blue-700 text-white hover:bg-blue-800 btn-sm h-10"
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>

                    {/* Riwayat harga terakhir */}
                    {editLastPriceLoading && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span className="loading loading-spinner loading-xs" />
                        Mengambil riwayat harga...
                      </div>
                    )}
                    {!editLastPriceLoading && editLastPriceInfo && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Terakhir dibeli:</span>
                          <span className="font-bold text-amber-900">
                            Rp {(editLastPriceInfo.finalPrice ?? 0).toLocaleString("id-ID")}
                          </span>
                          <span className="text-amber-600">·</span>
                          <span>qty: <span className="font-semibold">{editLastPriceInfo.quantity}</span></span>
                          {editLastPriceInfo.date && (
                            <>
                              <span className="text-amber-600">·</span>
                              <span className="text-amber-600">
                                {new Date(editLastPriceInfo.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </>
                          )}
                          {editLastPriceInfo.customSupplier && (
                            <>
                              <span className="text-amber-600">·</span>
                              <span className="italic text-amber-700">{editLastPriceInfo.customSupplier}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Daftar item yang sudah ada */}
                  {editItems.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Daftar Item ({editItems.length})
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="table table-sm text-sm w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left">Produk/Item</th>
                              <th className="text-center">Qty</th>
                              <th className="text-right">Total/Item</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {editItems.map((it, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="text-left">{it._productLabel}</td>
                                <td className="text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    className="input input-xs w-16 text-center"
                                    value={it.quantity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 1
                                      setEditItems(prev => prev.map((x, i) =>
                                        i === idx ? { ...x, quantity: val } : x
                                      ))
                                    }}
                                  />
                                </td>
                                <td className="text-right">
                                  <NumericFormat
                                    className="input input-xs w-28 text-right"
                                    thousandSeparator="."
                                    decimalSeparator=","
                                    decimalScale={0}
                                    allowNegative={false}
                                    placeholder="0"
                                    value={it.finalPrice > 0 ? it.finalPrice : ""}
                                    onValueChange={(vals) => {
                                      const val = vals.floatValue ?? 0
                                      setEditItems(prev => prev.map((x, i) =>
                                        i === idx ? { ...x, finalPrice: val } : x
                                      ))
                                    }}
                                  />
                                </td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeEditItemFromDraft(idx)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Hapus item"
                                  >
                                    <HugeiconsIcon icon={MultiplicationSignIcon} size={16} color="currentColor" />
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Total Harga:</span>
                            <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500">
                              <input
                                type="checkbox"
                                className="checklist checklist-xs"
                                checked={editTotalMode === "manual"}
                                onChange={(e) => {
                                  setEditTotalMode(e.target.checked ? "manual" : "auto")
                                  if (!e.target.checked) setEditTotalOverride("")
                                }}
                              />
                              Override
                            </label>
                          </div>
                          {editTotalMode === "auto" ? (
                            <span className="font-bold text-blue-800 text-base">
                              Rp {calcEditItemsTotal().toLocaleString("id-ID")}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <NumericFormat
                                className="input input-sm w-40 text-right font-bold text-blue-800"
                                thousandSeparator="."
                                decimalSeparator=","
                                decimalScale={0}
                                allowNegative={false}
                                placeholder="Total harga"
                                value={editTotalOverride}
                                onValueChange={(vals) => setEditTotalOverride(vals.value)}
                              />
                            </div>
                          )}
                        </div>
                        {editTotalMode === "auto" && calcEditItemsTotal() === 0 && (
                          <p className="text-xs text-amber-600">
                            ⚠ Semua item belum memiliki harga. Centang &quot;Override&quot; untuk mengisi total secara manual.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {editItems.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400 border border-dashed rounded-lg">
                      Belum ada item. Gunakan form di atas untuk menambahkan item.
                    </div>
                  )}
                </div>
              )}

              {(editFn.noResult || editFn.error) && (
                <label className="input-validator text-red-900">
                  something went wrong
                </label>
              )}

              <div className="mt-auto ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    editRef.current?.close()
                    setEditItems([])
                    setEditItemDraft({ productId: "", quantity: 1, finalPrice: "", note: "" })
                    setEditTotalOverride("")
                    setEditTotalMode("auto")
                    setEditLastPriceInfo(null)
                    setEditingPurchase(null)
                  }}
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div >
      </dialog >

      {/* =====================================================
          MODAL ADD REQUISITION
      ===================================================== */}
      < dialog
        ref={modalRef}
        id="add-purchase-requisition"
        className="modal text-black"
      >
        <div className="modal-box max-h-[90vh] overflow-y-auto">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Add Purchase Requisition
            </span>

            <form
              onSubmit={newPrForm.handleSubmit(submit)}
              className="flex flex-col gap-4"
            >
              {/* ── Header: Tanggal + Supplier ─────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tanggal Pembelian</legend>
                  <input
                    {...newPrForm.register("customDate", { required: true })}
                    className="input w-full"
                    type="date"
                  />
                </fieldset>

                {(filterType === "product" || filterType === "procurement") && (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Supplier / Asal</legend>
                    <input
                      className="input w-full"
                      {...newPrForm.register("customSupplier")}
                      type="text"
                      placeholder="Nama supplier (opsional)"
                    />
                  </fieldset>
                )}

                {filterType === "service" && (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Vendor</legend>
                    <select
                      {...newPrForm.register("vendorId", { required: true })}
                      className="select w-full"
                    >
                      {vendors.map((vendor) => (
                        <option value={vendor._id} key={vendor._id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                )}
              </div>

              {/* ── Service: single description + price ───────────────── */}
              {filterType === "service" && (
                <div className="flex flex-col gap-3">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Description (Jasa)</legend>
                    <input
                      {...newPrForm.register("description", { required: true })}
                      className="input w-full"
                    />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Price (Rp)</legend>
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
                          className="input w-full"
                          placeholder="Contoh: 160000"
                        />
                      )}
                    />
                  </fieldset>
                </div>
              )}

              {/* ── Product / Procurement: multi-item ─────────────────── */}
              {(filterType === "product" || filterType === "procurement") && (
                <div className="flex flex-col gap-3">
                  {/* Item draft input */}
                  <div className="border border-blue-100 rounded-lg bg-blue-50 p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                      Tambah Item ke Daftar
                    </p>

                    <div className="grid grid-cols-12 gap-2 items-end">
                      {/* Pilih Produk */}
                      <div className="col-span-5 flex flex-col gap-1">
                        <label className="text-xs text-gray-600">
                          {filterType === "product" ? "Produk" : "Item"}
                        </label>
                        <select
                          className="input w-full text-sm"
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
                            : items.map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.name} ({item.unit})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Qty */}
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-xs text-gray-600">Qty</label>
                        <input
                          type="number"
                          min="1"
                          className="input w-full text-sm"
                          value={addItemDraft.quantity}
                          onChange={(e) => setAddItemDraft((d: any) => ({ ...d, quantity: e.target.value }))}
                        />
                      </div>

                      {/* Harga per item (opsional) */}
                      <div className="col-span-3 flex flex-col gap-1">
                        <label className="text-xs text-gray-600">total / item</label>
                        <NumericFormat
                          className="input w-full text-sm"
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
                      <div className="col-span-2">
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
                    {!addLastPriceLoading && addLastPriceInfo && (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Terakhir dibeli:</span>
                          <span className="font-bold text-amber-900">
                            Rp {(addLastPriceInfo.finalPrice ?? 0).toLocaleString("id-ID")}
                          </span>
                          <span className="text-amber-600">·</span>
                          <span>qty: <span className="font-semibold">{addLastPriceInfo.quantity}</span></span>
                          {addLastPriceInfo.date && (
                            <>
                              <span className="text-amber-600">·</span>
                              <span className="text-amber-600">
                                {new Date(addLastPriceInfo.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Daftar item yang sudah ditambahkan */}
                  {addItems.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Daftar Item ({addItems.length})
                      </p>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="table table-sm text-sm w-full">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left">Produk/Item</th>
                              <th className="text-center">Qty</th>
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
                                    <HugeiconsIcon icon={MultiplicationSignIcon} size={16} color="currentColor" />
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Total Harga:</span>
                            <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500">
                              <input
                                type="checkbox"
                                className="checklist checklist-xs"
                                checked={addTotalMode === "manual"}
                                onChange={(e) => {
                                  setAddTotalMode(e.target.checked ? "manual" : "auto")
                                  if (!e.target.checked) setAddTotalOverride("")
                                }}
                              />
                              Override
                            </label>
                          </div>
                          {addTotalMode === "auto" ? (
                            <span className="font-bold text-blue-800 text-base">
                              Rp {calcAddItemsTotal().toLocaleString("id-ID")}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <NumericFormat
                                className="input input-sm w-40 text-right font-bold text-blue-800"
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
                        {addTotalMode === "auto" && calcAddItemsTotal() === 0 && (
                          <p className="text-xs text-amber-600">
                            ⚠ Semua item belum memiliki harga. Total akan 0. Centang &quot;Override manual&quot; untuk mengisi total secara manual.
                          </p>
                        )}
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
                <label className="input-validator text-red-900">
                  something went wrong
                </label>
              )}

              <div className="mt-auto ml-auto flex gap-2">
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
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addFn.loading}
                  className="p-3 rounded-md text-white bg-blue-900 disabled:opacity-50"
                >
                  {addFn.loading ? "Menyimpan..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog >

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
                            const pName = filterType === "procurement"
                              ? it.product?.name || "-"
                              : it.product?.productName || "-"
                            const pUnit = filterType === "procurement"
                              ? it.product?.unit || ""
                              : it.product?.conversionRatioX || ""
                            return (
                              <tr key={idx}>
                                <td>{pName} {pUnit ? `(${pUnit})` : ""}</td>
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
                      Destinasi non cash
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
                      deskripsi
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
              Edit Destinasi Non-Cash
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
    </>
  )
}

export default withAuth(Purchases)