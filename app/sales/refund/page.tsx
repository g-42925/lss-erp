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
  refundAmount: number
  status: 'refunded' | 'stored_back'
  storedBackAt?: string
}

export default function RefundLog() {
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [refunds, setRefunds] = useState<RefundEntry[]>([])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRefund, setSelectedRefund] = useState<RefundEntry | null>(null)
  const [storeQty, setStoreQty] = useState<number>(0)

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

  function openModal(refund: RefundEntry) {
    const remaining = refund.qty - (refund.storedBackQty || 0)
    setSelectedRefund(refund)
    setStoreQty(remaining)   // default to full remaining
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedRefund(null)
    setStoreQty(0)
  }

  function handleStoreBack() {
    if (!selectedRefund) return
    const remaining = selectedRefund.qty - (selectedRefund.storedBackQty || 0)

    if (storeQty <= 0 || storeQty > remaining) {
      alert(`Please enter a quantity between 1 and ${remaining}`)
      return
    }

    putRefundFn.fn('', JSON.stringify({ id: selectedRefund._id, qty: storeQty }), (res) => {
      alert(res ? `Success: ${res.qty - (res.storedBackQty || 0)} remaining` : "Stored back successfully")
      setRefunds(prev =>
        prev.map(r => r._id === selectedRefund._id
          ? {
              ...r,
              storedBackQty: (r.storedBackQty || 0) + storeQty,
              status: (r.storedBackQty || 0) + storeQty >= r.qty ? 'stored_back' : 'refunded',
              storedBackAt: new Date().toISOString()
            }
          : r
        )
      )
      closeModal()
    })
  }

  function statusBadge(entry: RefundEntry) {
    if (entry.status === 'stored_back') return <span className="badge badge-success text-white">Stored Back</span>
    const storedBack = entry.storedBackQty || 0
    if (storedBack > 0) return <span className="badge badge-info text-white">Partial ({storedBack}/{entry.qty})</span>
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
                  const remaining = x.qty - storedBack
                  return (
                    <tr key={index}>
                      <td>{new Date(x.createdAt).toLocaleString("id-ID")}</td>
                      <td>{x.salesOrderNumber || x.salesOrderId?.salesOrderNumber || '-'}</td>
                      <td>{x.productId?.productName || '-'}</td>
                      <td>{x.warehouseId?.name || x.warehouseId?.locationId?.name || '-'}</td>
                      <td>{x.qty}</td>
                      <td>{storedBack}</td>
                      <td>
                        <span className={remaining > 0 ? 'font-semibold text-orange-600' : 'text-gray-400'}>
                          {remaining}
                        </span>
                      </td>
                      <td>{x.refundAmount?.toLocaleString('id-ID')}</td>
                      <td>{statusBadge(x)}</td>
                      <td>{x.storedBackAt ? new Date(x.storedBackAt).toLocaleString("id-ID") : '-'}</td>
                      <td>
                        {x.status !== 'stored_back' && (
                          <div className="tooltip tooltip-left" data-tip={x.warehouseId ? "" : "No warehouse associated. Cannot store back."}>
                            <button
                              className="btn btn-sm btn-primary text-white"
                              onClick={() => openModal(x)}
                              disabled={putRefundFn.loading || !x.warehouseId}
                            >
                              Store Back
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

      {/* Store Back Modal */}
      {modalOpen && selectedRefund && (() => {
        const remaining = selectedRefund.qty - (selectedRefund.storedBackQty || 0)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col gap-5">
              <h2 className="text-xl font-bold text-blue-900">Store Back to Warehouse</h2>

              <div className="text-sm text-gray-600 flex flex-col gap-1">
                <p><span className="font-medium">Product:</span> {selectedRefund.productId?.productName || '-'}</p>
                <p><span className="font-medium">Order:</span> {selectedRefund.salesOrderNumber}</p>
                <p><span className="font-medium">Total Refunded:</span> {selectedRefund.qty}</p>
                <p><span className="font-medium">Already Stored:</span> {selectedRefund.storedBackQty || 0}</p>
                <p className="text-orange-600 font-semibold">Remaining: {remaining}</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Quantity to Store Back</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  min={1}
                  max={remaining}
                  value={storeQty}
                  onChange={e => setStoreQty(Number(e.target.value))}
                />
                <p className="text-xs text-gray-400">Max: {remaining}</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button className="btn btn-ghost" onClick={closeModal} disabled={putRefundFn.loading}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary text-white"
                  onClick={handleStoreBack}
                  disabled={putRefundFn.loading || storeQty <= 0 || storeQty > remaining}
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
