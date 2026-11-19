"use client"

import React, { Suspense, useEffect, useState, useMemo, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useForm } from "react-hook-form"

type Unit = {
  _id?: string
  name?: string
  symbol?: string
}

type Product = {
  _id?: string
  name?: string
  productName?: string
  unit?: string | Unit
  saleUnit?: string | Unit
  purchaseUnit?: string
  conversionRatioX?: string
  conversionRatioY?: string
}

type ReceivingLogItem = {
  _id: string
  purchaseOrderNumber?: string
  purchaseId?: string
  productId?: string
  product?: Product
  item?: {
    _id?: string
    name?: string
    measurement?: string
    unit?: string | Unit
  }
  qty: number
  accumulative?: number
  batchNumber?: string
  status?: string
  saveAs?: "inventory" | "asset"
  unitLabels?: string[]
  receivedDate?: string
  createdAt?: string
  expiryDate?: string
  location?: {
    _id?: string
    name?: string
  }
  supplier?: {
    _id?: string
    bussinessName?: string
  }
  user?: {
    _id?: string
    name?: string
    username?: string
  }
  editor?: {
    _id?: string
    name?: string
  }
  approver?: {
    _id?: string
    name?: string
  }
  editedAt?: string
}

function ReceivingLogContent() {
  const searchParams = useSearchParams()
  const initialSo = searchParams.get("so") || ""
  const initialType = searchParams.get("type") as "product" | "procurement" | null

  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const [purchaseType, setPurchaseType] = useState<"product" | "procurement">(
    initialType === "procurement" ? "procurement" : "product"
  )
  const [soFilter, setSoFilter] = useState<string>(initialSo)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [pageSize, setPageSize] = useState<number>(20)

  const [logs, setLogs] = useState<ReceivingLogItem[]>([])

  const editRef = useRef<HTMLDialogElement>(null)
  const editPrForm = useForm()

  const fetchLogsFn = useFetch<ReceivingLogItem[], any>({
    url: "",
    method: "GET",
    onError: (msg) => alert(msg)
  })

  const editFn = useFetch<any, any>({
    url: "/api/web/rlog",
    method: "PUT",
    onError: (msg) => alert(msg)
  })

  const refreshLogs = (type: "product" | "procurement", currentSo: string) => {
    let url = `/api/web/rlog?type=${type}`
    if (currentSo && currentSo.trim() && currentSo !== "null") {
      url += `&so=${encodeURIComponent(currentSo.trim())}`
    }
    fetchLogsFn.fn(url, JSON.stringify({}), (result) => {
      setLogs(Array.isArray(result) ? result : [])
    })
  }

  useEffect(() => {
    if (hasHydrated) {
      const selectedType = initialType === "procurement" ? "procurement" : "product"
      setPurchaseType(selectedType)
      setSoFilter(initialSo)
      refreshLogs(selectedType, initialSo)
    }
  }, [hasHydrated, initialSo, initialType])

  const handleTabChange = (type: "product" | "procurement") => {
    setPurchaseType(type)
    refreshLogs(type, soFilter)
  }

  const handleClearSoFilter = () => {
    setSoFilter("")
    refreshLogs(purchaseType, "")
  }

  // Get item / product display name
  const getItemName = (log: ReceivingLogItem) => {
    if (purchaseType === "procurement") {
      const name = log.item?.name || "Item Procurement"
      return log.saveAs === "asset" ? `[Asset] ${name}` : name
    }
    return log.product?.productName || log.product?.name || "Produk"
  }

  // Helper to check if string is a raw 24-char ObjectId
  const isObjectId = (val: any) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val)

  const formatUnitValue = (val: any): string => {
    if (!val) return ""
    if (typeof val === "string") {
      return isObjectId(val) ? "" : val
    }
    if (typeof val === "object") {
      const s = val.symbol || val.name
      if (s && !isObjectId(s)) return s
    }
    return ""
  }

  // Get unit
  const getItemUnit = (log: ReceivingLogItem) => {
    if (purchaseType === "procurement") {
      if (log.saveAs === "asset") {
        return log.item?.measurement || "Unit"
      }
      const u = formatUnitValue(log.item?.unit) || formatUnitValue(log.item?.measurement)
      return u || "Pcs"
    }

    const p = log.product
    if (!p) return "-"
    if (p.conversionRatioX && !isObjectId(p.conversionRatioX)) return p.conversionRatioX
    const u = formatUnitValue(p.unit) || formatUnitValue(p.saleUnit) || formatUnitValue(p.purchaseUnit)
    return u || "Pcs"
  }

  // Filtered displayed logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Date filter
      if (dateFilter) {
        const itemDate = (log.receivedDate || log.createdAt || "").slice(0, 10)
        if (itemDate !== dateFilter) return false
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const poMatch = log.purchaseOrderNumber?.toLowerCase().includes(q)
        const nameMatch = getItemName(log).toLowerCase().includes(q)
        const batchMatch = log.batchNumber?.toLowerCase().includes(q)
        const userMatch = (log.user?.name || log.user?.username || "").toLowerCase().includes(q)
        const locMatch = (log.location?.name || "").toLowerCase().includes(q)
        const suppMatch = (log.supplier?.bussinessName || "").toLowerCase().includes(q)

        return poMatch || nameMatch || batchMatch || userMatch || locMatch || suppMatch
      }

      return true
    })
  }, [logs, searchQuery, dateFilter, purchaseType])

  // Summary statistics
  const totalEntries = filteredLogs.length
  const totalReceivedQty = useMemo(() => {
    return filteredLogs.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0)
  }, [filteredLogs])

  // Edit action
  const openEditModal = (logItem: ReceivingLogItem) => {
    const isProc = purchaseType === "procurement"
    const rDate = (logItem.receivedDate || logItem.createdAt || "").slice(0, 10)

    editPrForm.reset({
      _id: logItem._id,
      itemName: getItemName(logItem),
      qty: logItem.qty,
      receivedDate: rDate || new Date().toISOString().slice(0, 10),
      expiryDate: logItem.expiryDate ? logItem.expiryDate.slice(0, 10) : "",
      approvalCode: "",
      type: isProc ? "procurement" : "product"
    })

    editRef.current?.showModal()
  }

  const handleEditSubmit = async (data: any) => {
    const { _id, qty, expiryDate, receivedDate, approvalCode, type: submitType } = data
    const qtyNum = parseInt(qty)

    if (!qtyNum || isNaN(qtyNum) || qtyNum <= 0) {
      alert("Masukkan kuantiti yang valid (lebih dari 0)")
      return
    }

    if (!approvalCode || !approvalCode.trim()) {
      alert("Approval Code wajib diisi untuk mengubah data receiving log")
      return
    }

    const payload: any = {
      _id,
      qty: qtyNum,
      approvalCode: approvalCode.trim(),
      editingUserId: userId,
      type: submitType
    }

    if (receivedDate) {
      payload.receivedDate = new Date(receivedDate).toISOString()
    }
    if (submitType === "product" && expiryDate) {
      payload.expiryDate = new Date(expiryDate).toISOString()
    }

    await editFn.fn("", JSON.stringify(payload), () => {
      editRef.current?.close()
      alert("Receiving log berhasil diperbarui")
      refreshLogs(purchaseType, soFilter)
    })
  }

  return (
    <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
      {/* Header & Back Navigation */}
      <div className="flex flex-row flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/warehouse/receiving"
              className="text-blue-700 hover:text-blue-900 flex items-center gap-1 text-sm font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Kembali ke Receiving
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-500">Log Penerimaan Barang</span>
          </div>
          <h1 className="page-title text-2xl font-bold mt-1">Receiving Log</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshLogs(purchaseType, soFilter)}
            disabled={fetchLogsFn.loading}
            className="btn btn-sm btn-outline flex items-center gap-1.5 text-gray-700 hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 ${fetchLogsFn.loading ? "animate-spin" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-4 md:gap-6 rounded-b shadow-sm">
        {/* Toolbar & Filters */}
        <div className="flex flex-row flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-row flex-wrap gap-3 items-center">
            {/* Tabs */}
            <div className="tabs tabs-boxed bg-gray-100 p-1">
              <button
                type="button"
                className={`tab ${purchaseType === "product" ? "tab-active bg-blue-900 text-white font-semibold" : "text-gray-700"}`}
                onClick={() => handleTabChange("product")}
              >
                Products
              </button>
              <button
                type="button"
                className={`tab ${purchaseType === "procurement" ? "tab-active bg-blue-900 text-white font-semibold" : "text-gray-700"}`}
                onClick={() => handleTabChange("procurement")}
              >
                Procurement
              </button>
            </div>

            {/* Entries selector */}
            <div className="flex flex-row gap-2 items-center text-sm text-gray-600">
              Show
              <select
                className="select select-bordered select-sm w-20"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              Entries
            </div>
          </div>

          <div className="flex flex-row flex-wrap gap-2 items-center">
            {/* Filter Tanggal */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input input-bordered input-sm text-sm"
                title="Filter berdasarkan tanggal terima"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  className="btn btn-ghost btn-xs text-red-500"
                  title="Hapus filter tanggal"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                placeholder="Cari PO, produk, batch..."
                className="input input-bordered input-sm pl-8 text-sm w-48 md:w-64"
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* PO Filter Banner */}
        {soFilter && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              <span>
                Menampilkan log penerimaan untuk PO: <strong>{soFilter}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSoFilter}
              className="btn btn-sm btn-ghost text-blue-700 hover:bg-blue-100 font-semibold"
            >
              Tampilkan Semua PO ✕
            </button>
          </div>
        )}

        {/* Table Content */}
        {fetchLogsFn.loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-16">
            <span className="loading loading-spinner loading-lg text-blue-900" />
            <p className="text-sm text-gray-500 mt-2">Memuat riwayat log penerimaan...</p>
          </div>
        ) : fetchLogsFn.error ? (
          <div className="alert alert-error my-4">
            <span>{fetchLogsFn.message || "Gagal memuat log penerimaan"}</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-gray-400 mx-auto mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="text-gray-500 font-medium">Tidak ada receiving log yang ditemukan</p>
            {(searchQuery || dateFilter || soFilter) && (
              <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau bersihkan filter</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full border border-gray-200 rounded-lg">
            <table className="table table-sm md:table-md w-full text-center">
              <thead className="bg-gray-100 text-gray-700 text-xs uppercase font-semibold">
                <tr>
                  <th>No</th>
                  <th className="text-left">Tanggal</th>
                  <th>No. PO</th>
                  <th className="text-left">Produk</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.slice(0, pageSize).map((log, index) => {
                  const dateStr = log.receivedDate || log.createdAt
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                    : "-"

                  const unit = getItemUnit(log)

                  return (
                    <tr key={log._id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="text-gray-400 text-xs">{index + 1}</td>

                      {/* Tanggal */}
                      <td className="text-left font-medium text-xs md:text-sm whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* No. PO */}
                      <td className="font-mono text-xs md:text-sm">
                        {log.purchaseOrderNumber || "-"}
                      </td>

                      {/* Produk */}
                      <td className="text-left font-medium max-w-xs">
                        <div className="text-gray-900 font-semibold">{getItemName(log)}</div>
                      </td>

                      {/* Quantity */}
                      <td>
                        <span className="inline-block bg-green-100 text-green-800 font-bold px-2.5 py-1 rounded-full text-xs">
                          {log.qty} {unit}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        {filteredLogs.length > pageSize && (
          <div className="text-xs text-gray-500 text-center">
            Menampilkan {pageSize} dari {filteredLogs.length} data log penerimaan.
          </div>
        )}
      </div>

      {/* ========================================================
          Modal Edit Receiving Log
      ======================================================== */}
      <dialog ref={editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg">Edit Receiving Log</h3>
              <p className="text-xs text-gray-500 mt-0.5">Koreksi data penerimaan yang dicatat</p>
            </div>
            <button
              type="button"
              onClick={() => editRef.current?.close()}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>

          <form onSubmit={editPrForm.handleSubmit(handleEditSubmit)} className="flex flex-col gap-3">
            <input type="hidden" {...editPrForm.register("type")} />
            <input type="hidden" {...editPrForm.register("_id")} />

            {/* Nama Produk / Item (Read only) */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs">Produk / Item</span>
              </label>
              <input
                className="input input-bordered input-sm w-full bg-gray-100"
                {...editPrForm.register("itemName")}
                type="text"
                readOnly
              />
            </div>

            {/* Quantity */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs">Quantity Diterima</span>
              </label>
              <input
                className="input input-bordered input-sm w-full"
                {...editPrForm.register("qty", { required: true })}
                type="number"
                min={1}
                placeholder="Jumlah yang diterima"
              />
            </div>

            {/* Tanggal Terima */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs">Tanggal Penerimaan</span>
              </label>
              <input
                className="input input-bordered input-sm w-full"
                {...editPrForm.register("receivedDate")}
                type="date"
              />
            </div>

            {/* Expiry Date (Khusus product) */}
            {purchaseType === "product" && (
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-semibold text-xs">Expiry Date</span>
                </label>
                <input
                  className="input input-bordered input-sm w-full"
                  {...editPrForm.register("expiryDate")}
                  type="date"
                />
              </div>
            )}

            {/* Approval Code */}
            <div className="form-control mt-1">
              <label className="label py-1">
                <span className="label-text font-semibold text-xs text-red-600">
                  Approval Code (Wajib untuk validasi koreksi)
                </span>
              </label>
              <input
                className="input input-bordered input-sm w-full border-red-300"
                {...editPrForm.register("approvalCode", { required: true })}
                type="password"
                placeholder="Masukkan approval code manager/admin"
              />
            </div>

            {editFn.error && (
              <div className="alert alert-error text-xs py-2">
                <span>{editFn.message}</span>
              </div>
            )}

            <div className="modal-action mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => editRef.current?.close()}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={editFn.loading}
                className="btn btn-sm bg-blue-900 text-white hover:bg-blue-800"
              >
                {editFn.loading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

export default function Rlog() {
  return (
    <Suspense
      fallback={
        <div className="h-full p-6 flex justify-center items-center">
          <span className="loading loading-spinner loading-lg text-blue-900" />
        </div>
      }
    >
      <ReceivingLogContent />
    </Suspense>
  )
}
