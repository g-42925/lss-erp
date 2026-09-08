/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import withAuth from "@/hofs/withAuth";

import { useForm, useWatch } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { HugeiconsIcon } from '@hugeicons/react';
import { CoinsDollarIcon, Edit03Icon, Cancel02Icon, CheckmarkCircle01Icon, MultiplicationSignIcon } from '@hugeicons/core-free-icons';

function Purchases() {
  const user = useAuth((state) => state.userId)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const orderRef = useRef<HTMLDialogElement>(null)
  const _editRef = useRef<HTMLDialogElement>(null)

  const [filterType, setFilterType] = useState<string>("product")
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pr, setPr] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])

  const bankAccount = useFetch<any[], any>({ url: '', method: 'GET', onError: (m) => alert(m) })

  const getProductsFn = useFetch<any[], any>({ url: '', method: 'GET' })
  const getSuppliersFn = useFetch<any[], any>({ url: '', method: 'GET' })
  const getItemsFn = useFetch<any[], any>({ url: '', method: 'GET' })
  const getVendorsFn = useFetch<any[], any>({ url: '', method: 'GET' })

  const editForm = useForm()
  const orderForm = useForm()
  const newPrForm = useForm()

  const watchPayAmount = orderForm.watch("payAmount")

  const addFn = useFetch<any, any>({
    url: '/api/web/purchases',
    method: 'POST',
    onError: (m) => alert(m)
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/purchases`,
    method: 'PUT',
    onError: (m) => alert(m)
  })

  const getFn = useFetch<any[], any>({ url: '', method: 'GET' })

  async function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      status: 'requested',
      id: masterAccountId,
      date: new Date(),
      purchaseType: filterType,
      createdBy: user
    })

    addFn.fn('', body, (r) => {
      if (filterType === 'service' && data.vendorId && vendors.length > 0) {
        r.vendor = vendors.find((v) => v._id === data.vendorId)
      }
      setPr([...pr, r])
      modalRef.current?.close()
      newPrForm.reset()
    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const result = pr.filter((r) => {
        const name = filterType === 'service' ? r.description : (r.product?.productName || r.product?.name || '');
        const poNumber = r.purchaseOrderNumber || '';
        return name?.toLowerCase().includes(v.toLowerCase()) || poNumber.toLowerCase().includes(v.toLowerCase())
      })
      setSearchResult(result)
    }
    else {
      setSearchResult([])
    }
  }

  async function _editSubmit(data: any) {
    const target = pr.find((r) => r._id === data._id)
    if (!target) return;

    const edited = JSON.stringify({
      ...data,
      action: filterType === 'service' ? undefined : 'edit_pr',
      status: 'requested'
    })

    await editFn.fn('', edited, (result) => {
      if (filterType === 'product') {
        window.location.reload()
      } else if (filterType === 'procurement') {
        const product = items.find((p) => p._id === data.productId)
        target.product = product
        target.quantity = result.quantity
        target.estimatedPrice = result.estimatedPrice
        _editRef.current?.close()
      } else if (filterType === 'service') {
        target.description = data.description
        target.estimatedPrice = data.estimatedPrice
        target.vendorId = data.vendorId
        target.vendor = vendors.find((v) => v._id === data.vendorId) || target.vendor
        _editRef.current?.close()
      }
    })
  }

  async function orderSubmit(data: any) {
    let finalPrice = parseFloat(data.finalPrice) || 0;
    let estimatedPrice = parseFloat(data.estimatedPrice) || 0;
    let payAmount = parseFloat(data.payAmount) || 0;
    let shippingCost = parseFloat(data.shippingCost) || 0;
    let taxAmount = parseFloat(data.taxAmount) || 0;
    let totalLandedCost = finalPrice + shippingCost + taxAmount;

    if (filterType === 'product') {
      if (finalPrice <= 0) {
        alert("Final price harus lebih dari 0");
        return;
      }
      if (finalPrice > estimatedPrice * 1.5) {
        if (!confirm(`Final price (${finalPrice.toLocaleString()}) jauh melebihi estimasi (${estimatedPrice.toLocaleString()}). Lanjutkan?`)) return;
      }
    } else {
      if (watchPayAmount === "") {
        alert("Please enter pay amount");
        orderForm.setValue("payAmount", 0);
        return;
      }
      if (finalPrice > estimatedPrice) {
        alert("Final price cannot be higher than estimated price")
        return;
      }
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
      status: filterType === 'product' ? undefined : '_approved',
      purchaseType: filterType,
      userId: user
    })
    await editFn.fn('', pOrdered, () => {
      window.location.reload()
    })
  }

  function order(_id: string) {
    const filter = pr.find((p) => p._id == _id)
    if (!filter) return;

    if (filterType === 'product') {
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
    } else if (filterType === 'procurement') {
      orderForm.reset({
        _id: filter._id,
        quantity: filter.quantity,
        estimatedPrice: filter.estimatedPrice,
        product: filter.product?.name,
        customSupplier: filter.customSupplier,
        finalPrice: '',
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: 'Cash',
      })
    } else if (filterType === 'service') {
      orderForm.reset({
        _id: filter._id,
        description: filter.description,
        estimatedPrice: filter.estimatedPrice,
        status: filter.status,
        finalPrice: '',
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: 'Cash',
      })
    }

    orderRef.current?.showModal()
  }

  async function _edit(_id: string) {
    const filter = pr.find((p) => p._id == _id)
    if (!filter) return;

    if (filterType === 'product') {
      editForm.reset({
        _id: filter._id,
        quantity: filter.quantity,
        estimatedPrice: filter.estimatedPrice,
        productId: filter.product?._id
      })
    } else if (filterType === 'procurement') {
      editForm.reset({
        _id: filter._id,
        productId: filter.product?._id,
        quantity: filter.quantity,
        estimatedPrice: filter.estimatedPrice,
        customSupplier: filter.customSupplier
      })
    } else if (filterType === 'service') {
      editForm.reset({
        _id: filter._id,
        description: filter.description,
        estimatedPrice: filter.estimatedPrice,
        vendorId: filter.vendorId
      })
    }
    _editRef.current?.showModal()
  }

  async function approve(_id: string) {
    const payload = JSON.stringify({
      _id: _id,
      action: 'approve_pr',
      userId: user
    })
    await editFn.fn('', payload, () => {
      window.location.reload()
    })
  }

  async function reject(_id: string) {
    if (!confirm("Are you sure you want to reject this requisition?")) return;
    const payload = JSON.stringify({
      _id: _id,
      action: 'reject_pr',
      userId: user
    })
    await editFn.fn('', payload, () => {
      window.location.reload()
    })
  }

  function makeVoid(purchaseObj: any) {
    const approvalCode = prompt("Enter approval code to void")

    if (!approvalCode) {
      if (approvalCode === "") alert("Please enter approval code")
      return;
    }
    else {
      const payload = JSON.stringify({
        _id: purchaseObj._id,
        status: 'void',
        approvalCode: approvalCode,
        voidedBy: user,
        voidedAt: new Date()
      })

      editFn.fn('', payload, (result) => {
        if (result === null) return;
        const target = pr.find((r) => r._id === purchaseObj._id)
        if (target) {
          target.status = "void"
          setPr([...pr])
        }
      })
    }
  }

  useEffect(() => {
    if (hasHydrated) {
      setSearchResult([]);
      const url = `/api/web/purchases?id=${masterAccountId}&f=requested&type=${filterType}`
      const url1 = `/api/web/bank-accounts?id=${masterAccountId}`

      const body = JSON.stringify({})

      bankAccount.fn(url1, body, () => { })

      if (filterType === 'product') {
        getProductsFn.fn(`/api/web/products?id=${masterAccountId}&type=good`, body, setProducts)
        getSuppliersFn.fn(`/api/web/suppliers?id=${masterAccountId}`, body, setSuppliers)
      } else if (filterType === 'procurement') {
        getItemsFn.fn(`/api/web/inv-items?id=${masterAccountId}`, body, setItems)
      } else if (filterType === 'service') {
        getVendorsFn.fn(`/api/web/vendor?id=${masterAccountId}`, body, setVendors)
      }

      getFn.fn(url, body, (result) => {
        setPr(result)
      })
    }
  }, [masterAccountId, hasHydrated, filterType])

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl text-black">Purchases Requisition</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex flex-row gap-2 items-center">
              <button
                onClick={() => setFilterType('product')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${filterType === 'product' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Barang
              </button>
              <button
                onClick={() => setFilterType('service')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${filterType === 'service' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Jasa
              </button>
              <button
                onClick={() => setFilterType('procurement')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${filterType === 'procurement' ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Procurement
              </button>
            </div>

            <button onClick={() => { newPrForm.reset(); modalRef.current?.showModal(); }} className="btn ml-auto bg-blue-900 text-white hover:bg-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
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
                          {filterType === 'product' && <th>Created By</th>}
                          <th>{filterType === 'service' ? 'Description' : 'Item/Product'}</th>
                          {filterType !== 'service' && <th>Quantity</th>}
                          <th>Estimated Price</th>
                          <th>Final Price</th>
                          <th>Pay Amount</th>
                          <th>Status</th>
                          <th>Supplier / Vendor</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          (searchResult.length > 0 ? searchResult : pr).map((p, index) => {
                            const itemName = filterType === 'service' ? p.description : p.product?.productName || p.product?.name || '-';
                            const unit = filterType === 'procurement' ? p.product?.unit : p.product?.conversionRatioX;
                            const suppName = filterType === 'service' ? p.vendor?.name : (filterType === 'procurement' ? p.customSupplier : (p?.supplier?.bussinessName || p?.customSupplier));
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.purchaseOrderNumber}</td>
                                {filterType === 'product' && <td>{p?.createdBy?.name}</td>}
                                <td>{itemName}</td>
                                {filterType !== 'service' && <td>{p.quantity} ({unit || '-'})</td>}
                                <td>{p.estimatedPrice}</td>
                                {
                                  p.status === "ordered" || p.status === "completed" ? <td>{p.finalPrice}</td> : <td>-</td>
                                }
                                {
                                  p.status === "ordered" || p.status === "completed" ? <td>{p.payAmount}</td> : <td>-</td>
                                }
                                <td>{p.status}</td>
                                <td>{suppName || '-'}</td>
                                <td>
                                  {
                                    p.status === "requested" && filterType === 'product' && (
                                      <button className="text-blue-600" onClick={() => _edit(p._id)} title="Edit">
                                        <HugeiconsIcon icon={Edit03Icon} size={24} color="currentColor" />
                                      </button>
                                    )
                                  }
                                  {
                                    p.status === "requested" && filterType !== 'product' && (
                                      <div className="flex flex-row justify-center gap-2">
                                        {filterType === 'procurement' && (
                                          <>
                                            <button className="text-green-600" onClick={() => approve(p._id)} title="Approve">
                                              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} color="currentColor" />
                                            </button>
                                            <button className="text-red-600" onClick={() => reject(p._id)} title="Reject">
                                              <HugeiconsIcon icon={MultiplicationSignIcon} size={24} color="currentColor" />
                                            </button>
                                          </>
                                        )}
                                        <button className="text-blue-600" onClick={() => _edit(p._id)} title="Edit">
                                          <HugeiconsIcon icon={Edit03Icon} size={24} color="currentColor" />
                                        </button>
                                      </div>
                                    )
                                  }
                                  {
                                    p.status === "approved" && filterType === 'product' && (
                                      <button className="text-green-700" onClick={() => order(p._id)} title="Create Purchase Order">
                                        <HugeiconsIcon icon={CoinsDollarIcon} size={24} color="currentColor" />
                                      </button>
                                    )
                                  }
                                  {
                                    p.status === "approved" && filterType !== 'product' && (
                                      <div className="flex flex-row justify-center gap-2">
                                        <button className="btn btn-sm" onClick={() => order(p._id)} title="Convert to PO">
                                          Make PO
                                        </button>
                                      </div>
                                    )
                                  }
                                  {
                                    (p.status === "ordered" || p.status === "completed") && filterType === 'service' && (
                                      <div className="flex flex-row justify-center gap-2">
                                        <button className="text-red-600" onClick={() => makeVoid(p)} title="Void">
                                          <HugeiconsIcon icon={Cancel02Icon} size={24} color="currentColor" />
                                        </button>
                                      </div>
                                    )
                                  }
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

      {/* MODAL EDIT REQUISITION */}
      <dialog id="my_modal_0" ref={_editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">Edit Purchase Requisition</span>
            <form onSubmit={editForm.handleSubmit(_editSubmit)} className="h-92 relative flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                {filterType === 'service' ? (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Description (Jasa)</legend>
                    <input {...editForm.register("description", { required: true })} className="input w-full" />
                  </fieldset>
                ) : (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Select item/product</legend>
                    <select {...editForm.register("productId")} className="input w-full">
                      {
                        filterType === 'product' ? products.map((p) => (
                          <option key={p._id} value={p._id}>{p.productName} ({p.conversionRatioX})</option>
                        )) : items.map((p) => (
                          <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>
                        ))
                      }
                    </select>
                  </fieldset>
                )}

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Estimated price</legend>
                  <input {...editForm.register("estimatedPrice", { required: true })} className="input w-full" type="number" />
                </fieldset>

                {filterType !== 'service' && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Quantity</legend>
                    <input {...editForm.register("quantity", { required: true })} className="input w-full" type="number" />
                  </fieldset>
                )}

                {filterType === 'service' && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Vendor</legend>
                    <select {...editForm.register("vendorId", { required: true })} className="select w-full">
                      {
                        vendors.map((v) => (
                          <option value={v._id} key={v._id}>
                            {v.name}
                          </option>
                        ))
                      }
                    </select>
                  </fieldset>
                )}
              </div>
              {editFn.noResult || editFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
              <div className="mt-auto ml-auto flex gap-2">
                <button type="button" onClick={() => _editRef.current?.close()} className="p-3 rounded-md text-black bg-gray-200">
                  Cancel
                </button>
                <button type="submit" className="p-3 rounded-md text-white bg-blue-900">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* MODAL ADD REQUISITION */}
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">Add Purchase Requisition</span>
            <form onSubmit={newPrForm.handleSubmit(submit)} className="h-92 relative flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                {filterType === 'service' ? (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Description (Jasa)</legend>
                    <input {...newPrForm.register("description", { required: true })} className="input w-full" />
                  </fieldset>
                ) : (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Select item/product</legend>
                    <select {...newPrForm.register("productId")} className="input w-full">
                      {
                        filterType === 'product' ? products.map((p) => (
                          <option key={p._id} value={p._id}>{p.productName} ({p.conversionRatioX})</option>
                        )) : items.map((p) => (
                          <option key={p._id} value={p._id}>{p.name} ({p.unit})</option>
                        ))
                      }
                    </select>
                  </fieldset>
                )}

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Estimated price</legend>
                  <input {...newPrForm.register("estimatedPrice", { required: true })} className="input w-full" type="number" />
                </fieldset>

                {filterType !== 'service' && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Quantity</legend>
                    <input {...newPrForm.register("quantity", { required: true })} className="input w-full" type="number" />
                  </fieldset>
                )}

                {filterType === 'service' && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">Vendor</legend>
                    <select {...newPrForm.register("vendorId", { required: true })} className="select w-full">
                      {
                        vendors.map((v) => (
                          <option value={v._id} key={v._id}>
                            {v.name}
                          </option>
                        ))
                      }
                    </select>
                  </fieldset>
                )}
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
              <div className="mt-auto ml-auto flex gap-2">
                <button type="button" onClick={() => modalRef.current?.close()} className="p-3 rounded-md text-black bg-gray-200">
                  Cancel
                </button>
                <button type="submit" className="p-3 rounded-md text-white bg-blue-900">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* MODAL MAKE PO */}
      <dialog id="my_modal_2" ref={orderRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">Create Purchase Order</span>
            <form onSubmit={orderForm.handleSubmit(orderSubmit)} className="flex flex-col gap-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">{filterType === 'service' ? 'Description' : 'Product/Item'}</legend>
                  <input className="input w-full bg-gray-50" {...orderForm.register(filterType === 'service' ? 'description' : 'product')} type="text" readOnly />
                </fieldset>

                {filterType !== 'service' && (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Quantity</legend>
                    <input className="input w-full bg-gray-50" {...orderForm.register("quantity")} type="text" readOnly />
                  </fieldset>
                )}

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Estimated Price</legend>
                  <input className="input w-full bg-gray-50" {...orderForm.register("estimatedPrice")} type="text" readOnly />
                </fieldset>
              </div>

              {filterType === 'product' && (
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
              )}
              {filterType === 'procurement' && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Supplier / Asal</legend>
                  <input className="input w-full" {...orderForm.register("customSupplier")} type="text" />
                </fieldset>
              )}
              {filterType === 'service' && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Vendor</legend>
                  <select {...orderForm.register("vendorId", { required: true })} className="select w-full">
                    {
                      vendors.map((v) => {
                        return (
                          <option value={v._id} key={v._id}>
                            {v.name}
                          </option>
                        )
                      })
                    }
                  </select>
                </fieldset>
              )}

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
                <fieldset className={`fieldset ${watchPayAmount > 0 ? '' : 'hidden'}`}>
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

export default withAuth(Purchases)
