"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";

import { useRef, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";

export default function Receiving() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const locationId = useAuth((state) => state.locationId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [disabled, setDisabled] = useState<boolean>(false)
  const [expiredFieldHide, setExpiredFieldHide] = useState<boolean>(false)
  const [purchaseType, setPurchaseType] = useState<string>("product")

  const editRef = useRef<HTMLDialogElement>(null)

  const editPrForm = useForm()

  const router = useRouter()

  const fetchWarehousesFn = useFetch<any[], any>({
    url: `/api/web/warehouse?id=xxx`,
    method: 'GET'
  })

  const getFn = useFetch<any[], any>({
    url: `/api/web/purchases?id=xxx`,
    method: 'GET'
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/purchases`,
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  function search(v: string) {
    if (v.length > 0) {
      const result = purchases.filter((r) => {
        return r.purchaseOrderNumber === v
      })

      if (result.length > 0) {
        setSearchResult(
          [
            ...result
          ]
        )
      }
      else {
        setSearchResult(
          []
        )
      }
    }
    else {
      setSearchResult(
        []
      )
    }
  }


  async function editSubmit(data: any) {
    const { max, product, estimatedPrice, supplier, finalPrice, locationId, ...rest } = data
    const qty = parseInt(data.receivedQty)

    if (!qty || qty <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    if (qty > max) {
      alert(`Quantity cannot exceed remaining: ${max}`)
      return
    }

    const additional = {
      isOpening: false,
      createdAt: new Date().toISOString().slice(0, 10),
      outQty: 0,
    }

    const batch = JSON.stringify({
      ...rest,
      ...additional,
      qty,
      ...(locationId ? { locationId } : {})
    })

    await editFn.fn('', batch, () => {
      // Update the local row's receivedQty so the table reflects the new total
      setPurchases(prev =>
        prev.map(p =>
          p._id === data._id
            ? { ...p, receivedQty: (p.receivedQty || 0) + qty }
            : p
        )
      )
      editRef.current?.close()
    })
  }

  async function edit(_id: string) {
    const [filter] = purchases.filter((p) => p._id == _id)

    if (purchaseType === 'product' && filter.product && !filter.product.haveExpiredDate) {
      setExpiredFieldHide(true)
    } else {
      setExpiredFieldHide(false)
    }

    const remaining = filter.quantity - (filter.receivedQty || 0)

    editPrForm.reset({
      ...filter,
      productId: filter.product?._id,
      product: filter.product?.productName || filter.product?.name || '',
      supplier: filter.supplier?.bussinessName ?? '-',
      status: filter.status,
      receivedQty: '',
      max: remaining,
      purchaseOrderNumber: filter.purchaseOrderNumber,
      locationId: locationId
    })

    if (filter.status != 'ordered') {
      setDisabled(true)
    }

    editRef.current?.showModal()
  }


  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/purchases?id=${masterAccountId}&type=${purchaseType}`
      const url3 = `/api/web/warehouse?id=${masterAccountId}&lId=${locationId}`

      const body = JSON.stringify({})

      fetchWarehousesFn.fn(url3, body, (result) => {
        setWarehouses(result)
      })

      getFn.fn(url, JSON.stringify({}), (result) => {
        console.log(result)
        setPurchases(result)
      })
    }
  }, [masterAccountId, locationId, purchaseType])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Receiving</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row flex-wrap gap-4 items-center">
            <div className="tabs tabs-boxed bg-gray-100">
              <a className={`tab ${purchaseType === 'product' ? 'tab-active bg-blue-900 text-white' : ''}`} onClick={() => setPurchaseType('product')}>Products</a>
              <a className={`tab ${purchaseType === 'procurement' ? 'tab-active bg-blue-900 text-white' : ''}`} onClick={() => setPurchaseType('procurement')}>Procurement</a>
            </div>
            <div className="flex flex-row gap-2 items-center">
              Show
              <select className="select w-16">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <div className="ml-auto flex flex-row gap-3">
              <input defaultValue={new Date().toISOString().split("T")[0]} onChange={() => alert('ok')} type="date" className="border-1 border-black rounded-md p-3" />
              <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="border-1 border-black rounded-md p-3" />
            </div>
          </div>
          {
            getFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getFn.error || getFn.noResult
                ?
                <div>
                  <p>{getFn.message}</p>
                </div>
                :
                <div>
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Purchase Date</th>
                        <th>Purchase Order Number</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Received</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          purchases.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.purchaseOrderNumber}</td>
                                <td>{p.product?.productName || p.product?.name || '-'}</td>
                                <td>{p.quantity} ({p.product?.purchaseUnit || p.product?.unit || '-'})</td>
                                <td>
                                  <Link href={{ pathname: '/warehouse/rlog', query: { so: p.purchaseOrderNumber } }}>
                                    {p.receivedQty}
                                  </Link>
                                </td>
                                <td>
                                  <button onClick={() => edit(p._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.purchaseOrderNumber}</td>
                                <td>{p.product?.productName || p.product?.name || '-'}</td>
                                <td>{p.quantity} ({p.product?.purchaseUnit || p.product?.unit || '-'})</td>
                                <td>
                                  <Link href={{ pathname: '/warehouse/rlog', query: { so: p.purchaseOrderNumber } }}>
                                    {p.receivedQty}
                                  </Link>
                                </td>
                                <td>
                                  <button onClick={() => edit(p._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
                                    </svg>
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
      <dialog id="my_modal_2" ref={editRef} className="modal text-black">
        <div className="modal-box">
          <div className="flex flex-col gap-4">
            <span className="text-2xl font-semibold">Receive Items</span>
            <form onSubmit={editPrForm.handleSubmit(editSubmit)} className="flex flex-col gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Supplier</legend>
                <input className="input w-full" {...editPrForm.register("supplier")} type="text" readOnly />
              </fieldset>
              <div className="flex flex-row gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Remaining (max)</legend>
                  <input className="input w-full bg-gray-100" {...editPrForm.register("max")} type="text" readOnly />
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Qty to Receive</legend>
                  <input
                    className="input w-full"
                    {...editPrForm.register("receivedQty", { required: true, min: 1 })}
                    type="number"
                    min={1}
                    placeholder="e.g. 5"
                  />
                </fieldset>
              </div>
              {
                (purchaseType === 'product' && !expiredFieldHide)
                  ?
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Expiry date</legend>
                    <input className="input w-full" {...editPrForm.register("expiryDate")} type="date" />
                  </fieldset>
                  :
                  <></>
              }
              {purchaseType === 'product' && (
                <>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Batch number</legend>
                    <input className="input w-full bg-gray-100" {...editPrForm.register("batchNumber")} type="text" readOnly />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Warehouse</legend>
                    <select {...editPrForm.register("warehouseId", { required: true })} className="select w-full">
                      <option value="">Select Warehouse</option>
                      {
                        warehouses.map((warehouse) => (
                          <option value={warehouse._id} key={warehouse._id}>{warehouse.name}</option>
                        ))
                      }
                    </select>
                  </fieldset>
                </>
              )}
              <input type="hidden" {...editPrForm.register("locationId")} />
              {editFn.error ? <p className="text-red-600 text-sm">{editFn.message}</p> : <></>}
              <div className="flex flex-row gap-2 justify-end mt-2">
                <button
                  type="button"
                  className="p-3 rounded-md text-gray-700 bg-gray-200"
                  onClick={() => editRef.current?.close()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editFn.loading}
                  className="p-3 rounded-md text-white bg-blue-900 disabled:opacity-60"
                >
                  {editFn.loading ? 'Saving…' : 'Confirm Receive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

type Failed = {
  message: string
}