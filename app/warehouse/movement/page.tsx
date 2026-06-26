"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react';
import { DeliveryBox01Icon } from '@hugeicons/core-free-icons';

export default function Delivery() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const userId = useAuth((state) => state.userId)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [deliveryPayload, setDeliveryPayload] = useState<{ [key: string]: { qty: number, batchDetail: string } }>({})
  const [selectedOrder, setSelectedOrder] = useState<any>('')
  const [printOrders, setPrintOrders] = useState<any[]>([])
  const [printLoading, setPrintLoading] = useState(false)

  const getTodayLocal = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const [filterDate, setFilterDate] = useState<string>(getTodayLocal())

  const newPrForm = useForm()
  const router = useRouter()

  const addFn = useFetch<any, any>({
    url: '/api/web/delivery',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const getOrdersFn = useFetch<any, any>({
    url: `/api/web/orders?id=xxx`,
    method: 'GET',
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

    const adjustment = Object.keys(deliveryPayload).map(key => {
      return {
        productId: key,
        qty: deliveryPayload[key].adjustment
      }
    })

    const delivered = items.map((i) => {
      return {
        productId: i.productId,
        qty: i.qty,
        date: new Date()
      }
    })

    const params = {
      id: masterAccountId,
      salesOrderNumber: selectedOrder,
      items: items,
      adjustment: adjustment,
      delivered: delivered,
      createdBy: userId
    }

    console.log(
      JSON.stringify(params)
    )

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

  const handleItemChange = useCallback((productId: string, field: 'qty' | 'batchDetail' | 'adjustment', value: any) => {
    setDeliveryPayload(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: field === 'qty' || field === 'adjustment' ? parseInt(value) || 0 : value
      }
    }))
  }, [])

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      const url = `/api/web/delivery?id=${masterAccountId}&f=all`
      const url4 = `/api/web/order?id=${masterAccountId}&type=good`

      getDeliveries.fn(url, JSON.stringify({}), (result) => {
        setDeliveries(result)
      })

      getOrdersFn.fn(url4, JSON.stringify({}), (result) => {
        console.log({ result })
      })
    }
  }, [masterAccountId, hasHydrated])

  function openDeliveryModal(salesOrderNumber: string) {
    setSelectedOrder(salesOrderNumber)
    modalRef.current?.showModal()
  }

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  //if (!isSuperAdmin) router.push('/dashboard')

  const filteredOrders = getOrdersFn?.result?.filter((x: any) => {
    if (!filterDate) return true;
    const dateToCheck = new Date(x.pickupDate || x.saleDate);
    if (isNaN(dateToCheck.getTime())) return true;
    const dateStr = dateToCheck.getFullYear() + '-' + String(dateToCheck.getMonth() + 1).padStart(2, '0') + '-' + String(dateToCheck.getDate()).padStart(2, '0');
    return dateStr === filterDate;
  }) || [];

  const handlePrint = async () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      window.print();
      return;
    }
    setPrintLoading(true);
    try {
      const ordersWithDetails = await Promise.all(
        filteredOrders.map(async (order: any) => {
          try {
            const res = await fetch(`/api/web/delivery?so=${order.salesOrderNumber}&f=x`).then(r => r.json());
            return { ...order, itemsData: res.result || [] };
          } catch (e) {
            return { ...order, itemsData: [] };
          }
        })
      );
      setPrintOrders(ordersWithDetails);
    } catch (e) {
      console.error(e);
    }
    setPrintLoading(false);
    setTimeout(() => {
      window.print();
    }, 500);
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black print:p-0 print:h-auto print:block">
        <span className="text-2xl font-bold print:hidden">Warehouse Deliveries</span>
        <div className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-6 gap-6 rounded-lg print:border-none print:shadow-none print:p-0 print:gap-2">
          <div className="hidden print:block mb-4">
            <h2 className="text-2xl font-bold text-center">Shipping List</h2>
            <p className="text-center font-semibold text-lg">Date: {filterDate || 'All'}</p>
          </div>
          <div className="flex flex-row items-center border-b pb-4 print:hidden">
            <span className="text-lg font-semibold">Processed Deliveries</span>
            <button disabled onClick={() => modalRef.current?.showModal()} className="btn btn-primary ml-auto flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Delivery
            </button>
          </div>
          <div className="flex flex-row gap-4 items-center print:hidden">
            <div className="flex flex-row gap-2 items-center">
              <span className="text-sm font-semibold text-gray-700">Filter Date:</span>
              <input
                type="date"
                className="input input-bordered input-sm"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setFilterDate('')}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-row gap-2 items-center ml-auto">
              <button className="btn btn-secondary btn-sm" onClick={handlePrint} disabled={printLoading}>
                {printLoading ? <span className="loading loading-spinner loading-xs mr-1"></span> : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0v3.396c0 .616.5 1.125 1.125 1.125h8.25c.625 0 1.125-.509 1.125-1.125v-3.396Z" />
                  </svg>
                )}
                {printLoading ? 'Preparing...' : 'Print'}
              </button>
              <div className="relative w-64 ml-2">
                <input type="search" placeholder="Search deliveries..." className="input input-sm input-bordered w-full pr-8" />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
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
                <div className="overflow-x-auto print:hidden">
                  <table className="table table-zebra w-full text-center">
                    <thead className="bg-gray-100 uppercase text-xs">
                      <tr>
                        <th>Sale date</th>
                        <th>Sales Order Number</th>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Pay term</th>
                        <th>Pickup date</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        filteredOrders.map((x: any, index: number) => {
                          return (
                            <tr key={index}>
                              <td>{new Date(x.saleDate).toLocaleString("id-ID")}</td>
                              <td>{x.salesOrderNumber}</td>
                              <td>{x.variousItem ? 'various item' : (x.product?.productName || '-')}</td>
                              <td>{x.customCustomer ? x.customCustomer.name : (x.customer?.bussinessName || '-')}</td>
                              <td>{x.payTerm ? new Date(x.payTerm).toLocaleString("id-ID") : '-'}</td>
                              <td>{x.pickupDate ? new Date(x.pickupDate).toLocaleString("id-ID") : '-'}</td>
                              <td>
                                <button onClick={() => openDeliveryModal(x.salesOrderNumber)}>
                                  <HugeiconsIcon icon={DeliveryBox01Icon} />
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

          {/* PRINT ONLY LAYOUT */}
          <div className="hidden print:block text-black mt-4">
             {printOrders.map((order, idx) => (
               <div key={idx} className="mb-6 p-4 border border-gray-300 rounded shadow-sm break-inside-avoid bg-white">
                 <div className="flex justify-between border-b pb-2 mb-2 font-semibold">
                   <div>SO: {order.salesOrderNumber}</div>
                   <div>Customer: {order.customCustomer ? order.customCustomer.name : (order.customer?.bussinessName || '-')}</div>
                   <div>Date: {new Date(order.saleDate).toLocaleDateString("id-ID")}</div>
                 </div>
                 <table className="w-full text-sm mt-2 text-left">
                   <thead>
                     <tr className="border-b text-gray-700">
                       <th className="py-1 w-1/2">Product</th>
                       <th className="py-1 text-center">Ordered</th>
                       <th className="py-1 text-center">Shipped</th>
                       <th className="py-1 text-center">To Ship</th>
                     </tr>
                   </thead>
                   <tbody>
                     {order.itemsData?.map((item: any, i: number) => (
                       <tr key={i} className="border-b border-gray-100">
                         <td className="py-2">
                           <div className="font-bold">{item.product?.productName}</div>
                           <div className="text-gray-500 text-xs">{item.product?.productId || ''}</div>
                         </td>
                         <td className="py-2 text-center">{item.orderedQty}</td>
                         <td className="py-2 text-center">{item.deliveredQty}</td>
                         <td className="py-2 text-center font-bold">
                           {item.limit > 0 ? item.limit : 0}
                         </td>
                       </tr>
                     ))}
                     {(!order.itemsData || order.itemsData.length === 0) && (
                       <tr>
                         <td colSpan={4} className="py-3 text-center text-gray-500 italic">No details available</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             ))}
          </div>
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
                      value={selectedOrder}
                      placeholder="Enter SO Number (e.g. SO-001)"
                      className="input input-bordered w-full"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => getOrderDetails(selectedOrder)}
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
                          <th>Adjustment</th>
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
                            <td>
                              <input
                                type="number"
                                className={`input input-bordered input-sm w-full ${deliveryPayload[item.product._id]?.qty > item.limit ? 'input-error' : ''}`}
                                placeholder="0"
                                max={item.limit}
                                min={0}
                                onChange={(e) => handleItemChange(item.product._id, 'adjustment', e.target.value)}
                                value={deliveryPayload[item.product._id]?.adjustment || 0}
                              />
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

      <button className="btn btn-circle btn-neutral fixed right-12 bottom-12 shadow-2xl print:hidden">
        <Link href="/xpurchases">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>
    </>
  )
}