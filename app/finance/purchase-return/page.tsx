/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useRef, useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  PackageRemoveIcon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  InformationCircleIcon,
  CheckmarkSquareIcon,
} from "@hugeicons/core-free-icons"
import Swal from "sweetalert2"

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

const FILTER_TABS = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancePurchaseReturnPage() {
  const userId = useAuth((s) => s.userId)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)

  const detailRef = useRef<HTMLDialogElement>(null)

  const [returns, setReturns] = useState<PurchaseReturn[]>([])
  const [activeTab, setActiveTab] = useState("draft")
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const getFn = useFetch<PurchaseReturn[], any>({ url: "", method: "GET", onError: (m) => alert(m) })
  const putFn = useFetch<any, any>({ url: "/api/web/purchase-return", method: "PUT", onError: (m) => alert(m) })

  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return
    loadData()
  }, [masterAccountId, hasHydrated])

  function loadData() {
    const body = JSON.stringify({})
    getFn.fn(`/api/web/purchase-return?id=${masterAccountId}`, body, (result) => {
      setReturns(result || [])
    })
  }

  const filtered = activeTab === "all"
    ? returns
    : returns.filter((r) => r.status === activeTab)

  async function handleApprove(ret: PurchaseReturn) {
    const confirm = await Swal.fire({
      title: "Approve Purchase Return?",
      html: `
        <div style="text-align:left;font-size:14px;">
          <p><strong>No. Retur:</strong> ${ret.returnNumber}</p>
          <p><strong>PO:</strong> ${ret.purchaseOrderNumber}</p>
          <p><strong>Produk:</strong> ${ret.product?.productName || "-"}</p>
          <p><strong>Qty Retur:</strong> ${ret.returnQty}</p>
          <p><strong>Nilai Retur:</strong> ${IDR(ret.returnAmount)}</p>
          <hr style="margin:8px 0"/>
          <p style="color:#166534;">✓ Stok batch akan dikurangi sebanyak ${ret.returnQty} unit</p>
          <p style="color:#166534;">✓ Stock value produk akan disesuaikan</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1e3a8a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Approve",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    setProcessing(ret._id)
    const payload = JSON.stringify({ _id: ret._id, action: "approve", userId })
    putFn.fn("", payload, (result) => {
      setReturns((prev) =>
        prev.map((r) => (r._id === ret._id ? { ...r, ...result, status: "approved" } : r))
      )
      setProcessing(null)
      Swal.fire({
        icon: "success",
        title: "Return Disetujui",
        text: `Stok batch berhasil dikurangi sebanyak ${ret.returnQty} unit.`,
        confirmButtonColor: "#1e3a8a",
      })
    })
    setProcessing(null)
  }

  async function handleReject(ret: PurchaseReturn) {
    const confirm = await Swal.fire({
      title: "Tolak Purchase Return ini?",
      text: "Return akan ditandai sebagai ditolak dan tidak bisa diubah lagi.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Tolak",
      cancelButtonText: "Batal",
    })

    if (!confirm.isConfirmed) return

    setProcessing(ret._id)
    const payload = JSON.stringify({ _id: ret._id, action: "reject", userId })
    putFn.fn("", payload, () => {
      setReturns((prev) =>
        prev.map((r) => (r._id === ret._id ? { ...r, status: "rejected" } : r))
      )
      setProcessing(null)
      Swal.fire({
        icon: "info",
        title: "Return Ditolak",
        text: "Purchase return telah ditolak.",
        confirmButtonColor: "#1e3a8a",
      })
    })
    setProcessing(null)
  }

  if (!hasHydrated) return null
  if (!loggedIn && typeof window !== "undefined") { window.location.href = "/login"; return null }

  const draftCount = returns.filter((r) => r.status === "draft").length
  const approvedCount = returns.filter((r) => r.status === "approved").length
  const totalReturnValue = returns
    .filter((r) => r.status === "approved")
    .reduce((s, r) => s + r.returnAmount, 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        {/* Header */}
        <div className="flex items-center gap-3">
          <HugeiconsIcon icon={PackageRemoveIcon} size={28} color="#1e3a8a" />
          <span className="text-2xl font-semibold text-gray-800">Finance — Purchase Return</span>
          {draftCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {draftCount}
            </span>
          )}
        </div>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-4">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-xs text-yellow-700">Menunggu Approval</p>
              <p className="text-2xl font-bold text-yellow-800">{draftCount}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-700">Disetujui</p>
              <p className="text-2xl font-bold text-green-800">{approvedCount}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-700">Total Nilai Retur (Disetujui)</p>
              <p className="text-lg font-bold text-blue-800">{IDR(totalReturnValue)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${activeTab === tab.key
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:text-blue-900 hover:bg-blue-50"
                  }`}
              >
                {tab.label}
                {tab.key === "draft" && draftCount > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{draftCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          {getFn.loading ? (
            <div className="flex-1 flex justify-center items-center">
              <span className="loading loading-spinner loading-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-2 text-gray-400 py-12">
              <HugeiconsIcon icon={PackageRemoveIcon} size={48} color="currentColor" />
              <p>Tidak ada data pada kategori ini</p>
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
                    <th>Dibuat oleh</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="text-xs">{new Date(r.created_at).toLocaleDateString("id-ID")}</td>
                      <td className="font-mono text-xs">{r.returnNumber}</td>
                      <td className="font-mono text-xs">{r.purchaseOrderNumber}</td>
                      <td className="text-left">{r.product?.productName || "-"}</td>
                      <td>{r.supplier?.bussinessName || "-"}</td>
                      <td>{r.returnQty}</td>
                      <td className="font-medium text-right">{IDR(r.returnAmount)}</td>
                      <td className="text-xs">{REASON_LABELS[r.reason] || r.reason}</td>
                      <td className="text-xs">{r.createdBy?.name || "-"}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status]}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-center gap-1">
                          {/* Detail */}
                          <button
                            title="Lihat Detail"
                            className="text-blue-600 hover:text-blue-800 p-1"
                            onClick={() => { setSelectedReturn(r); detailRef.current?.showModal() }}
                          >
                            <HugeiconsIcon icon={InformationCircleIcon} size={18} color="currentColor" />
                          </button>

                          {/* Approve / Reject — only for draft */}
                          {r.status === "draft" && (
                            <>
                              <button
                                title="Approve"
                                disabled={processing === r._id}
                                className="text-green-600 hover:text-green-800 p-1 disabled:opacity-40"
                                onClick={() => handleApprove(r)}
                              >
                                {processing === r._id
                                  ? <span className="loading loading-spinner loading-xs" />
                                  : <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="currentColor" />
                                }
                              </button>
                              <button
                                title="Reject"
                                disabled={processing === r._id}
                                className="text-red-500 hover:text-red-700 p-1 disabled:opacity-40"
                                onClick={() => handleReject(r)}
                              >
                                <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Detail ─────────────────────────────────────────────────────── */}
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
                <h3 className="text-lg font-semibold text-blue-900">{selectedReturn.returnNumber}</h3>
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
                <div><p className="text-gray-400 text-xs">Dibuat oleh</p><p>{selectedReturn.createdBy?.name || "-"}</p></div>
                <div><p className="text-gray-400 text-xs">Tanggal Dibuat</p><p>{new Date(selectedReturn.created_at).toLocaleDateString("id-ID")}</p></div>
              </div>

              {selectedReturn.status === "approved" && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                    <HugeiconsIcon icon={CheckmarkSquareIcon} size={18} color="currentColor" />
                    Return Disetujui
                  </div>
                  <div className="text-xs text-green-600 flex flex-col gap-1">
                    <span>✓ Stok batch sudah dikurangi sebanyak {selectedReturn.returnQty} unit</span>
                    <span>✓ Stock value produk sudah disesuaikan</span>
                  </div>
                  {selectedReturn.approvedBy && (
                    <p className="text-xs text-gray-500">
                      Diapprove oleh: <strong>{(selectedReturn.approvedBy as any).name}</strong>
                      {selectedReturn.approvedAt && ` — ${new Date(selectedReturn.approvedAt).toLocaleDateString("id-ID")}`}
                    </p>
                  )}
                </div>
              )}

              {selectedReturn.status === "rejected" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-start gap-2">
                  <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" />
                  Return ini telah ditolak dan tidak diproses.
                </div>
              )}

              {selectedReturn.status === "draft" && (
                <div className="flex gap-2 mt-2">
                  <button
                    className="flex-1 btn bg-blue-900 text-white hover:bg-blue-800 gap-2"
                    onClick={() => { detailRef.current?.close(); handleApprove(selectedReturn) }}
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="currentColor" />
                    Approve
                  </button>
                  <button
                    className="flex-1 btn bg-red-600 text-white hover:bg-red-700 gap-2"
                    onClick={() => { detailRef.current?.close(); handleReject(selectedReturn) }}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" />
                    Reject
                  </button>
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
