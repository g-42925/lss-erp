/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import withAuth from "@/hofs/withAuth"
import { useRef, useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PackageRemoveIcon,
  InformationCircleIcon,
  CheckmarkSquareIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseReturn = {
  _id: string
  returnNumber: string
  purchaseOrderNumber: string
  status: "draft" | "approved" | "rejected"
  returnQty: number
  returnAmount: number
  reason: string
  reasonNote: string
  created_at: string
  product?: { productName: string; unit: string }
  supplier?: { bussinessName: string }
  createdBy?: { name: string }
  approvedBy?: { name: string }
  approvedAt?: string
}

type Purchase = {
  _id: string
  purchaseOrderNumber: string
  status: string
  finalPrice: number
  shippingCost: number
  taxAmount: number
  quantity: number
  receivedQty: number
  product?: { productName: string; unit: string }
  supplier?: { bussinessName: string }
  batches?: any[]
}

type Batch = {
  _id: string
  batchNumber: string
  qty: number
  accumulative: number
  status: string
  purchaseOrderNumber: string
}

const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)

const REASON_LABELS: Record<string, string> = {
  defective: "Barang Cacat / Rusak",
  wrong_item: "Salah Item",
  excess_qty: "Kelebihan Kuantitas",
  other: "Lainnya",
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
}

// ─── Main Component ───────────────────────────────────────────────────────────

function PurchaseReturnPage() {
  const userId = useAuth((s) => s.userId)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const detailRef = useRef<HTMLDialogElement>(null)

  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null)
  const [batchLoading, setBatchLoading] = useState(false)

  // Form state
  const [formPurchaseId, setFormPurchaseId] = useState("")
  const [formBatchId, setFormBatchId] = useState("")
  const [formReturnQty, setFormReturnQty] = useState(1)
  const [formReason, setFormReason] = useState("excess_qty")
  const [formNote, setFormNote] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)

  const getFn = useFetch<PurchaseReturn[], any>({ url: "", method: "GET", onError: (m) => alert(m) })
  const getPurchasesFn = useFetch<Purchase[], any>({ url: "", method: "GET", onError: (m) => alert(m) })
  const getBatchesFn = useFetch<Batch[], any>({ url: "", method: "GET", onError: (m) => alert(m) })
  const postFn = useFetch<any, any>({ url: "/api/web/purchase-return", method: "POST", onError: (m) => alert(m) })

  // Load data on mount
  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return
    const body = JSON.stringify({})

    getFn.fn(`/api/web/purchase-return?id=${masterAccountId}`, body, (result) => {
      setReturns(result || [])
    })

    // Fetch ordered/completed purchases (product type only)
    getPurchasesFn.fn(`/api/web/purchases?id=${masterAccountId}&type=product`, body, (result) => {
      const eligible = (result || []).filter(
        (p: any) => p.status === "ordered" || p.status === "completed"
      )
      setPurchases(eligible)
    })
  }, [masterAccountId, hasHydrated])

  // When a purchase is selected in the modal → load its batches
  async function onSelectPurchase(purchaseId: string) {
    setFormPurchaseId(purchaseId)
    setFormBatchId("")
    setSelectedBatch(null)
    setBatches([])

    if (!purchaseId) { setSelectedPurchase(null); return }

    const found = purchases.find((p) => p._id === purchaseId) || null
    setSelectedPurchase(found)

    if (!found) return

    setBatchLoading(true)
    const body = JSON.stringify({})
    getBatchesFn.fn(
      `/api/web/batches?poNumber=${found.purchaseOrderNumber}`,
      body,
      (result) => {
        const eligible = (result || []).filter(
          (b: any) => b.status === "ACTIVE" || b.status === "QUARANTINE"
        )
        setBatches(eligible)
        setBatchLoading(false)
      }
    )
  }

  function onSelectBatch(batchId: string) {
    setFormBatchId(batchId)
    const found = batches.find((b) => b._id === batchId) || null
    setSelectedBatch(found)
    if (found) setFormReturnQty(1)
  }

  function openModal() {
    setFormPurchaseId("")
    setFormBatchId("")
    setFormReturnQty(1)
    setFormReason("excess_qty")
    setFormNote("")
    setSelectedPurchase(null)
    setSelectedBatch(null)
    setBatches([])
    modalRef.current?.showModal()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formPurchaseId) return alert("Pilih Purchase Order terlebih dahulu")
    if (!formBatchId) return alert("Pilih Batch terlebih dahulu")
    if (formReturnQty < 1) return alert("Jumlah retur minimal 1")
    if (selectedBatch && formReturnQty > selectedBatch.qty) {
      return alert(`Jumlah retur tidak boleh melebihi qty batch (${selectedBatch.qty})`)
    }

    setFormSubmitting(true)
    const body = JSON.stringify({
      masterAccountId,
      purchaseId: formPurchaseId,
      batchId: formBatchId,
      returnQty: formReturnQty,
      reason: formReason,
      reasonNote: formNote,
      createdBy: userId,
    })

    postFn.fn("", body, (result) => {
      setReturns((prev) => [result, ...prev])
      modalRef.current?.close()
      setFormSubmitting(false)
    })
    setFormSubmitting(false)
  }

  // Compute return amount preview
  const unitCost = selectedPurchase
    ? ((selectedPurchase.finalPrice || 0) + (selectedPurchase.shippingCost || 0) + (selectedPurchase.taxAmount || 0)) /
      (selectedPurchase.quantity || 1)
    : 0
  const returnAmountPreview = unitCost * formReturnQty

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        {/* Header */}
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={PackageRemoveIcon} size={28} color="#1e3a8a" />
          <span className="text-2xl font-semibold text-gray-800">Purchase Return</span>
        </div>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <p className="text-sm text-gray-500">Daftar retur pembelian ke supplier — menunggu persetujuan Finance</p>
            <button onClick={openModal} className="btn ml-auto gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Buat Retur
            </button>
          </div>

          {/* Table */}
          {getFn.loading ? (
            <div className="flex-1 flex justify-center items-center">
              <span className="loading loading-spinner loading-xl" />
            </div>
          ) : returns.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-2 text-gray-400 py-16">
              <HugeiconsIcon icon={PackageRemoveIcon} size={48} color="currentColor" />
              <p>Belum ada data retur pembelian</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="table text-sm text-center">
                <thead className="bg-gray-50">
                  <tr>
                    <th>Tanggal</th>
                    <th>No. Retur</th>
                    <th>PO Number</th>
                    <th>Produk</th>
                    <th>Supplier</th>
                    <th>Qty</th>
                    <th>Nilai Retur</th>
                    <th>Alasan</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td>{new Date(r.created_at).toLocaleDateString("id-ID")}</td>
                      <td className="font-mono text-xs">{r.returnNumber}</td>
                      <td className="font-mono text-xs">{r.purchaseOrderNumber}</td>
                      <td className="text-left">{r.product?.productName || "-"}</td>
                      <td>{r.supplier?.bussinessName || "-"}</td>
                      <td>{r.returnQty}</td>
                      <td className="font-medium text-right">{IDR(r.returnAmount)}</td>
                      <td className="text-xs">{REASON_LABELS[r.reason] || r.reason}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status]}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Lihat detail"
                          onClick={() => { setSelectedReturn(r); detailRef.current?.showModal() }}
                        >
                          <HugeiconsIcon icon={InformationCircleIcon} size={20} color="currentColor" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Buat Retur ─────────────────────────────────────────────── */}
      <dialog ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <form method="dialog" className="absolute right-4 top-4">
            <button className="text-gray-400 hover:text-gray-600">
              <HugeiconsIcon icon={Cancel01Icon} size={20} color="currentColor" />
            </button>
          </form>

          <h3 className="text-lg font-semibold mb-4 text-blue-900">Buat Purchase Return</h3>

          {/* Info box */}
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
            <HugeiconsIcon icon={InformationCircleIcon} size={16} color="currentColor" />
            <span>
              Return yang dibuat akan berstatus <strong>Menunggu</strong> dan perlu disetujui oleh Finance.
              Setelah disetujui, stok batch akan otomatis dikurangi.
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Pilih PO */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Purchase Order (PO)</legend>
              <select
                className="select w-full"
                value={formPurchaseId}
                onChange={(e) => onSelectPurchase(e.target.value)}
                required
              >
                <option value="">-- Pilih PO --</option>
                {purchases.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.purchaseOrderNumber} — {p.product?.productName || "?"} ({p.supplier?.bussinessName || "No Supplier"})
                  </option>
                ))}
              </select>
            </fieldset>

            {/* Info PO terpilih */}
            {selectedPurchase && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex flex-col gap-1">
                <div className="flex gap-4 flex-wrap">
                  <span><strong>Produk:</strong> {selectedPurchase.product?.productName}</span>
                  <span><strong>Supplier:</strong> {selectedPurchase.supplier?.bussinessName || "-"}</span>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <span><strong>Qty PO:</strong> {selectedPurchase.quantity} {selectedPurchase.product?.unit}</span>
                  <span><strong>Unit Cost:</strong> {IDR(unitCost)}</span>
                </div>
              </div>
            )}

            {/* Pilih Batch */}
            {selectedPurchase && (
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Batch yang Diretur</legend>
                {batchLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : batches.length === 0 ? (
                  <p className="text-sm text-red-500">Tidak ada batch aktif untuk PO ini</p>
                ) : (
                  <select
                    className="select w-full"
                    value={formBatchId}
                    onChange={(e) => onSelectBatch(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Batch --</option>
                    {batches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.batchNumber} — Qty tersedia: {b.qty} ({b.status})
                      </option>
                    ))}
                  </select>
                )}
              </fieldset>
            )}

            {/* Qty & Nilai Retur */}
            {selectedBatch && (
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Jumlah Retur (maks: {selectedBatch.qty})</legend>
                  <input
                    type="number"
                    min={1}
                    max={selectedBatch.qty}
                    value={formReturnQty}
                    onChange={(e) => setFormReturnQty(parseInt(e.target.value) || 1)}
                    className="input w-full"
                    required
                  />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Estimasi Nilai Retur</legend>
                  <input
                    type="text"
                    readOnly
                    value={IDR(returnAmountPreview)}
                    className="input w-full bg-gray-50 text-gray-600"
                  />
                </fieldset>
              </div>
            )}

            {/* Alasan */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Alasan Retur</legend>
              <select
                className="select w-full"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              >
                {Object.entries(REASON_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </fieldset>

            {/* Catatan */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Catatan (opsional)</legend>
              <textarea
                className="textarea w-full h-20"
                placeholder="Keterangan tambahan..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </fieldset>

            <button
              type="submit"
              disabled={formSubmitting || !formBatchId}
              className="btn bg-blue-900 text-white hover:bg-blue-800 ml-auto px-6"
            >
              {formSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Ajukan Retur"}
            </button>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* ── Modal: Detail ─────────────────────────────────────────────────── */}
      <dialog ref={detailRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-lg">
          <form method="dialog" className="absolute right-4 top-4">
            <button className="text-gray-400 hover:text-gray-600">
              <HugeiconsIcon icon={Cancel01Icon} size={20} color="currentColor" />
            </button>
          </form>

          {selectedReturn && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Detail Retur: {selectedReturn.returnNumber}</h3>
                <span className={`inline-flex mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[selectedReturn.status]}`}>
                  {STATUS_LABEL[selectedReturn.status] || selectedReturn.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><p className="text-gray-400 text-xs">PO Number</p><p className="font-mono font-medium">{selectedReturn.purchaseOrderNumber}</p></div>
                <div><p className="text-gray-400 text-xs">Produk</p><p>{selectedReturn.product?.productName || "-"}</p></div>
                <div><p className="text-gray-400 text-xs">Supplier</p><p>{selectedReturn.supplier?.bussinessName || "-"}</p></div>
                <div><p className="text-gray-400 text-xs">Qty Diretur</p><p className="font-bold">{selectedReturn.returnQty}</p></div>
                <div><p className="text-gray-400 text-xs">Nilai Retur</p><p className="font-bold text-blue-700">{IDR(selectedReturn.returnAmount)}</p></div>
                <div><p className="text-gray-400 text-xs">Alasan</p><p>{REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}</p></div>
                {selectedReturn.reasonNote && (
                  <div className="col-span-2"><p className="text-gray-400 text-xs">Catatan</p><p className="text-sm">{selectedReturn.reasonNote}</p></div>
                )}
                <div><p className="text-gray-400 text-xs">Tanggal Dibuat</p><p>{new Date(selectedReturn.created_at).toLocaleDateString("id-ID")}</p></div>
                {selectedReturn.approvedBy && (
                  <div><p className="text-gray-400 text-xs">Diapprove oleh</p><p>{(selectedReturn.approvedBy as any).name || "-"}</p></div>
                )}
                {selectedReturn.approvedAt && (
                  <div><p className="text-gray-400 text-xs">Tanggal Approve</p><p>{new Date(selectedReturn.approvedAt).toLocaleDateString("id-ID")}</p></div>
                )}
              </div>

              {selectedReturn.status === "draft" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700 flex items-start gap-2">
                  <HugeiconsIcon icon={InformationCircleIcon} size={16} color="currentColor" />
                  Menunggu persetujuan Finance. Setelah diapprove, stok batch akan otomatis dikurangi.
                </div>
              )}

              {selectedReturn.status === "approved" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 flex items-start gap-2">
                  <HugeiconsIcon icon={CheckmarkSquareIcon} size={16} color="currentColor" />
                  Return telah disetujui. Stok batch sudah dikurangi sebanyak <strong>&nbsp;{selectedReturn.returnQty}&nbsp;</strong> unit.
                </div>
              )}

              {selectedReturn.status === "rejected" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
                  <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" />
                  Return ini telah ditolak oleh Finance.
                </div>
              )}
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  )
}

export default withAuth(PurchaseReturnPage)
