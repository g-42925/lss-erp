"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Link from "next/link";

import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState } from 'react'

export default function XOrder() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [contract, setContract] = useState<File | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [contractFileName, setContractFileName] = useState<File | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentFileName, setAttachmentFileName] = useState<File | null>(null)
  const [directMode, setDirectMode] = useState<boolean>(false)

  // Direct mode state
  const [directContract, setDirectContract] = useState<File | null>(null)
  const [directAttachment, setDirectAttachment] = useState<File | null>(null)

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const invoiceModalRef = useRef<HTMLDialogElement>(null)

  const [hidden, setHidden] = useState<boolean>(false)


  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()
  const newInvoiceForm = useForm()
  const directOrderForm = useForm()

  const addOrderFn = useFetch<any, any>({
    url: '/api/web/order',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const addDirectServiceOrderFn = useFetch<any, any>({
    url: '/api/web/order',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const addInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice',
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

  const getCustomersFn = useFetch<any, any>({
    url: `/api/web/customers?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getProductsFn = useFetch<any, any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })


  function submitInvoice(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
      invoiceType: 'service'
    })


    addInvoiceFn.fn('', body, (i) => {
      invoiceModalRef.current?.close()
      alert('Invoice created successfully')
    })
  }

  function makeInvoice(salesOrderNumber: string, salesOrderId: string) {
    newInvoiceForm.reset({ salesOrderNumber: salesOrderNumber, salesOrderId: salesOrderId, missing: 0, paid: "false" })
    invoiceModalRef.current?.showModal()
  }

  function submit(data: any) {
    const formData = new FormData()
    formData.append("id", masterAccountId)
    if (contract) formData.append("contract", contract as any)
    if (attachment) formData.append("attachment", attachment as any)
    formData.append("productType", "service")

    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })

    addOrderFn.fn('', formData, (r) => {
      modalRef.current?.close()

      setOrders(
        [
          r,
          ...orders
        ]
      )
    })
  }

  function submitDirectOrder(data: any) {

    const now = Date.now()

    const cart = [
      {
        productId: data.productId,
        qty: data.qty,
        subTotal: data.price,
      }
    ]




    const formData = new FormData()

    formData.append("id", masterAccountId)
    formData.append("total", parseInt(data.price))
    formData.append("salesOrderNumber", `SO-${String(now).slice(-5)}`)
    formData.append("saleDate", now)
    formData.append("productType", "service")
    formData.append("type", "direct")
    formData.append("cart", JSON.stringify(cart))
    formData.append("directOrder", "true")

    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })


    if (directContract) formData.append("contract", directContract as any)
    if (directAttachment) formData.append("attachment", directAttachment as any)


    addDirectServiceOrderFn.fn('', formData, (r) => {
      setOrders([r, ...orders])
      setDirectMode(false)
      directOrderForm.reset()
      setDirectContract(null)
      setDirectAttachment(null)
    })
  }

  async function attachmentSubmit(e: any) {
    const file = e.target.files[0]
    setAttachment(file)
    setAttachmentFileName(file)
    console.log(file)
  }

  async function contractSubmit(e: any) {
    const file = e.target.files[0]
    setContract(file)
    setContractFileName(file)
    console.log(file)
  }

  useEffect(() => {
    if (hasHydrated) {
      const url4 = `/api/web/order?id=${masterAccountId}&type=service`
      const urlCustomers = `/api/web/customers?id=${masterAccountId}`
      const urlProducts = `/api/web/products?id=${masterAccountId}&type=service`

      const body = JSON.stringify({})

      getOrdersFn.fn(url4, body, (result) => {
        setOrders(result)
        console.log(result)
      })

      getCustomersFn.fn(urlCustomers, body, (result) => {
        setCustomers(result)
      })

      getProductsFn.fn(urlProducts, body, (result) => {
        setProducts(result)
      })
    }
  }, [masterAccountId])

  function onContractChg(value: string) {
    if (value === "One Time") {
      directOrderForm.setValue("frequency", "Once")
      setHidden(true)
    }
    else {
      setHidden(false)
    }
  }

  // Direct Service Order Mode
  if (directMode) {
    return (
      <>
        <div className="h-full p-6 flex flex-col gap-3 text-black">
          <span className="text-2xl">Services Order</span>
          <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative overflow-y-auto">
            <div className="flex flex-row items-center gap-3">
              <span className="text-lg font-bold">New Direct Service Order</span>
              <button onClick={() => setDirectMode(false)} className="btn btn-sm ml-auto">← Back</button>
            </div>

            <form onSubmit={directOrderForm.handleSubmit(submitDirectOrder)} className="flex flex-col gap-4 max-w-xl">
              {/* Customer */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Customer</label>
                <input {...directOrderForm.register("customerName")} type="text" className="input flex-1" required />
              </div>

              {/* Product */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Service Product</label>
                <select {...directOrderForm.register("productId")} className="select flex-1" required>
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={`${p._id}/${p.sellingPrice}`}>{p.productName}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Price</label>
                <input
                  {...directOrderForm.register("price")}
                  type="number"
                  placeholder="Service price"
                  className="input flex-1"
                  required
                />
              </div>

              {/* Contract Type */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Contract Type</label>
                <select {...directOrderForm.register("contractType", { onChange: (e) => onContractChg(e.target.value) })} className="select flex-1">
                  <option value="Full">Full</option>
                  <option value="Trial">Trial</option>
                  <option value="One Time">One Time</option>
                </select>
              </div>

              {/* Frequency */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Frequency</label>
                <select {...directOrderForm.register("frequency")} className="select flex-1">
                  <option value="Month">Month</option>
                  <option value="Week">Week</option>
                  <option value="Once">Once</option>
                </select>
              </div>

              {/* Qty */}
              {!hidden && (
                <div className="flex flex-row items-center gap-3">
                  <label className="w-[110px] text-sm font-medium">Qty</label>
                  <input
                    {...directOrderForm.register("qty")}
                    type="number"
                    placeholder="Quantity"
                    className="input flex-1"
                    required
                  />
                </div>
              )}

              {/* Range */}
              {!hidden && (
                <div className="flex flex-row items-center gap-3">
                  <label className="w-[110px] text-sm font-medium">Range</label>
                  <label className="input flex-1">
                    <input {...directOrderForm.register("range")} type="number" placeholder="duration" />
                    <span className="badge badge-neutral badge-xs">Month</span>
                  </label>
                </div>
              )}

              {/* Pay Term */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Pay Term</label>
                <label className="input flex-1">
                  <input {...directOrderForm.register("payTerm")} type="number" placeholder="pay term" />
                  <span className="badge badge-neutral badge-xs">Days</span>
                </label>
              </div>

              {/* Contract Document */}
              {!hidden && (
                <div className="flex flex-row items-center gap-3">
                  <label className="w-[110px] text-sm font-medium">Contract Doc</label>
                  <input
                    onChange={(e) => setDirectContract(e.target.files?.[0] ?? null)}
                    type="file"
                    className="file-input flex-1"
                  />
                </div>
              )}

              {addDirectServiceOrderFn.error || addDirectServiceOrderFn.noResult ? (
                <p className="text-red-700 text-sm">Something went wrong. Please try again.</p>
              ) : null}

              <div className="flex flex-row gap-3 mt-4">
                <button
                  type="submit"
                  disabled={addDirectServiceOrderFn.loading}
                  className="btn bg-blue-900 text-white flex-1"
                >
                  {addDirectServiceOrderFn.loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : "Submit Order"}
                </button>
                <button
                  type="button"
                  onClick={() => { setDirectMode(false); directOrderForm.reset() }}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Services Order</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All order</span>
            <div className="flex flex-row gap-3 ml-auto">
              <button disabled onClick={() => modalRef.current?.showModal()} className="btn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                From Quotation
              </button>
              <button onClick={() => setDirectMode(true)} className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Direct Order
              </button>
            </div>
          </div>
          <div className="flex flex-row">
            <div className="flex flex-row gap-2 items-center">
              Show
              <select className="select w-16">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
          </div>
          {
            getOrdersFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getOrdersFn.error || getOrdersFn.noResult
                ?
                <div>
                  <p>{getOrdersFn.message}</p>
                </div>
                :
                <div>
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Order Number</th>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Range</th>
                        <th>Price</th>
                        <th>Pay Term</th>
                        <th>Contract</th>
                        <th>Attachment</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {
                        searchResult.length < 1
                          ?
                          orders.map((s, index) => {
                            return (
                              <tr key={index}>
                                <td>{s.salesOrderNumber}</td>
                                <td>{s.product?.productName ?? '-'}</td>
                                <td>{s.customer?.bussinessName ?? s.customerName ?? '-'}</td>
                                <td>{s.contractType}</td>
                                <td>{s.range} Month</td>
                                <td>{s.price ?? s.total}</td>
                                <td>{s.payTerm} (Days)</td>
                                {
                                  s.contract
                                    ?
                                    <td>
                                      <a href={s.contract} target="_blank" rel="noopener noreferrer">
                                        ...
                                      </a>
                                    </td>
                                    :
                                    <td>
                                      -
                                    </td>
                                }
                                {
                                  s.attachment
                                    ?
                                    <td>
                                      <a href={s.attachment} target="_blank" rel="noopener noreferrer">
                                        ...
                                      </a>
                                    </td>
                                    :
                                    <td>
                                      -
                                    </td>
                                }
                                <td>
                                  <button onClick={() => makeInvoice(s.salesOrderNumber, s._id)} className="btn btn-sm btn-outline">
                                    Invoice
                                  </button>
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
                                  <button className="btn">
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
          <button className="bg-black text-white rounded-full p-3 absolute right-10 bottom-10">
            <Link href="/sales/order">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>
        </div>
      </div>
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full text-black">
        <form onSubmit={newOrderForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make order (From Quotation)</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quotation Number</label>
            <input {...newOrderForm.register("qNumber")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Pay term</label>
            <label className="input flex-1">
              <input {...newOrderForm.register('payTerm')} type="text" placeholder="pay term" />
              <span className="badge badge-neutral badge-xs">Days</span>
            </label>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[90px]">Contract Document</label>
            <input onChange={(e) => contractSubmit(e)} type="file" className="file-input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[90px]">Attachment</label>
            <input type="file" onChange={(e) => attachmentSubmit(e)} className="file-input flex-1" />
          </div>
          {addOrderFn.noResult || addOrderFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button type="button" onClick={() => modalRef.current?.close()} className="btn">Cancel</button>
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>
      <dialog ref={invoiceModalRef} className="modal h-full text-black">
        <form onSubmit={newInvoiceForm.handleSubmit(submitInvoice)} className="h-72 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make invoice</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Sales Order Number</label>
            <input {...newInvoiceForm.register("salesOrderNumber")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3 hidden">
            <label className="w-[70px]">Sales Order Id</label>
            <input {...newInvoiceForm.register("salesOrderId")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3 hidden">
            <label className="w-[70px]">Pay Amount</label>
            <label className="input flex-1">
              <input {...newInvoiceForm.register('payAmount')} type="text" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Missing</label>
            <label className="input flex-1">
              <input {...newInvoiceForm.register('missing')} type="text" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-2 hidden">
            <label className="w-[70px]">Paid</label>
            <select {...newInvoiceForm.register("paid")} className="select flex-1">
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </div>
          {addInvoiceFn.noResult || addInvoiceFn.error ? <label className="input-validator text-red-900">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button type="button" className="btn" onClick={() => invoiceModalRef.current?.close()}>Cancel</button>
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>
    </>
  )
}