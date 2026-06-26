"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'

export default function Delivery() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editModalRef = useRef<HTMLDialogElement>(null)
  const printSectionRef = useRef<HTMLDivElement>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [deliveryPayload, setDeliveryPayload] = useState<{ [key: string]: { qty: number, batchDetail: string } }>({})
  const [editingItem, setEditingItem] = useState<any>(null)
  const [search, setSearch] = useState('')

  // Date filter state — default to today
  const todayStr = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo, setDateTo] = useState(todayStr)

  const newPrForm = useForm()
  const router = useRouter()

  const addFn = useFetch<any, any>({
    url: '/api/web/delivery',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/delivery',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const getDeliveries = useFetch<any, any>({
    url: `/api/web/delivery?id=xxx`,
    method: 'GET'
  })

  const getOrderDetailsFn = useFetch<any, any>({
    url: `/api/web/delivery?id=xxx`,
    method: 'GET'
  })

  function fetchDeliveries(from?: string, to?: string) {
    const f = from ?? dateFrom
    const t = to ?? dateTo
    const url = `/api/web/delivery?id=${masterAccountId}&f=all&from=${f}&to=${t}`
    getDeliveries.fn(url, JSON.stringify({}), (result) => {
      setDeliveries(result)
    })
  }

  async function submit(data: any) {
    const items = Object.entries(deliveryPayload)
      .filter(([_, val]) => val.qty > 0 && val.batchDetail)
      .map(([productId, val]) => {
        const [locId, batchNumber] = val.batchDetail.split('/')
        return {
          productId,
          qty: val.qty,
          batchNumber,
          locationId: locId
        }
      })

    if (items.length === 0) {
      alert('Please select at least one item with a valid batch and quantity')
      return
    }

    const params = {
      id: masterAccountId,
      salesOrderNumber: data.salesOrderNumber,
      items: items,
      createdBy: userId
    }

    await addFn.fn('', JSON.stringify(params), () => {
      newPrForm.reset({ salesOrderNumber: '' })
      setOrderItems([])
      setDeliveryPayload({})
      fetchDeliveries()
      modalRef.current?.close()
    })
  }

  const getOrderDetails = useCallback((salesOrderNumber: string) => {
    if (!salesOrderNumber || salesOrderNumber.length < 3) return

    const url = `/api/web/delivery?so=${salesOrderNumber}&f=x`

    getOrderDetailsFn.fn(url, JSON.stringify({}), result => {
      setOrderItems(result)
      const initialPayload: any = {}
      result.forEach((item: any) => {
        initialPayload[item.product._id] = { qty: 0, batchDetail: '' }
      })
      setDeliveryPayload(initialPayload)
    })
  }, [masterAccountId, getOrderDetailsFn])

  const handleItemChange = useCallback((productId: string, field: 'qty' | 'batchDetail', value: any) => {
    setDeliveryPayload(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: field === 'qty' ? parseInt(value) || 0 : value
      }
    }))
  }, [])

  function edit(item: any) {
    let currentAdj = 0;
    if (item.orderAdjustment && Array.isArray(item.orderAdjustment)) {
      const match = item.orderAdjustment.find((a: any) => a.productId === item.product._id && a.deliveryNumber === item.deliveryNumber);
      if (match) currentAdj = match.qty;
    }

    setEditingItem({
      _id: item._id,
      productId: item.product._id,
      batchNumber: item.batchNumber,
      deliveryNumber: item.deliveryNumber,
      qty: item.qty,
      adjustment: currentAdj,
      productName: item.product.productName,
      approvalCode: ''
    });
    editModalRef.current?.showModal();
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    const params = {
      _id: editingItem._id,
      productId: editingItem.productId,
      batchNumber: editingItem.batchNumber,
      newQty: Number(editingItem.qty),
      adjustment: Number(editingItem.adjustment),
      approvalCode: editingItem.approvalCode,
      userId
    };

    await editFn.fn('', JSON.stringify(params), () => {
      fetchDeliveries()
      editModalRef.current?.close();
    });
  }

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      fetchDeliveries(todayStr, todayStr)
    }
  }, [masterAccountId, hasHydrated])

  // --- Print handler ---
  function handlePrint() {
    window.print()
  }

  // --- Filtered deliveries for display ---
  const filteredDeliveries = deliveries.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      p.deliveryNumber?.toLowerCase().includes(s) ||
      p.salesOrderNumber?.toLowerCase().includes(s) ||
      p.product?.productName?.toLowerCase().includes(s) ||
      (p.customer?.bussinessName || p.order?.customCustomer?.name || '').toLowerCase().includes(s) ||
      p.createdBy?.toLowerCase().includes(s)
    )
  })

  const printDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const formatDateRange = () => {
    const f = new Date(dateFrom).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    const t = new Date(dateTo).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    return dateFrom === dateTo ? f : `${f} – ${t}`
  }

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')

  return (
    <>
      {/* ====== PRINT STYLES ====== */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-section, #print-section * { visibility: visible !important; }
          #print-section {
            position: fixed;
            inset: 0;
            width: 100%;
            padding: 24px 32px;
            background: white;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ====== SCREEN UI ====== */}
      <div className="h-full p-6 flex flex-col gap-3 text-black no-print">
        <span className="text-2xl font-bold">Warehouse Deliveries</span>
        <div className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-6 gap-6 rounded-lg">

          {/* ---- Header row ---- */}
          <div className="flex flex-row items-center border-b pb-4 gap-2 flex-wrap">
            <span className="text-lg font-semibold">Processed Deliveries</span>
            <button
              disabled
              onClick={() => modalRef.current?.showModal()}
              className="btn btn-primary ml-auto flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Delivery
            </button>
          </div>

          {/* ---- Date filter + Print row ---- */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="input input-bordered input-sm"
              />
            </div>
            <button
              onClick={() => fetchDeliveries()}
              disabled={getDeliveries.loading}
              className="btn btn-neutral btn-sm self-end"
            >
              {getDeliveries.loading
                ? <span className="loading loading-spinner loading-xs"></span>
                : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
                    </svg>
                    Filter
                  </>
                )
              }
            </button>

            {/* Search */}
            <div className="relative ml-auto w-56">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search deliveries..."
                className="input input-bordered input-sm w-full pr-8"
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="btn btn-sm btn-outline flex items-center gap-1 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white self-end"
              title="Print shipping list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
              </svg>
              Print
            </button>
          </div>

          {/* ---- Results count ---- */}
          {!getDeliveries.loading && !getDeliveries.error && (
            <div className="text-sm text-gray-500">
              Showing <span className="font-semibold text-black">{filteredDeliveries.length}</span> delivery record(s)
              {' '}for <span className="font-semibold text-blue-700">{formatDateRange()}</span>
            </div>
          )}

          {/* ---- Table ---- */}
          {
            getDeliveries.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl text-blue-900"></span>
                <span className="mt-4 text-gray-500 font-medium">Loading deliveries...</span>
              </div>
              :
              getDeliveries.error || getDeliveries.noResult
                ?
                <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">{getDeliveries.message || "No deliveries found"}</p>
                </div>
                :
                filteredDeliveries.length === 0
                  ?
                  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10 text-gray-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z" />
                    </svg>
                    <p className="text-gray-500">No deliveries found for the selected date range.</p>
                  </div>
                  :
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full text-center">
                      <thead className="bg-gray-100 uppercase text-xs">
                        <tr>
                          <th>Date</th>
                          <th>Created By</th>
                          <th>Delivery #</th>
                          <th>SO #</th>
                          <th>Location</th>
                          <th>Product</th>
                          <th>Customer</th>
                          <th>Qty</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          filteredDeliveries.map((p, index) => {
                            return (
                              <tr key={index} className="hover">
                                <td className="font-medium text-xs">{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td className="font-medium">{p.createdBy || "-"}</td>
                                <td className="font-bold text-blue-700">{p.deliveryNumber}</td>
                                <td className="font-medium">{p.salesOrderNumber}</td>
                                <td><span className="badge badge-ghost">{p.location?.name}</span></td>
                                <td className="font-semibold">{p.product?.productName}</td>
                                <td>{Object.keys(p.customer || {}).length === 0 ? p.order?.customCustomer?.name : p.customer?.bussinessName}</td>
                                <td><span className="font-bold">{p.qty}</span></td>
                                <td>
                                  <button onClick={() => edit(p)} className="btn btn-sm btn-primary">
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        }
                      </tbody>
                    </table>
                  </div>
          }
        </div>
      </div>

      {/* ====== PRINT SECTION (hidden on screen, visible when printing) ====== */}
      <div id="print-section" ref={printSectionRef} className="hidden print:block">
        {/* Print Header */}
        <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>
                Shipping / Delivery Report
              </h1>
              <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0' }}>
                Date Range: <strong>{formatDateRange()}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#777' }}>
              <p style={{ margin: 0 }}>Printed: {printDate}</p>
              <p style={{ margin: '2px 0 0' }}>Total Records: <strong>{filteredDeliveries.length}</strong></p>
            </div>
          </div>
        </div>

        {/* Print Summary Cards */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px 14px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Deliveries</p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a8a', margin: '2px 0 0' }}>
              {new Set(filteredDeliveries.map(d => d.deliveryNumber)).size}
            </p>
          </div>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px 14px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Items Shipped</p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a8a', margin: '2px 0 0' }}>
              {filteredDeliveries.reduce((sum, d) => sum + (Number(d.qty) || 0), 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px 14px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique Customers</p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e3a8a', margin: '2px 0 0' }}>
              {new Set(filteredDeliveries.map(d =>
                Object.keys(d.customer || {}).length === 0
                  ? d.order?.customCustomer?.name
                  : d.customer?.bussinessName
              ).filter(Boolean)).size}
            </p>
          </div>
        </div>

        {/* Print Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Date &amp; Time</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Delivery #</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>SO #</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Product</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Customer</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Location</th>
              <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>Qty</th>
              <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Created By</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((p, index) => (
              <tr
                key={index}
                style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}
              >
                <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: '#374151' }}>
                  {new Date(p.date).toLocaleString('id-ID')}
                </td>
                <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#1e3a8a' }}>{p.deliveryNumber}</td>
                <td style={{ padding: '6px 8px', color: '#374151' }}>{p.salesOrderNumber}</td>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: '#111827' }}>{p.product?.productName}</td>
                <td style={{ padding: '6px 8px', color: '#374151' }}>
                  {Object.keys(p.customer || {}).length === 0
                    ? p.order?.customCustomer?.name
                    : p.customer?.bussinessName}
                </td>
                <td style={{ padding: '6px 8px', color: '#6b7280' }}>{p.location?.name || '-'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>
                  {Number(p.qty).toLocaleString('id-ID')}
                </td>
                <td style={{ padding: '6px 8px', color: '#374151' }}>{p.createdBy || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #1e3a8a' }}>
              <td colSpan={6} style={{ padding: '7px 8px', fontWeight: 'bold', textAlign: 'right', color: '#1e3a8a' }}>Total Qty Shipped:</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 'bold', color: '#1e3a8a', fontSize: '13px' }}>
                {filteredDeliveries.reduce((sum, d) => sum + (Number(d.qty) || 0), 0).toLocaleString('id-ID')}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {/* Print Footer */}
        <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
          <span>LSS ERP — Warehouse Shipping Report</span>
          <span>Generated: {printDate}</span>
        </div>
      </div>

      {/* ====== MODALS ====== */}
      <dialog ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-5xl">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-bold border-b pb-2">Create New Delivery</h3>
            <form onSubmit={newPrForm.handleSubmit(submit)} className="flex flex-col gap-6">
              <div className="flex flex-row gap-4">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend font-semibold">Sales Order Number</legend>
                  <div className="flex gap-2">
                    <input
                      {...newPrForm.register("salesOrderNumber")}
                      placeholder="Enter SO Number (e.g. SO-001)"
                      className="input input-bordered w-full"
                    />
                    <button
                      type="button"
                      onClick={() => getOrderDetails(newPrForm.getValues("salesOrderNumber"))}
                      className="btn btn-neutral"
                      disabled={getOrderDetailsFn.loading}
                    >
                      {getOrderDetailsFn.loading ? <span className="loading loading-spinner"></span> : "Fetch Details"}
                    </button>
                  </div>
                </fieldset>
              </div>

              {orderItems.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h4 className="font-semibold text-lg">Order Items</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="table w-full">
                      <thead className="bg-gray-50 uppercase text-xs">
                        <tr>
                          <th>Product</th>
                          <th>Ordered</th>
                          <th>Delivered</th>
                          <th>Available Batches</th>
                          <th className="w-32">Qty to Deliver</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <div className="font-bold">{item.product.productName}</div>
                              <div className="text-xs opacity-50">{item.product.productId}</div>
                            </td>
                            <td>{item.orderedQty}</td>
                            <td>{item.deliveredQty}</td>
                            <td>
                              <select
                                className="select select-bordered select-sm w-full"
                                onChange={(e) => handleItemChange(item.product._id, 'batchDetail', e.target.value)}
                                value={deliveryPayload[item.product._id]?.batchDetail || ''}
                              >
                                <option value="">Select Batch/Location</option>
                                {item.batches.map((b: any, bIdx: number) => (
                                  <option key={bIdx} value={`${b.locationId}/${b.batchNumber}/${b.remain}`}>
                                    {b.location.name} - {b.batchNumber} (Stock: {b.remain})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className={`input input-bordered input-sm w-full ${deliveryPayload[item.product._id]?.qty > item.limit ? 'input-error' : ''}`}
                                placeholder="0"
                                max={item.limit}
                                min={0}
                                onChange={(e) => handleItemChange(item.product._id, 'qty', e.target.value)}
                                value={deliveryPayload[item.product._id]?.qty || 0}
                              />
                              {item.limit > 0 && <span className="text-[10px] text-gray-400 mt-1 block">Max: {item.limit}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {addFn.error && <div className="alert alert-error text-sm py-2">Error processing delivery</div>}

              <div className="modal-action">
                <button type="submit" className="btn btn-primary px-8" disabled={addFn.loading}>
                  {addFn.loading ? <span className="loading loading-spinner"></span> : "Save Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      <dialog ref={editModalRef} className="modal text-black">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4">Edit Delivery Item</h3>
          {editingItem && (
            <form onSubmit={submitEdit} className="flex flex-col gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Product</span>
                </label>
                <input type="text" className="input input-bordered w-full" value={editingItem.productName} disabled />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Delivery Qty</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editingItem.qty}
                    onChange={e => setEditingItem({ ...editingItem, qty: e.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Adjustment Qty</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editingItem.adjustment}
                    onChange={e => setEditingItem({ ...editingItem, adjustment: e.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Approval Code</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={editingItem.approvalCode}
                    onChange={e => setEditingItem({ ...editingItem, approvalCode: e.target.value })}
                    required
                  />
                </div>
              </div>

              {editFn.error && <div className="text-red-500 text-sm mt-2">Error updating delivery</div>}

              <div className="modal-action">
                <button type="button" onClick={() => editModalRef.current?.close()} className="btn">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editFn.loading}>
                  {editFn.loading ? <span className="loading loading-spinner"></span> : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>

      <button className="btn btn-circle btn-neutral fixed right-12 bottom-12 shadow-2xl no-print">
        <Link href="/xpurchases">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>
    </>
  )
}