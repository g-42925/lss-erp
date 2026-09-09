/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";

import { useForm, useWatch } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit03Icon, CheckmarkCircle01Icon, MultiplicationSignIcon } from '@hugeicons/core-free-icons';
import { ArrowLeftRightIcon } from '@hugeicons/core-free-icons';

export default function PurchasesApproval() {
  const user = useAuth((state) => state.userId)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const editRef = useRef<HTMLDialogElement>(null)
  const _editRef = useRef<HTMLDialogElement>(null)

  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pr, setPr] = useState<any[]>([])
  const [filterType, setFilterType] = useState<string>("product")

  const editPrForm = useForm()
  const router = useRouter()

  const type = useWatch({ control: editPrForm.control, name: "type" });
  const currentStatus = useWatch({ control: editPrForm.control, name: "currentStatus" });

  const getFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/purchases`,
    method: 'PUT',
    onError: m => {
      alert(m)
    }
  })

  async function search(v: string) {
    if (v.length > 0) {
      const result = pr.filter((r) => {
        const name = filterType === 'service' ? r.description : r.product?.productName || r.product?.name;
        return name?.toLowerCase().includes(v.toLowerCase())
      })
      setSearchResult(result)
    }
    else {
      setSearchResult([])
    }
  }

  async function _editSubmit(data: any) {
    const newPayAmt = parseInt(data.payAmount) - data.currPayAmt
    const amount = data.type === "adjustment" ? data.payAmount : newPayAmt

    const pOrdered = JSON.stringify({
      ...data,
      status: '___approved',
      purchaseType: filterType,
      newPayAmt: amount,
      userId: user,
    })

    if (parseInt(data.payAmount) > data.finalPrice || data.payAmount < data.currPayAmt) {
      if (data.type === "adjustment") {
        await editFn.fn('', pOrdered, (result) => {
          const target = pr.find((r) => r._id == result._id)
          if (target) target.payAmount = result.payAmount
          _editRef.current?.close()
        })
      }
      else {
        alert("Pay amount is invalid")
      }
    }
    else {
      await editFn.fn('', pOrdered, (result) => {
        const target = pr.find((r) => r._id == result._id)
        if (target) target.payAmount = result.payAmount
        _editRef.current?.close()
      })
    }
  }

  async function editSubmit(data: any) {
    function makeParam(data: any) {
      if (data.status === "approved") {
        return JSON.stringify({
          ...data,
          approvedBy: user,
          approvedAt: new Date()
        })
      }
      else {
        return JSON.stringify(data)
      }
    }


    await editFn.fn('', makeParam(data), (result) => {
      window.location.reload()
    })
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
    if (!confirm("Yakin ingin menolak permintaan ini?")) return;
    const payload = JSON.stringify({
      _id: _id,
      action: 'reject_pr',
      userId: user
    })
    await editFn.fn('', payload, () => {
      window.location.reload()
    })
  }

  async function _edit(_id: string) {
    const filter = pr.find((p) => p._id == _id)
    if (!filter) return;

    editPrForm.reset({
      _id: filter._id,
      quantity: filter.quantity,
      finalPrice: filter.finalPrice,
      product: filterType === 'service' ? filter.description : filter.product?.productName || filter.product?.name || 'Unknown Product',
      currPayAmt: filter.payAmount,
      payAmount: filter.payAmount,
      supplierId: filter.supplierId,
      vendorId: filter.vendorId,
      type: 'payment',
      payDate: new Date().toISOString().split('T')[0],
    })

    _editRef.current?.showModal()
  }

  async function edit(_id: string) {
    const filter = pr.find((p) => p._id == _id)
    if (!filter) return;

    editPrForm.reset({
      _id: filter._id,
      description: filter.description,
      finalPrice: filter.finalPrice,
      product: filterType === 'service' ? filter.description : filter.product?.productName || filter.product?.name || 'Unknown Product',
      status: filter.status,
      currentStatus: filter.status
    })

    editRef.current?.showModal()
  }

  useEffect(() => {
    if (hasHydrated) {
      setSearchResult([]);
      const url = `/api/web/purchases?id=${masterAccountId}&type=${filterType}`

      getFn.fn(url, JSON.stringify({}), (result) => {
        setPr(result)
      })
    }
  }, [masterAccountId, filterType])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')


  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Purchases Approval</span>
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

            <input onKeyUp={(e) => search((e.target as HTMLInputElement).value)} type="search" placeholder="Search" className="toolbar-search ml-auto" />
            <button className="bg-black text-white rounded-full p-3 ml-2">
              <Link href="">
                <HugeiconsIcon
                  icon={ArrowLeftRightIcon}
                  size={24}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </Link>
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
                          <th>Product/Service</th>
                          <th>Quantity</th>
                          <th>Price</th>
                          <th>Pay Amount</th>
                          <th>Supplier/Vendor</th>
                          <th>Received</th>
                          <th>Status</th>
                          {filterType !== 'service' && <th>Approval</th>}
                          {filterType !== 'service' && <th>Voidment</th>}
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          (searchResult.length > 0 ? searchResult : pr).map((p, index) => {
                            const itemName = filterType === 'service' ? p.description : p.product?.productName || p.product?.name || '-';
                            const unit = filterType === 'procurement' ? p.product?.unit : p.product?.conversionRatioX;
                            const suppName = filterType === 'service' ? p.vendor?.name : p.supplier?.bussinessName || "-";
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{itemName}</td>
                                <td>{filterType === 'service' ? '-' : `${p.quantity} (${unit || '-'})`}</td>
                                <td>{p.finalPrice}</td>
                                <td>{p.payAmount}</td>
                                <td>
                                  {
                                    p.status === "ordered" || p.status === "completed"
                                      ?
                                      suppName
                                      :
                                      "-"
                                  }
                                </td>
                                <td>{filterType === 'service' ? '-' : `${p.receivedQty || 0} (${unit || '-'})`}</td>
                                <td>{p.status}</td>
                                {filterType !== 'service' && (
                                  <td>
                                    <span>{p.approvedBy?.name ?? "-"} ({p.approvedAt ? new Date(p.approvedAt).toLocaleDateString('id-ID') : "-"})</span>
                                  </td>
                                )}
                                {filterType !== 'service' && (
                                  <td>
                                    <span>{p.voidedBy?.name ?? "-"} ({p.voidedAt ? new Date(p.voidedAt).toLocaleDateString('id-ID') : "-"})</span>
                                  </td>
                                )}
                                <td className="flex flex-row gap-2 justify-center">
                                  {
                                    p.status === "requested" && (
                                      <>
                                        <button className="text-green-600" onClick={() => approve(p._id)} title="Approve">
                                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} color="currentColor" />
                                        </button>
                                        <button className="text-red-600" onClick={() => reject(p._id)} title="Reject">
                                          <HugeiconsIcon icon={MultiplicationSignIcon} size={22} color="currentColor" />
                                        </button>
                                      </>
                                    )
                                  }
                                  {
                                    p.status !== "ordered" && p.status !== "requested" && (
                                      <button disabled={p.status === "void"} onClick={() => edit(p._id)}>
                                        <HugeiconsIcon icon={Edit03Icon} size={22} color="currentColor" strokeWidth={1.5} />
                                      </button>
                                    )
                                  }
                                  {
                                    p.status === "ordered" && (
                                      <button onClick={() => _edit(p._id)}>
                                        <HugeiconsIcon icon={Edit03Icon} size={22} color="currentColor" strokeWidth={1.5} />
                                      </button>
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
      <dialog id="my_modal_2" ref={editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col ">
            <span className="page-title">Edit purchase order</span>
            <form onSubmit={(e) => { void editPrForm.handleSubmit(editSubmit)(e); }} className="flex flex-col gap-3 pb-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product/Service</legend>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly />
              </fieldset>
              {filterType !== 'service' && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input className="input w-full" {...editPrForm.register("quantity")} type="text" readOnly />
                </fieldset>
              )}
              <fieldset className="fieldset col-span-2">
                <legend className="fieldset-legend">Price (Rp)</legend>
                <input className="input w-full" {...editPrForm.register("finalPrice")} type="text" readOnly />
              </fieldset>
              <input type="hidden" {...editPrForm.register("currentStatus")} />
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Status</legend>
                <select className="input w-full" {...editPrForm.register("status")}>
                  <option value="requested" disabled={currentStatus === "ordered"}>Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected" disabled={currentStatus === "ordered"}>Rejected</option>
                </select>
              </fieldset>
              <div className="modal-action">
                <button type="button" onClick={() => editRef.current?.close()} className="btn p-3 rounded-md mr-2 text-black bg-gray-200">
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
      <dialog id="my_modal_3" ref={_editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col ">
            <span className="page-title">Edit purchase order payment</span>
            <form onSubmit={(e) => { void editPrForm.handleSubmit(_editSubmit)(e); }} className="flex flex-col gap-3 pb-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product/Service</legend>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly />
              </fieldset>
              {filterType !== 'service' && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input className="input w-full" {...editPrForm.register("quantity")} type="text" readOnly />
                </fieldset>
              )}
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Pembayaran</legend>
                <input className="input w-full" {...editPrForm.register("payDate")} type="date" required />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay amount</legend>
                <input className="input w-full" {...editPrForm.register("payAmount")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Type</legend>
                <select {...editPrForm.register("type")} className="select w-full">
                  <option>payment</option>
                  <option>adjustment</option>
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Payment Method</legend>
                <select {...editPrForm.register("paymentMethod")} className="select w-full">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="E-Wallet">E-Wallet</option>
                </select>
              </fieldset>
              {
                type === "adjustment"
                  ?
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Adjust to</legend>
                    <input className="input w-full" {...editPrForm.register("reference")} type="text" />
                  </fieldset>
                  :
                  <></>
              }
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
    </>
  )
}
