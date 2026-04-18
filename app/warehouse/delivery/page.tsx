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
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [deliveryPayload, setDeliveryPayload] = useState<{ [key: string]: { qty: number, batchDetail: string } }>({})

  const newPrForm = useForm()
  const router = useRouter()

  const addFn = useFetch<any, any>({
    url: '/api/web/delivery',
    method: 'POST',
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
      items: items
    }

    await addFn.fn('', JSON.stringify(params), () => {
      newPrForm.reset({ salesOrderNumber: '' })
      setOrderItems([])
      setDeliveryPayload({})
      // Refresh deliveries
      const url = `/api/web/delivery?id=${masterAccountId}&f=all`
      getDeliveries.fn(url, JSON.stringify({}), (result) => {
        setDeliveries(result)
      })
      modalRef.current?.close()
    })
  }

  const getOrderDetails = useCallback((salesOrderNumber: string) => {
    if (!salesOrderNumber || salesOrderNumber.length < 3) return

    const url = `/api/web/delivery?so=${salesOrderNumber}&f=x`

    getOrderDetailsFn.fn(url, JSON.stringify({}), result => {
      setOrderItems(result)
      // Initialize payload
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

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      const url = `/api/web/delivery?id=${masterAccountId}&f=all`

      getDeliveries.fn(url, JSON.stringify({}), (result) => {
        setDeliveries(result)
      })
    }
  }, [masterAccountId, hasHydrated])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')


  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl font-bold">Warehouse Deliveries</span>
        <div className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-6 gap-6 rounded-lg">
          <div className="flex flex-row items-center border-b pb-4">
            <span className="text-lg font-semibold">Processed Deliveries</span>
            <button onClick={() => modalRef.current?.showModal()} className="btn btn-primary ml-auto flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Delivery
            </button>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <div className="flex flex-row gap-2 items-center">
              <span className="text-sm text-gray-500">Show</span>
              <select className="select select-bordered select-sm w-20">
                <option>20</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
            <div className="relative ml-auto w-64">
              <input type="search" placeholder="Search deliveries..." className="input input-bordered w-full pr-10" />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
          </div>
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
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full text-center">
                    <thead className="bg-gray-100 uppercase text-xs">
                      <tr>
                        <th>Date</th>
                        <th>Delivery #</th>
                        <th>SO #</th>
                        <th>Location</th>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        deliveries.map((p, index) => {
                          return (
                            <tr key={index} className="hover">
                              <td className="font-medium text-xs">{new Date(p.date).toLocaleString('id-ID')}</td>
                              <td className="font-bold text-blue-700">{p.deliveryNumber}</td>
                              <td className="font-medium">{p.salesOrderNumber}</td>
                              <td><span className="badge badge-ghost">{p.location?.name}</span></td>
                              <td className="font-semibold">{p.product?.productName}</td>
                              <td>{Object.keys(p.customer).length === 0 ? p.order?.customerName : p.customer?.bussinessName}</td>
                              <td><span className="font-bold">{p.qty}</span></td>
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

      <button className="btn btn-circle btn-neutral fixed right-12 bottom-12 shadow-2xl">
        <Link href="/xpurchases">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>
    </>
  )
}