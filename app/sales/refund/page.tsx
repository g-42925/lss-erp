"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import { useEffect, useState } from 'react'

interface RefundEntry {
  _id: string
  createdAt: string
  salesOrderNumber: string
  salesOrderId?: { salesOrderNumber: string }
  productId?: { productName: string }
  warehouseId?: { name: string; locationId?: { name: string } }
  qty: number
  storedBackQty?: number
  exitedQty?: number
  refundAmount: number
  status: 'refunded' | 'stored_back' | 'resolved'
  storedBackAt?: string
}

export default function RefundLog() {
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const userId = useAuth((s) => s.id)
  const userName = useAuth((s) => s.name)


  const [refunds, setRefunds] = useState<RefundEntry[]>([])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRefund, setSelectedRefund] = useState<RefundEntry | null>(null)
  const [processQty, setProcessQty] = useState<number>(0)
  const [actionMode, setActionMode] = useState<'store_back' | 'exit'>('store_back')
  const [exitReason, setExitReason] = useState<string>('EXPIRED')
  const [exitNote, setExitNote] = useState<string>('')
  const [approvalCode, setApprovalCode] = useState<string>('')

  const getRefundsFn = useFetch<RefundEntry[], unknown>({
    url: `/api/web/refund?id=xxx`,
    method: 'GET',
    onError: (m) => alert(m)
  })

  const putRefundFn = useFetch<RefundEntry, unknown>({
    url: `/api/web/refund`,
    method: 'PUT',
    onError: (m) => alert(m)
  })

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      const url = `/api/web/refund?id=${masterAccountId}`
      getRefundsFn.fn(url, JSON.stringify({}), (res) => {
        setRefunds(res)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, masterAccountId])

  function openModalForStore(refund: RefundEntry) {
    const remaining = refund.qty - (refund.storedBackQty || 0) - (refund.exitedQty || 0)
    setSelectedRefund(refund)
    setProcessQty(remaining)
    setActionMode('store_back')
    setModalOpen(true)
  }

  function openModalForExit(refund: RefundEntry) {
    const remaining = refund.qty - (refund.storedBackQty || 0) - (refund.exitedQty || 0)
    setSelectedRefund(refund)
    setProcessQty(remaining)
    setActionMode('exit')
    setExitReason('EXPIRED')
    setExitNote('')
    setApprovalCode('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedRefund(null)
    setProcessQty(0)
  }

  function handleProcess() {
    if (!selectedRefund) return
    const remaining = selectedRefund.qty - (selectedRefund.storedBackQty || 0) - (selectedRefund.exitedQty || 0)

    if (processQty <= 0 || processQty > remaining) {
      alert(`Please enter a quantity between 1 and ${remaining}`)
      return
    }

    if (actionMode === 'exit' && !approvalCode) {
      alert("Kode approval harus diisi")
      return
    }

    const body: Record<string, unknown> = {
      id: selectedRefund._id,
      qty: processQty,
      action: actionMode
    }
    if (actionMode === 'exit') {
      body.reason = exitReason
      body.note = exitNote
      body.approvalCode = approvalCode
      body.userId = userId
      body.userName = userName
    }

    putRefundFn.fn('', JSON.stringify(body), (res) => {
      alert(res ? `Success: ${res.qty - (res.storedBackQty || 0) - (res.exitedQty || 0)} remaining` : "Processed successfully")
      setRefunds(prev =>
        prev.map(r => {
          if (r._id === selectedRefund._id) {
            const newStored = (r.storedBackQty || 0) + (actionMode === 'store_back' ? processQty : 0)
            const newExited = (r.exitedQty || 0) + (actionMode === 'exit' ? processQty : 0)
            return {
              ...r,
              storedBackQty: newStored,
              exitedQty: newExited,
              status: newStored + newExited >= r.qty ? 'resolved' : 'refunded',
              storedBackAt: actionMode === 'store_back' ? new Date().toISOString() : r.storedBackAt
            }
          }
          return r
        })
      )
      closeModal()
    })
  }

  function statusBadge(entry: RefundEntry) {
    if (entry.status === 'stored_back' || entry.status === 'resolved') return <span className="badge badge-success text-white">Resolved</span>
    const processed = (entry.storedBackQty || 0) + (entry.exitedQty || 0)
    if (processed > 0) return <span className="badge badge-info text-white">Partial ({processed}/{entry.qty})</span>
    return <span className="badge badge-warning">Refunded</span>
  }

  return (
    <div className="h-full p-6 flex flex-col gap-3 text-black">
      <div className="flex justify-between items-center">
        <span className="text-2xl font-semibold">Refund Log</span>
      </div>

      <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
        {getRefundsFn.loading ? (
          <div className="flex-1 flex flex-col justify-center items-center">
            <span className="loading loading-spinner loading-xl"></span>
          </div>
        ) : getRefundsFn.error || getRefundsFn.noResult || refunds.length === 0 ? (
          <div>
            <p>{getRefundsFn.message || "No refund logs found."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra text-center w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order Number</th>
                  <th>Product</th>
                  <th>Warehouse</th>
                  <th>Refunded Qty</th>
                  <th>Stored Back</th>
                  <th>Exited</th>
                  <th>Remaining</th>
                  <th>Refund Amount</th>
                  <th>Status</th>
                  <th>Last Stored At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((x, index) => {
                  const storedBack = x.storedBackQty || 0
                  const exited = x.exitedQty || 0
                  const remaining = x.qty - storedBack - exited
                  return (
                    <tr key={index}>
                      <td>{new Date(x.createdAt).toLocaleString("id-ID")}</td>
                      <td>{x.salesOrderNumber || x.salesOrderId?.salesOrderNumber || '-'}</td>
                      <td>{x.productId?.productName || '-'}</td>
                      <td>{x.warehouseId?.name || x.warehouseId?.locationId?.name || '-'}</td>
                      <td>{x.qty}</td>
                      <td>{storedBack}</td>
                      <td>{exited}</td>
                      <td>
                        <span className={remaining > 0 ? 'font-semibold text-orange-600' : 'text-gray-400'}>
                          {remaining}
                        </span>
                      </td>
                      <td>{x.refundAmount?.toLocaleString('id-ID')}</td>
                      <td>{statusBadge(x)}</td>
                      <td>{x.storedBackAt ? new Date(x.storedBackAt).toLocaleString("id-ID") : '-'}</td>
                      <td>
                        {x.status !== 'stored_back' && x.status !== 'resolved' && (
                          <div className="flex gap-2 justify-center">
                            <div className="tooltip tooltip-left" data-tip={x.warehouseId ? "" : "No warehouse associated. Cannot store back."}>
                              <button
                                className="btn btn-sm btn-primary text-white"
                                onClick={() => openModalForStore(x)}
                                disabled={putRefundFn.loading || !x.warehouseId}
                              >
                                Store Back
                              </button>
                            </div>
                            <button
                              className="btn btn-sm btn-warning text-white"
                              onClick={() => openModalForExit(x)}
                              disabled={putRefundFn.loading || !x.warehouseId}
                            >
                              Exit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Processing Modal */}
      {modalOpen && selectedRefund && (() => {
        const remaining = selectedRefund.qty - (selectedRefund.storedBackQty || 0) - (selectedRefund.exitedQty || 0)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col gap-5">
              <h2 className="text-xl font-bold text-blue-900">
                {actionMode === 'store_back' ? 'Store Back to Warehouse' : 'Exit Item from Refund'}
              </h2>

              <div className="text-sm text-gray-600 flex flex-col gap-1">
                <p><span className="font-medium">Product:</span> {selectedRefund.productId?.productName || '-'}</p>
                <p><span className="font-medium">Order:</span> {selectedRefund.salesOrderNumber}</p>
                <p><span className="font-medium">Total Refunded:</span> {selectedRefund.qty}</p>
                <p><span className="font-medium">Processed (Stored + Exited):</span> {(selectedRefund.storedBackQty || 0) + (selectedRefund.exitedQty || 0)}</p>
                <p className="text-orange-600 font-semibold">Remaining: {remaining}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Quantity to {actionMode === 'store_back' ? 'Store Back' : 'Exit'}</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  min={1}
                  max={remaining}
                  value={processQty}
                  onChange={e => setProcessQty(Number(e.target.value))}
                />
                <p className="text-xs text-gray-400">Max: {remaining}</p>
              </div>

              {actionMode === 'exit' && (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Reason</label>
                    <select
                      className="select select-bordered w-full"
                      value={exitReason}
                      onChange={e => setExitReason(e.target.value)}
                    >
                      <option value="EXPIRED">Expired</option>
                      <option value="BROKEN">Broken</option>
                      <option value="LOST">Lost</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Note</label>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={exitNote}
                      onChange={e => setExitNote(e.target.value)}
                      placeholder="Optional note..."
                    />
                  </div>
                  <div className="flex flex-col gap-2 border-t pt-2 mt-2">
                    <label className="text-sm font-medium text-gray-700 text-red-600">Approval Code (Required)</label>
                    <input
                      type="password"
                      className="input input-bordered w-full border-red-300 focus:border-red-500"
                      value={approvalCode}
                      onChange={e => setApprovalCode(e.target.value)}
                      placeholder="Enter Admin/Manager Code"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 justify-end mt-2">
                <button className="btn btn-ghost" onClick={closeModal} disabled={putRefundFn.loading}>
                  Cancel
                </button>
                <button
                  className={actionMode === 'store_back' ? "btn btn-primary text-white" : "btn btn-warning text-white"}
                  onClick={handleProcess}
                  disabled={putRefundFn.loading || processQty <= 0 || processQty > remaining}
                >
                  {putRefundFn.loading ? <span className="loading loading-spinner loading-sm"></span> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
