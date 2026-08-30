"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Link from "next/link"

import { useRouter, useSearchParams } from 'next/navigation'

import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState, useMemo, Suspense } from 'react'
import { ContractsIcon } from '@hugeicons/core-free-icons'
import { AddInvoiceIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AddCircleHalfDotIcon } from '@hugeicons/core-free-icons';
import { ArrowLeftRightIcon } from '@hugeicons/core-free-icons';
import { PercentCircleIcon } from '@hugeicons/core-free-icons';


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
  const [editContract, setEditContract] = useState<File | null>(null)
  const [selectedTaxes, setSelectedTaxes] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const invoiceModalRef = useRef<HTMLDialogElement>(null)
  const applyTaxModalRef = useRef<HTMLDialogElement>(null)
  const closeConfirmRef = useRef<HTMLDialogElement>(null)

  const [applyTaxOrder, setApplyTaxOrder] = useState<any>(null)
  const [applyTaxSelected, setApplyTaxSelected] = useState<any[]>([])
  const applyTaxSelectedRef = useRef<any[]>([])
  const [localOrders, setLocalOrders] = useState<any[]>([])
  const [payTerm, setPayTerm] = useState<string>(new Date().toISOString().split('T')[0])
  const [debt, setDebt] = useState<string>('no')
  const [hidden, setHidden] = useState<boolean>(false)
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed' | 'all'>('active')
  const [closeTargetOrder, setCloseTargetOrder] = useState<any>(null)

  const [qProduct, setQProduct] = useState<string>('')

  const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];

  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()
  const newInvoiceForm = useForm<any>({
    defaultValues: {
      date: lastDayOfMonth
    }
  })
  const editOrderForm = useForm()
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
    url: '',
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

  const updateDirectServiceOrderFn = useFetch<any, any>({
    url: '/api/web/service-csale',
    method: 'PUT',
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
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getCustomersFn = useFetch<any, any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getProductsFn = useFetch<any, any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getServiceOrdersFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getTaxesFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const [applyTaxLoading, setApplyTaxLoading] = useState(false)
  const [applyTaxError, setApplyTaxError] = useState(false)

  const closeOrderFn = useFetch<any, any>({
    url: '/api/web/service-csale',
    method: 'PATCH',
    onError: (m) => {
      alert(m)
    }
  })

  function openCloseConfirm(order: any) {
    setCloseTargetOrder(order)
    closeConfirmRef.current?.showModal()
  }

  async function confirmCloseOrder() {
    if (!closeTargetOrder) return
    const action = closeTargetOrder.status === 'closed' ? 'reopen' : 'close'
    closeOrderFn.fn('', JSON.stringify({ _id: closeTargetOrder._id, action }), () => {
      setLocalOrders(prev =>
        prev.map(o =>
          o._id === closeTargetOrder._id
            ? { ...o, status: action === 'close' ? 'closed' : 'active' }
            : o
        )
      )
      closeConfirmRef.current?.close()
      setCloseTargetOrder(null)
    })
  }


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
      window.location.href = '/sales/svc-order'
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
      window.location.href = '/sales/svc-order'
    })
  }

  function openApplyTaxModal(order: any) {
    // Selalu ambil versi terkini dari localOrders agar pre-selection sinkron
    const freshOrder = localOrders.find(o => o._id === order._id) || order
    setApplyTaxOrder(freshOrder)
    const existing = (freshOrder.taxes || []).map((t: any) => {
      const found = getTaxesFn.result?.find((tx: any) => tx.name === t.taxName)
      return found || null
    }).filter(Boolean)
    setApplyTaxSelected(existing)
    applyTaxSelectedRef.current = existing
    applyTaxModalRef.current?.showModal()
  }

  function toggleApplyTax(tax: any) {
    setApplyTaxSelected(prev => {
      const exists = prev.some(t => (t._id || t.id) === (tax._id || tax.id))
      const next = exists
        ? prev.filter(t => (t._id || t.id) !== (tax._id || tax.id))
        : [...prev, tax]
      applyTaxSelectedRef.current = next
      return next
    })
  }

  async function submitApplyTax() {
    if (!applyTaxOrder) return

    // Baca dari ref untuk memastikan nilai terkini (bukan closure stale)
    const currentSelected = applyTaxSelectedRef.current
    const taxes = currentSelected.map(tax => ({
      taxName: tax.name,
      taxValue: applyTaxOrder.price * (tax.value / 100)
    }))

    console.log('[ApplyTax] selected:', currentSelected.map(t => t.name))
    console.log('[ApplyTax] taxes payload:', taxes)

    setApplyTaxLoading(true)
    setApplyTaxError(false)

    try {
      const res = await fetch('/api/web/service-csale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: applyTaxOrder._id, taxes }),
      })
      const json = await res.json()
      if (json.error || json.noResult) {
        setApplyTaxError(true)
        return
      }
      // Update baris order di local state tanpa reload
      setLocalOrders(prev =>
        prev.map(o => o._id === applyTaxOrder._id ? { ...o, taxes } : o)
      )
      applyTaxModalRef.current?.close()
      setApplyTaxOrder(null)
      setApplyTaxSelected([])
    } catch {
      setApplyTaxError(true)
    } finally {
      setApplyTaxLoading(false)
    }
  }

  function openEditModal(order: any) {
    editOrderForm.reset({
      _id: order._id,
      customerName: order.customCustomer?.name || order.customerId || "",
      address: order.customCustomer?.address || "",
      productId: order.productId,
      price: order.price,
      contractType: order.contractType,
      frequency: order.frequency,
      qty: order.qty,
      range: order.range,
      billed: order.billed,
    })
    editRef.current?.showModal()
  }

  function submitEditOrder(data: any) {
    const formData = new FormData()
    formData.append("_id", data._id)
    formData.append("id", masterAccountId)
    formData.append("customer", JSON.stringify({
      name: data.customerName,
      address: data.address
    }))
    formData.append("productId", data.productId)
    formData.append("price", data.price)
    formData.append("contractType", data.contractType)
    formData.append("frequency", data.frequency)
    formData.append("qty", data.qty)
    formData.append("range", data.range)
    formData.append("billed", data.billed)

    if (editContract) {
      formData.append("contract", editContract as any)
    }

    updateDirectServiceOrderFn.fn('', formData, (r) => {
      editRef.current?.close()
      window.location.reload()
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

      getServiceOrdersFn.fn(url5, body, (result) => {
        setLocalOrders(result)
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

  function toggleTax(tax: any) {
    if (selectedTaxes.some(t => (t._id || t.id) === (tax._id || tax.id))) {
      setSelectedTaxes(selectedTaxes.filter(t => (t._id || t.id) !== (tax._id || tax.id)))
    } else {
      setSelectedTaxes([...selectedTaxes, tax])
    }
  }

  const filteredOrders = useMemo(() => {
    if (!localOrders.length && !getServiceOrdersFn.result) return [];

    const source = localOrders.length > 0 ? localOrders : (getServiceOrdersFn.result ?? []);

    return source.filter((order: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = searchTerm === "" ||
        (order.salesOrderNumber?.toLowerCase().includes(searchLower)) ||
        (order.customCustomer?.name?.toLowerCase().includes(searchLower)) ||
        (order.customerId?.toLowerCase().includes(searchLower)) ||
        (order.date?.toLowerCase().includes(searchLower)) ||
        (new Date(order.date).toISOString().split('T')[0].includes(searchLower));

      const orderStatus = order.status || 'active';
      const matchStatus =
        statusFilter === 'all' ||
        orderStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [localOrders, getServiceOrdersFn.result, searchTerm, statusFilter]);

  function onCustomerChange(e: any) {
    const customer = customers.find((c: any) => c.bussinessName === e.target.value)
    if (customer) directOrderForm.setValue("address", customer.address)
  }

  // Direct Service Order Mode
  if (directMode) {
    return (
      <>
        <div className="h-full p-6 flex flex-col gap-3">
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
                <label className="w-[110px] text-sm font-medium">Termin</label>
                <label className="input flex-1">
                  <input {...directOrderForm.register("dueDate")} type="number" placeholder="termin" />
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

  function downloadContract(url: string) {
    const link = document.createElement("a")
    link.href = url
    link.download = "contract.pdf"
    link.click()
  }

  return (
    <>
      <div className="p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Services Order</span>
        <div className="min-h-screen bg-white border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <span className="self-center font-semibold">Service Orders</span>
            {/* Status filter tabs */}
            <div className="flex flex-row gap-1 rounded-full border border-gray-200 bg-gray-100 p-1">
              {(['active', 'closed', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-all ${
                    statusFilter === f
                      ? f === 'active'
                        ? 'bg-blue-900 text-white shadow'
                        : f === 'closed'
                        ? 'bg-red-700 text-white shadow'
                        : 'bg-gray-800 text-white shadow'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex flex-row gap-3 ml-auto">
              <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search" className="toolbar-search" />
              <button onClick={() => setDirectMode(true)} className="bg-black text-white p-3 rounded-full">
                <HugeiconsIcon
                  icon={AddCircleHalfDotIcon}
                  size={24}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </button>
              <button className="bg-black text-white rounded-full p-3">
                <Link href="/sales/order">
                  <HugeiconsIcon
                    icon={ArrowLeftRightIcon}
                    size={24}
                    color="currentColor"
                    strokeWidth={1.5}
                  />
                </Link>
              </button>
            </div>
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
                  <div className="overflow-x-auto w-full">
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
                          <th>Status</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody className="text-center">
                        {
                          searchResult.length < 1
                            ?
                            filteredOrders?.map((s: any, index: number) => {
                              return (
                                <tr key={index} className={s.status === 'closed' ? 'opacity-60' : ''}>
                                  <td>{s.salesOrderNumber}</td>
                                  <td>{products.filter(p => p._id === s.productId)[0]?.productName ?? '-'}</td>
                                  <td>{new Date(s.date).toLocaleDateString()}</td>
                                  <td>{s.contractType}</td>
                                  <td>{s.customCustomer ? s.customCustomer.name : s.customerId}</td>
                                  <td>{s.range}</td>
                                  <td>{s.frequency}</td>
                                  <td>{new Intl.NumberFormat('id-ID').format(s.price)}</td>
                                  <td>{s.billed}</td>
                                  <td>
                                    <span className={`badge badge-sm ${
                                      (s.status || 'active') === 'active'
                                        ? 'badge-success'
                                        : 'badge-error'
                                    }`}>
                                      {s.status || 'active'}
                                    </span>
                                  </td>
                                  <td className="flex flex-row gap-1 justify-center">
                                    {
                                      s.contract ?
                                        <button>
                                          <HugeiconsIcon
                                            icon={ContractsIcon}
                                            size={24}
                                            color="currentColor"
                                            strokeWidth={1.5}
                                            onClick={() => downloadContract(s.contract)}
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
                                    <button
                                      onClick={() => openApplyTaxModal(s)}
                                      className={`relative transition-colors ${
                                        s.taxes && s.taxes.length > 0
                                          ? 'text-emerald-600 hover:text-emerald-700'
                                          : 'text-gray-400 hover:text-gray-600'
                                      }`}
                                      title={
                                        s.taxes && s.taxes.length > 0
                                          ? `Taxes applied: ${s.taxes.map((t: any) => t.taxName).join(', ')}`
                                          : 'Apply Tax'
                                      }
                                    >
                                      <HugeiconsIcon
                                        icon={PercentCircleIcon}
                                        size={24}
                                        color="currentColor"
                                        strokeWidth={1.5}
                                      />
                                      {s.taxes && s.taxes.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                          {s.taxes.length}
                                        </span>
                                      )}
                                    </button>
                                    <button onClick={() => openEditModal(s)} className="text-gray-900" title="Edit Order">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => openCloseConfirm(s)}
                                      title={(s.status || 'active') === 'closed' ? 'Reopen Order' : 'Close Order'}
                                      className={(s.status || 'active') === 'closed' ? 'text-green-600' : 'text-red-600'}
                                    >
                                      {(s.status || 'active') === 'closed' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                      )}
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
                </div>
          }
        </div>
      </div >

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
          <div className="flex flex-row items-center gap-3 hidden">
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
      {/* Apply Tax Modal */}
      <dialog ref={applyTaxModalRef} className="modal h-full text-black">
        <div className="modal-box flex flex-col gap-4">
          <h3 className="text-lg font-bold">Apply Tax to Order</h3>
          {applyTaxOrder && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex flex-col gap-1">
              <span className="font-medium text-slate-700">{applyTaxOrder.salesOrderNumber}</span>
              <span className="text-slate-500">
                {applyTaxOrder.customCustomer?.name || applyTaxOrder.customerId}
              </span>
              <span className="text-slate-500">
                Price: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(applyTaxOrder.price)}
              </span>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Select taxes to apply:</p>
            <div className="flex flex-row flex-wrap gap-2">
              {getTaxesFn.result?.length === 0 && (
                <p className="text-sm text-slate-400">No taxes configured. Add taxes in the Taxes menu first.</p>
              )}
              {getTaxesFn.result?.map((tax: any) => {
                const isSelected = applyTaxSelected.some(t => (t._id || t.id) === (tax._id || tax.id));
                const taxAmount = applyTaxOrder ? applyTaxOrder.price * (tax.value / 100) : 0;
                return (
                  <button
                    key={tax._id || tax.id}
                    type="button"
                    onClick={() => toggleApplyTax(tax)}
                    className={`flex flex-col items-start px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    <span>{tax.name} — {tax.value}%</span>
                    {applyTaxOrder && (
                      <span className="text-xs opacity-70">
                        +{new Intl.NumberFormat('id-ID').format(taxAmount)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {applyTaxSelected.length > 0 && applyTaxOrder && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm">
              <p className="font-medium text-indigo-800 mb-1">Summary</p>
              {applyTaxSelected.map((t: any) => (
                <div key={t._id || t.id} className="flex justify-between text-indigo-700">
                  <span>{t.name} ({t.value}%)</span>
                  <span>+{new Intl.NumberFormat('id-ID').format(applyTaxOrder.price * (t.value / 100))}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-indigo-900 border-t border-indigo-200 mt-2 pt-2">
                <span>Total after tax</span>
                <span>
                  {new Intl.NumberFormat('id-ID').format(
                    applyTaxOrder.price + applyTaxSelected.reduce((acc: number, t: any) => acc + applyTaxOrder.price * (t.value / 100), 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {applyTaxError
            ? <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
            : null
          }

          <div className="flex flex-row gap-3 modal-action mt-0">
            <button
              type="button"
              className="btn flex-1"
              onClick={() => {
                applyTaxModalRef.current?.close()
                setApplyTaxOrder(null)
                setApplyTaxSelected([])
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={applyTaxLoading}
              onClick={submitApplyTax}
              className="btn bg-indigo-700 text-white flex-1"
            >
              {applyTaxLoading
                ? <span className="loading loading-spinner loading-sm"></span>
                : 'Apply Tax'
              }
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={editRef} className="modal h-full text-black">
        <form onSubmit={editOrderForm.handleSubmit(submitEditOrder)} className="h-86 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Edit Service Order</h3>

          <input type="hidden" {...editOrderForm.register("_id")} />

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Customer</label>
            <input
              list="edit-customers"
              {...editOrderForm.register("customerName")}
              type="text"
              className="input flex-1"
              required
            />
            <datalist id="edit-customers">
              {customers.map((customer: any) => (
                <option key={customer._id} value={customer.bussinessName} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Address</label>
            <input {...editOrderForm.register("address")} type="text" className="input flex-1" />
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Product</label>
            <select {...editOrderForm.register("productId")} className="select flex-1" required>
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p._id} value={`${p._id}`}>{p.productName}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Contract Type</label>
            <select {...editOrderForm.register("contractType")} className="select flex-1">
              <option value="Full">Full</option>
              <option value="Trial">Trial</option>
              <option value="One Time">One Time</option>
            </select>
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Frequency</label>
            <select {...editOrderForm.register("frequency")} className="select flex-1">
              <option value="Month">Month</option>
              <option value="Once">Once</option>
            </select>
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Qty</label>
            <input {...editOrderForm.register("qty")} type="number" className="input flex-1" />
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Range</label>
            <input {...editOrderForm.register("range")} type="number" className="input flex-1" />
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Price</label>
            <input {...editOrderForm.register("price")} type="number" className="input flex-1" />
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Billed</label>
            <input {...editOrderForm.register("billed")} type="text" className="input flex-1" />
          </div>

          <div className="flex flex-row items-center gap-3">
            <label className="w-[110px] text-sm font-medium">Contract Doc</label>
            <input
              onChange={(e) => setEditContract(e.target.files?.[0] ?? null)}
              type="file"
              className="file-input flex-1"
            />
          </div>

          {updateDirectServiceOrderFn.noResult || updateDirectServiceOrderFn.error ? <label className="input-validator text-red-900">something went wrong</label> : <></>}

          <div className="flex flex-row gap-3 modal-action mt-4">
            <button type="button" className="btn flex-1" onClick={() => editRef.current?.close()}>Cancel</button>
            <button type="submit" disabled={updateDirectServiceOrderFn.loading} className="btn bg-blue-900 text-white flex-1">
              {updateDirectServiceOrderFn.loading ? <span className="loading loading-spinner loading-sm"></span> : "Save Changes"}
            </button>
          </div>
        </form>
      </dialog>

      {/* Close Order Confirmation Modal */}
      <dialog ref={closeConfirmRef} className="modal h-full text-black">
        <div className="modal-box flex flex-col gap-4 max-w-sm">
          <h3 className="text-lg font-bold">
            {closeTargetOrder?.status === 'closed' ? 'Reopen Order?' : 'Close Order?'}
          </h3>
          {closeTargetOrder && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm flex flex-col gap-1">
              <span className="font-semibold text-slate-700">{closeTargetOrder.salesOrderNumber}</span>
              <span className="text-slate-500">{closeTargetOrder.customCustomer?.name || closeTargetOrder.customerId}</span>
            </div>
          )}
          <p className="text-sm text-slate-600">
            {closeTargetOrder?.status === 'closed'
              ? 'Order ini akan dibuka kembali dan menjadi aktif.'
              : 'Order yang ditutup tidak akan muncul di daftar aktif. Anda masih bisa melihatnya di filter "Closed".'}
          </p>
          {closeOrderFn.error && (
            <p className="text-red-600 text-sm">Terjadi kesalahan. Silakan coba lagi.</p>
          )}
          <div className="flex flex-row gap-3 modal-action mt-0">
            <button
              type="button"
              className="btn flex-1"
              onClick={() => {
                closeConfirmRef.current?.close()
                setCloseTargetOrder(null)
              }}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={closeOrderFn.loading}
              onClick={confirmCloseOrder}
              className={`btn flex-1 text-white ${closeTargetOrder?.status === 'closed' ? 'bg-green-700' : 'bg-red-700'}`}
            >
              {closeOrderFn.loading
                ? <span className="loading loading-spinner loading-sm"></span>
                : closeTargetOrder?.status === 'closed' ? 'Buka Kembali' : 'Tutup Order'
              }
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}