"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Link from "next/link"

import { useRouter, useSearchParams } from 'next/navigation'

import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react';
import { ContractsIcon } from '@hugeicons/core-free-icons'
import { AddInvoiceIcon } from '@hugeicons/core-free-icons';

import React, { Suspense } from "react";

export default function XOrder() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <XOrderContent />
    </Suspense>
  )
}

function XOrderContent() {
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchTerm, setSearchTerm] = useState<string>("")
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
  const [selectedTaxes, setSelectedTaxes] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const invoiceModalRef = useRef<HTMLDialogElement>(null)
  const [payTerm, setPayTerm] = useState<string>(new Date().toISOString().split('T')[0])
  const [debt, setDebt] = useState<string>('no')
  const [hidden, setHidden] = useState<boolean>(false)

  const [qProduct, setQProduct] = useState<string>('')

  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()
  const newInvoiceForm = useForm()
  const directOrderForm = useForm<any>({
    defaultValues: {
      customerName: "",
      address: "",
      productId: "",
      price: 0,
      contractType: "Full",
      frequency: "Month",
      qty: 1,
      range: 1,
      debt: "no",
      payTerm: payTerm,
      dueDate: 0,
      paymentMethod: "Cash",
      payAmount: 0,
    }
  })

  const watchContractType = directOrderForm.watch("contractType")
  const watchFrequency = directOrderForm.watch("frequency")
  const watchRange = directOrderForm.watch("range")
  const watchDebt = directOrderForm.watch("debt")
  const watchPrice = directOrderForm.watch("price")

  const isOneTimeMultiMonth = watchContractType === "One Time" && watchFrequency === "Month" && Number(watchRange) > 1
  const isOneTimeOnce = watchContractType === "One Time" && watchFrequency === "Once"
  const isOneTimeOnceDebtNo = watchContractType === "One Time" && watchFrequency === "Once" && watchDebt === "no"
  const isOneTimeMonthOneRangeDebt = watchContractType === "One Time" && watchFrequency === "Month" && Number(watchRange) === 1 && watchDebt === "no"

  const router = useRouter()

  useEffect(() => {
    if (isOneTimeOnce) {
      directOrderForm.setValue("qty", 1)
      directOrderForm.setValue("range", 1)
    }
  }, [isOneTimeOnce, directOrderForm])

  useEffect(() => {
    if (isOneTimeMonthOneRangeDebt || isOneTimeOnceDebtNo) {
      directOrderForm.setValue("payAmount", watchPrice)
    }
  }, [isOneTimeMonthOneRangeDebt, isOneTimeOnceDebtNo, watchPrice, directOrderForm])

  const bankAccounts = useFetch<any[], any>({
    url: `/api/web/bank-accounts?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const addOrderFn = useFetch<any, any>({
    url: '/api/web/order',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const addDirectServiceOrderFn = useFetch<any, any>({
    url: '/api/web/service-csale',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const addInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice/service',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const activateInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice/svc',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  function activateInvoice(son: string) {
    const params = {
      salesOrderNumber: son,
      status: 'active'
    }

    activateInvoiceFn.fn(``, JSON.stringify(params), (r) => {
      alert("Invoice activated successfully")
    })
  }

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

  const getServiceOrdersFn = useFetch<any[], any>({
    url: `/api/web/service-csale?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getTaxesFn = useFetch<any[], any>({
    url: `/api/web/tax?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })


  function submitInvoice(data: any) {
    const params = {
      salesOrderNumber: data.salesOrderNumber,
      status: 'active',
      missing: parseInt(data.missing) || 0,
      date: data.date,
      payAmount: parseFloat(data.payAmount) || 0
    }

    activateInvoiceFn.fn('', JSON.stringify(params), (r) => {
      invoiceModalRef.current?.close()
      window.location.href = '/sales/xorder'
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
    const taxes: any[] = []

    selectedTaxes.forEach(tax => {
      const value = data.price * (tax.value / 100)

      taxes.push({
        taxName: tax.name,
        taxValue: value
      })
    })

    const formData = new FormData()

    formData.append("taxes", JSON.stringify(taxes))

    formData.append("id", masterAccountId)

    if (directContract) formData.append("contract", directContract as any)

    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })


    addDirectServiceOrderFn.fn('', formData, (r) => {
      window.location.href = '/sales/xorder'
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

  const searchParams = useSearchParams()
  const qNumber = searchParams.get("qNumber")

  useEffect(() => {
    if (hasHydrated && qNumber) {
      const url = `/api/web/quotations?qNumber=${qNumber}&type=service`
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.result && data.result.length > 0) {
            const q = data.result[0]
            setDirectMode(true)
            const qTaxes = q.cart?.[0]?.taxes || []
            const ppnSelection = qTaxes.map((t: any) => `${t.taxName}|${t.taxValue}`)

            if (q.contractType === "One Time") setHidden(true)

            setQProduct(q.productId)

            directOrderForm.reset({
              customerName: q.customer?.bussinessName || "",
              address: q.customer?.address || "",
              productId: q.productId,
              price: q.price || 0,
              contractType: q.contractType || "Full",
              frequency: q.frequency || "Month",
              qty: q.qty,
              range: q.range || 1,
              debt: "no",
              payTerm: payTerm,
              dueDate: 0,
              paymentMethod: "Cash",
              payAmount: 0,
              ppn: ppnSelection.length > 0 ? ppnSelection : ["no"],
            })
          }
        })
    }
  }, [hasHydrated, qNumber, directOrderForm])

  useEffect(() => {
    if (hasHydrated) {
      const url4 = `/api/web/order?id=${masterAccountId}&type=service`
      const urlCustomers = `/api/web/customers?id=${masterAccountId}`
      const urlProducts = `/api/web/products?id=${masterAccountId}&type=service`
      const url3 = `/api/web/tax?id=${masterAccountId}`
      const url5 = `/api/web/service-csale?id=${masterAccountId}`
      const url6 = `/api/web/bank-accounts?id=${masterAccountId}`

      const body = JSON.stringify({})

      getOrdersFn.fn(url4, body, (result) => {
        setOrders(result)
      })

      getCustomersFn.fn(urlCustomers, body, (result) => {
        setCustomers(result)
        console.log(result)
      })

      getProductsFn.fn(urlProducts, body, (result) => {
        setProducts(result)
      })

      getTaxesFn.fn(url3, body, (_) => { })

      bankAccounts.fn(url6, body, (result) => { })

      getServiceOrdersFn.fn(url5, body, (result) => { })
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

  function toggleTax(tax: any) {
    if (selectedTaxes.some(t => (t._id || t.id) === (tax._id || tax.id))) {
      setSelectedTaxes(selectedTaxes.filter(t => (t._id || t.id) !== (tax._id || tax.id)))
    } else {
      setSelectedTaxes([...selectedTaxes, tax])
    }
  }

  const filteredOrders = useMemo(() => {
    if (!getServiceOrdersFn.result) return [];

    return getServiceOrdersFn.result.filter((order: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = searchTerm === "" ||
        (order.salesOrderNumber?.toLowerCase().includes(searchLower)) ||
        (order.customCustomer?.name?.toLowerCase().includes(searchLower)) ||
        (order.customerId?.toLowerCase().includes(searchLower)) ||
        (order.date?.toLowerCase().includes(searchLower)) ||
        (new Date(order.date).toISOString().split('T')[0].includes(searchLower));

      return matchSearch;
    });
  }, [getServiceOrdersFn.result, searchTerm]);

  function onCustomerChange(e: any) {
    const customer = customers.find((c: any) => c.bussinessName === e.target.value)
    if (customer) directOrderForm.setValue("address", customer.address)
  }

  // Direct Service Order Mode
  if (directMode) {
    return (
      <>
        <div className="h-full p-6 flex flex-col gap-3 text-black">
          <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative overflow-y-auto">
            <div className="flex flex-row items-center gap-3">
              <span className="text-lg font-bold">New Direct Service Order</span>
              <button onClick={() => setDirectMode(false)} className="btn btn-sm ml-auto">← Back</button>
            </div>

            <form onSubmit={directOrderForm.handleSubmit(submitDirectOrder)} className="flex flex-col gap-4 max-w-xl">
              {/* Customer */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">
                  Customer
                </label>
                <input
                  list="customers"
                  {...directOrderForm.register("customerName", {
                    onChange: (e) => {
                      onCustomerChange(e)
                    }
                  })}
                  type="text"
                  className="input flex-1"
                  required
                />

                <datalist id="customers">
                  {getCustomersFn.result?.map((customer: any) => (
                    <option
                      key={customer._id}
                      value={customer.bussinessName}
                    />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Address</label>
                <input {...directOrderForm.register("address")} type="text" className="input flex-1" required />

              </div>

              {/* Product */}
              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Service Product</label>
                <select defaultValue={qProduct} {...directOrderForm.register("productId")} className="select flex-1" required>
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={`${p._id}`}>{p.productName}</option>
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
                <label className="w-[110px] text-sm font-medium">Service Type</label>
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
                  <option disabled={watchContractType === "One Time"} value="Month">Month</option>
                  <option disabled={watchContractType !== "One Time"} value="Once">Once</option>
                </select>
              </div>

              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Qty</label>
                <input
                  {...directOrderForm.register("qty")}
                  type="number"
                  placeholder="Quantity"
                  className="input flex-1"
                  required
                  readOnly={isOneTimeOnce}
                />
              </div>

              <div className={`flex flex-row items-center gap-3 ${isOneTimeOnce ? 'hidden' : ''}`}>
                <label className="w-[110px] text-sm font-medium">Range</label>
                <label className="input flex-1">
                  <input {...directOrderForm.register("range")} type="number" placeholder="duration" />
                </label>
              </div>

              <div className={`flex flex-row items-center gap-3 ${(hidden && !isOneTimeMultiMonth) ? '' : 'hidden'}`}>
                <label className="w-[110px] text-sm font-medium ">Debt</label>
                <select {...directOrderForm.register('debt', { onChange: (e) => setDebt(e.target.value) })} className="select flex-1">
                  <option>
                    no
                  </option>
                  <option>
                    yes
                  </option>
                </select>
              </div>

              <div className={`flex flex-row items-center gap-3 ${(hidden && !isOneTimeMultiMonth) ? '' : 'hidden'}`}>
                <label className="w-[110px] text-sm font-medium">Pay term</label>
                <label className="input flex-1">
                  <input {...directOrderForm.register('payTerm')} type="date" placeholder="pay term" />
                </label>
              </div>

              <div className={`flex flex-row items-center gap-3 ${(!hidden || isOneTimeMultiMonth) ? '' : 'hidden'}`}>
                <label className="w-[110px] text-sm font-medium">Due date</label>
                <label className="input flex-1">
                  <input {...directOrderForm.register("dueDate")} type="number" placeholder="due date" />
                  <span className="badge badge-neutral badge-xs">Date</span>
                </label>
              </div>


              <div className={`flex flex-row items-center gap-3 ${(hidden && !isOneTimeMultiMonth) ? '' : 'hidden'}`}>
                <label className="w-[110px] text-sm font-medium">Payment Method</label>
                <select {...directOrderForm.register('paymentMethod')} className="select flex-1">
                  <option>
                    Cash
                  </option>
                  {
                    bankAccounts.result?.map((bank: any) => {
                      return (
                        <option value={`transfer to ${bank.bank}`} key={bank._id}>
                          transfer to {bank.bank} ({bank.accountName})
                        </option>
                      )
                    })
                  }
                </select>
              </div>

              <div className={`flex flex-row items-center gap-3 ${hidden ? '' : 'hidden'}`}>
                <label className="w-[110px] text-sm font-medium">Pay Amount</label>
                <input
                  placeholder="pay amount"
                  {...directOrderForm.register("payAmount")}
                  type="number"
                  className="input flex-1"
                />
              </div>


              <div className="flex flex-row items-center gap-3">
                <label className="w-[110px] text-sm font-medium">Contract Doc</label>
                <input
                  onChange={(e) => setDirectContract(e.target.files?.[0] ?? null)}
                  type="file"
                  className="file-input flex-1"
                />
              </div>

              {
                addDirectServiceOrderFn.error || addDirectServiceOrderFn.noResult ? (
                  <p className="text-red-700 text-sm">Something went wrong. Please try again.</p>
                )
                  :
                  <></>
              }
              <div className="flex flex-row items-center gap-3 flex-wrap">
                <label className="w-[110px] text-sm font-medium">Tax</label>
                {getTaxesFn.result?.map(tax => {
                  const isSelected = selectedTaxes.some(t => (t._id || t.id) === (tax._id || tax.id));
                  return (
                    <button
                      key={tax._id || tax.id}
                      type="button"
                      onClick={() => toggleTax(tax)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${isSelected
                        ? 'bg-purple-100 border-purple-500 text-purple-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300'
                        }`}
                    >
                      {tax.name} ({tax.value}%)
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-row gap-3 mt-4">
                <button type="submit" disabled={addDirectServiceOrderFn.loading} className="btn bg-blue-900 text-white flex-1">
                  {
                    addDirectServiceOrderFn.loading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    )
                      :
                      "Submit Order"
                  }
                </button>
                <button type="button" onClick={() => { setDirectMode(false); directOrderForm.reset(); setSelectedTaxes([]) }} className="btn btn-outline flex-1">
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
            <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
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
                        <th>Date</th>
                        <th>Contract Type</th>
                        <th>Customer</th>
                        <th>Range</th>
                        <th>Frequency</th>
                        <th>Price</th>
                        <th>Billed</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {
                        searchResult.length < 1
                          ?
                          filteredOrders?.map((s: any, index: number) => {
                            return (
                              <tr key={index}>
                                <td>{s.salesOrderNumber}</td>
                                <td>{products.filter(p => p._id === s.productId)[0].productName}</td>
                                <td>{s.date}</td>
                                <td>{s.contractType}</td>
                                <td>{s.customCustomer ? s.customCustomer.name : s.customerId}</td>
                                <td>{s.range}</td>
                                <td>{s.frequency}</td>
                                <td>{s.price}</td>
                                <td>{s.billed}</td>
                                <td className="flex flex-row gap-1 justify-center">
                                  {
                                    s.contract ?
                                      <button>
                                        <HugeiconsIcon
                                          icon={ContractsIcon}
                                          size={24}
                                          color="currentColor"
                                          strokeWidth={1.5}
                                          onClick={() => alert('ok')}
                                        />
                                      </button>
                                      :
                                      <button disabled className="text-gray-900">
                                        <HugeiconsIcon
                                          icon={ContractsIcon}
                                          size={24}
                                          color="currentColor"
                                          strokeWidth={1.5}
                                        />
                                      </button>
                                  }

                                  {
                                    s.contractType === "One Time" && s.frequency === "Once" ?
                                      (
                                        <button disabled={activateInvoiceFn.loading} onClick={() => submitInvoice({ salesOrderNumber: s.salesOrderNumber, missing: 0 })} className="text-gray-900">
                                          {activateInvoiceFn.loading ? <span className="loading loading-spinner loading-xs"></span> : <HugeiconsIcon
                                            icon={AddInvoiceIcon}
                                            size={24}
                                            color="currentColor"
                                            strokeWidth={1.5}
                                          />}
                                        </button>
                                      )
                                      :
                                      (
                                        <button disabled={activateInvoiceFn.loading} onClick={() => makeInvoice(s.salesOrderNumber, s._id)} className="text-gray-900">
                                          {activateInvoiceFn.loading ? <span className="loading loading-spinner loading-xs"></span> : <HugeiconsIcon
                                            icon={AddInvoiceIcon}
                                            size={24}
                                            color="currentColor"
                                            strokeWidth={1.5}
                                          />}
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
      </div >
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
        <form onSubmit={newInvoiceForm.handleSubmit(submitInvoice)} className="h-86 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make invoice</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Date</label>
            <input {...newInvoiceForm.register("date", { required: true })} type="date" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Sales Order Number</label>
            <input {...newInvoiceForm.register("salesOrderNumber")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3 hidden">
            <label className="w-[70px]">Sales Order Id</label>
            <input {...newInvoiceForm.register("salesOrderId")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Pay Amount</label>
            <input
              {...newInvoiceForm.register('payAmount')}
              type="number"
              placeholder="0 (leave empty for full payment later)"
              className="input flex-1"
            />
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