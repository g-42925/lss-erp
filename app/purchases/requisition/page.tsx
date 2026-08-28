/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import withAuth from "@/hofs/withAuth";

import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { HugeiconsIcon } from '@hugeicons/react';
import { CoinsDollarIcon, Edit03Icon } from '@hugeicons/core-free-icons';

function Requisition() {
  const user = useAuth((state) => state.userId)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const orderRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const _editRef = useRef<HTMLDialogElement>(null)

  const [roles, setRoles] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pr, setPr] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [disabled, setDisabled] = useState<boolean>(false)

  const bankAccount = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const editForm = useForm()
  const orderForm = useForm()
  const newPrForm = useForm()
  const editPrForm = useForm()

  const watchPayAmount = orderForm.watch("payAmount")

  const addFn = useFetch<any, any>({
    url: '/api/web/purchases',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/purchases`,
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const getFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const getProductsFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const getSuppliersFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const deleteFn = useFetch<any[], any>({
    url: '',
    method: 'DELETE',
    onError: (m) => {
      alert(m)
    }
  })

  async function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      status: 'requested',
      id: masterAccountId,
      date: new Date(),
      purchaseType: 'product',
      createdBy: user
    })

    addFn.fn('', body, () => {
      window.location.href = '/purchases/requisition'
    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const result = roles.filter((r) => {
        return r.name.includes(v)
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

  async function _editSubmit(data: any) {
    const edited = JSON.stringify({
      ...data,
      action: 'edit_pr',
      status: 'requested'
    })

    await editFn.fn('', edited, () => {
      window.location.reload()
    })
  }

  async function orderSubmit(data: any) {
    const finalPrice = parseFloat(data.finalPrice) || 0;
    const estimatedPrice = parseFloat(data.estimatedPrice) || 0;
    const payAmount = parseFloat(data.payAmount) || 0;
    const shippingCost = parseFloat(data.shippingCost) || 0;
    const taxAmount = parseFloat(data.taxAmount) || 0;
    const totalLandedCost = finalPrice + shippingCost + taxAmount;

    if (finalPrice <= 0) {
      alert("Final price harus lebih dari 0");
      return;
    }
    if (finalPrice > estimatedPrice * 1.5) {
      if (!confirm(`Final price (${finalPrice.toLocaleString()}) jauh melebihi estimasi (${estimatedPrice.toLocaleString()}). Lanjutkan?`)) return;
    }
    if (payAmount > totalLandedCost) {
      alert(`Pay amount (${payAmount.toLocaleString()}) tidak boleh melebihi total landed cost (${totalLandedCost.toLocaleString()})`);
      return;
    }

    const pOrdered = JSON.stringify({
      ...data,
      finalPrice,
      shippingCost,
      taxAmount,
      payAmount,
      action: 'convert_to_po',
      purchaseType: 'product',
      userId: user
    })
    await editFn.fn('', pOrdered, () => {
      window.location.reload()
    })
  }

  async function order(_id: string) {
    const [filter] = pr.filter((p) => p._id == _id)

    orderForm.reset({
      _id: filter._id,
      quantity: filter.quantity,
      estimatedPrice: filter.estimatedPrice,
      product: filter.product?.productName,
      productId: filter.product?._id,
      supplierId: suppliers[0]?._id ?? '',
      finalPrice: '',
      shippingCost: 0,
      taxAmount: 0,
      payAmount: 0,
      paymentMethod: 'Cash',
    })

    orderRef.current?.showModal()
  }



  async function del(_id: string) {
    const url = `/api/web/roles?id=${_id}`
    const body = JSON.stringify({})

    await deleteFn.fn(url, body, (result) => {
      setRoles(
        roles.filter((r) => r._id != result)
      )
    })
  }

  async function _edit(_id: string) {
    const [filter] = pr.filter((p) => p._id == _id)

    editForm.reset({
      _id: filter._id,
      quantity: filter.quantity,
      estimatedPrice: filter.estimatedPrice,
      productId: filter.product._id
    })

    _editRef.current?.showModal()
  }




  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/purchases?id=${masterAccountId}&f=requested&type=product`
      const url1 = `/api/web/bank-accounts?id=${masterAccountId}`
      const url2 = `/api/web/products?id=${masterAccountId}&type=good`
      const url3 = `/api/web/suppliers?id=${masterAccountId}`

      const body = JSON.stringify({})

      bankAccount.fn(url1, body, () => { })
      getProductsFn.fn(url2, body, (result) => {
        setProducts(result)
      })

      getSuppliersFn.fn(url3, body, (result) => {
        setSuppliers(result)
      })
      getFn.fn(url, body, (result) => {
        setPr(result)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterAccountId, hasHydrated])


  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl text-black">Purchases</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          <div className="flex flex-row gap-3 items-center">
            <span className="self-center">Manage purchase status</span>
            <button onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
            <div className="flex flex-row">
              <input onKeyUp={(e) => search((e.target as HTMLInputElement).value)} type="search" placeholder="Search" className="toolbar-search" />
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
                  <div className="overflow-x-auto w-full">
                    <table className="table text-center">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>P.O Number</th>
                          <th>Created By</th>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Final Price</th>
                          <th>Pay Amount</th>
                          <th>Status</th>
                          <th>Supplier</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          searchResult.length < 1
                            ?
                            pr.map((p, index) => {
                              return (
                                <tr key={index}>
                                  <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                  <td>{p.purchaseOrderNumber}</td>
                                  <td>{p?.createdBy?.name}</td>
                                  <td>{p?.product?.productName}</td>
                                  <td>{p.quantity} ({p?.product?.conversionRatioX})</td>
                                  {
                                    p.status === "ordered" || p.status === "completed" ? <td>{p.finalPrice}</td> : <td>-</td>
                                  }
                                  {
                                    p.status === "ordered" || p.status === "completed" ? <td>{p.payAmount}</td> : <td>-</td>
                                  }
                                  <td>{p.status}</td>
                                  {
                                    p.status === "ordered" || p.status === "completed" ? <td>{p?.supplier?.bussinessName || p?.customSupplier || '-'}</td> : <td>-</td>
                                  }
                                  <td>
                                    {
                                      p.status === "requested" && (
                                        <button className="text-blue-600" onClick={() => _edit(p._id)} title="Edit">
                                          <HugeiconsIcon icon={Edit03Icon} size={24} color="currentColor" />
                                        </button>
                                      )
                                    }
                                    {
                                      p.status === "approved" && (
                                        <button className="text-green-700" onClick={() => order(p._id)} title="Create Purchase Order">
                                          <HugeiconsIcon icon={CoinsDollarIcon} size={24} color="currentColor" />
                                        </button>
                                      )
                                    }
                                  </td>
                                </tr>
                              )
                            })
                            :
                            searchResult.map((role, index) => {
                              return (
                                <tr key={index}>
                                  <td>{role.name}</td>
                                  <td className="flex flex-row gap-3">
                                    <button className="btn" onClick={() => _edit(role._id)}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                      </svg>
                                      Edit
                                    </button>
                                    <button className="btn" onClick={() => del(role._id)}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                      </svg>
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
          }
        </div>
      </div>
      <dialog id="my_modal_0" ref={_editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">Edit Purchase Requisition</span>
            <form onSubmit={editForm.handleSubmit(_editSubmit)} className="h-92 relative flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Select product</legend>
                  <select {...editForm.register("productId")} className="input w-full">
                    {
                      products.map((p) => {
                        return (
                          <option key={p._id} value={p._id}>{p.productName} ({p.conversionRatioX})</option>
                        )
                      })
                    }
                  </select>
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Estimated price</legend>
                  <input {...editForm.register("estimatedPrice")} className="input w-full" />
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input {...editForm.register("quantity")} className="input w-full" />
                </fieldset>
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
              <button type="submit" className="mt-auto ml-auto p-3 rounded-md text-white bg-blue-900">
                Add
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">Add Purchase Requisition</span>
            <form onSubmit={newPrForm.handleSubmit(submit)} className="h-92 relative flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Select product</legend>
                  <select {...newPrForm.register("productId")} className="input w-full">
                    {
                      products.map((p) => {
                        return (
                          <option key={p._id} value={p._id}>{p.productName} ({p.conversionRatioX})</option>
                        )
                      })
                    }
                  </select>
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Estimated price</legend>
                  <input {...newPrForm.register("estimatedPrice")} className="input w-full" />
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input {...newPrForm.register("quantity")} className="input w-full" />
                </fieldset>
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
              <button type="submit" className="mt-auto ml-auto p-3 rounded-md text-white bg-blue-900">
                Add
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_2" ref={orderRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">Create Purchase Order</span>
            <form onSubmit={orderForm.handleSubmit(orderSubmit)} className="flex flex-col gap-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">Product</legend>
                  <input className="input w-full bg-gray-50" {...orderForm.register("product")} type="text" readOnly />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input className="input w-full bg-gray-50" {...orderForm.register("quantity")} type="text" readOnly />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Estimated Price</legend>
                  <input className="input w-full bg-gray-50" {...orderForm.register("estimatedPrice")} type="text" readOnly />
                </fieldset>
              </div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Supplier</legend>
                <select {...orderForm.register("supplierId")} className="select w-full" required>
                  <option value="">-- Pilih Supplier --</option>
                  {
                    suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.bussinessName}</option>
                    ))
                  }
                </select>
              </fieldset>
              <div className="grid grid-cols-3 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Final Price (Rp)</legend>
                  <input className="input w-full" {...orderForm.register("finalPrice")} type="number" min="0" step="1" required placeholder="0" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Shipping Cost (Rp)</legend>
                  <input className="input w-full" {...orderForm.register("shippingCost")} type="number" min="0" step="1" placeholder="0" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tax Amount (Rp)</legend>
                  <input className="input w-full" {...orderForm.register("taxAmount")} type="number" min="0" step="1" placeholder="0" />
                </fieldset>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Initial Pay Amount (Rp)</legend>
                  <input className="input w-full" {...orderForm.register("payAmount")} type="number" min="0" step="1" placeholder="0" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Payment Method</legend>
                  <select {...orderForm.register("paymentMethod")} className="select w-full">
                    <option value="Cash">Cash</option>
                    {
                      bankAccount.result?.map((b: any) => (
                        <option key={b._id} value={`Transfer - ${b.bank}`}>
                          Transfer - {b.bank} ({b.accountName})
                        </option>
                      ))
                    }
                  </select>
                </fieldset>
              </div>
              {editFn.error ? <p className="text-red-600 text-sm">Terjadi kesalahan, coba lagi.</p> : null}
              <div className="flex flex-row gap-3 justify-end mt-2">
                <button type="button" onClick={() => orderRef.current?.close()} className="p-3 rounded-md border border-gray-300 text-gray-700">
                  Batal
                </button>
                <button type="submit" className="p-3 rounded-md text-white bg-blue-900" disabled={editFn.loading}>
                  {editFn.loading ? 'Processing...' : 'Buat PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

export default withAuth(Requisition)