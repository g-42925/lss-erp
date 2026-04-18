"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'

import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState } from 'react'
import { QQ } from '@/app/types/quotation.type'
import { Product } from '@/app/types/product.type'
import { Customer } from '@/app/types/customer.type'
import { QCart } from '@/app/types/qcart.type'
import { Available } from '@/app/types/available.type'
import { X } from '@/app/types/x.type'

function Q({ toggle, edit }: { toggle: () => void, edit: (x: X) => void }) {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [quotations, setQuotations] = useState<object[]>([])
  const [products, setProducts] = useState<Product[]>([])

  const [searchTerm, setSearchTerm] = useState('')

  const [isDebt, setIsDebt] = useState(false)
  const [method, setMethod] = useState(false)
  const [total, setTotal] = useState(0)

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const orderRef = useRef<HTMLDialogElement>(null)

  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const makeOrderForm = useForm()

  const [selectedQNumber, setSelectedQNumber] = useState('')


  const addQuotationFn = useFetch<QQ, string>({
    url: '/api/web/quotations',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const makeOrderFn = useFetch<any, FormData>({
    url: '/api/web/order',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  function makeOrderSubmit(data: any) {
    const formData = new FormData()
    formData.append("debt", data.debt)
    formData.append("payAmt", data.payAmt)
    formData.append("qNumber", selectedQNumber)
    formData.append("id", masterAccountId)
    formData.append("payTerm", data.payTerm || "")
    formData.append("method", data.paymentMethod)
    if (data.contract && data.contract[0]) {
      formData.append("contract", data.contract[0])
    }
    if (data.attachment && data.attachment[0]) {
      formData.append("attachment", data.attachment[0])
    }

    makeOrderFn.fn('', formData, (result) => {
      orderRef.current?.close()
      alert('Order successfully created!')
    })
  }

  function openMakeOrder(qNumber: string, s: any) {
    setTotal(s.cart.reduce((a: number, b: any) => a + b.subTotal, 0))
    setSelectedQNumber(qNumber)
    makeOrderForm.reset()
    orderRef.current?.showModal()
  }

  const getCustomersFn = useFetch<Customer[], string>({
    url: `/api/web/customers?id=xxx`,
    method: 'GET'
  })

  const getQuotationsFn = useFetch<(QQ & { product: Product, variousItem: boolean, customer: Customer })[], string>({
    url: `/api/web/quotations?id=xxx`,
    method: 'GET'
  })

  const getProductsFn = useFetch<Product[], string>({
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  })



  function editSubmit(data: any) {

  }

  function submit(data: any) {
    const params = JSON.stringify(
      {
        ...data,
        id: masterAccountId,
        productType: 'good'
      }
    )

    addQuotationFn.fn('', params, (result) => {
      const product = products.find((p) => p._id === data.productId)
      const customer = customers.find((c) => c._id === data.customerId)

      const q = {
        ...result,
        product,
        customer
      }

      setQuotations([
        q,
        ...quotations
      ])

      modalRef.current?.close()
    })
  }

  function tax(total: number, cart: { subTotal: number, tax: boolean }[], discountType: string, discountValue: number) {

    const ppns = cart.map(c => {
      if (cart.length < 2) {
        if (c.tax) {
          if (discountValue > 0) {
            if (discountType === "fixed") {
              return (c.subTotal - discountValue) * 0.11
            }
            else {
              return (c.subTotal - (c.subTotal * (discountValue / 100))) * 0.11
            }
          }
          else {
            return c.subTotal * 0.11
          }
        }
        else {
          return 0
        }
      }
      else {
        if (c.tax) {
          if (discountValue > 0) {
            if (discountType === "fixed") {
              const proportion = c.subTotal / total
              const proportionValue = discountValue * proportion
              return (c.subTotal - proportionValue) * 0.11
            }
            else {
              const discount = c.subTotal * (discountValue / 100)
              return (c.subTotal - discount) * 0.11
            }
          }
          else {
            return c.subTotal * 0.11
          }
        }
        else {
          return 0
        }
      }
    })

    return Math.round(ppns.reduce((a, b) => a + b, 0))
  }


  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/quotations?id=${masterAccountId}&type=good`
      const url2 = `/api/web/products?id=${masterAccountId}&type=good`
      const url3 = `/api/web/customers?id=${masterAccountId}`

      const body = JSON.stringify({})

      getCustomersFn.fn(url3, body, (result) => {
        setCustomers(result)
      })

      getQuotationsFn.fn(url, body, (result) => console.log(result))

      getProductsFn.fn(url2, body, (result) => {
        setProducts(result)
      })
    }
  }, [masterAccountId])

  useEffect(() => {
    makeOrderForm.setValue("payAmt", isDebt === "no" ? total : 0);
  }, [isDebt, total]);

  const filteredQuotations = getQuotationsFn?.result?.filter(s => s.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())) || []

  return (
    <>
      <div className="h-full p-6 h-full flex flex-col gap-3 text-black">
        <span className="text-2xl">Product Quotation <span className="text-sm leading-loose"></span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All quotation</span>
            <button onClick={toggle} className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
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
            <input type="search" placeholder="Search Q-Number" className="ml-auto border-1 border-black rounded-md p-3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {
            getQuotationsFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getQuotationsFn.error || getQuotationsFn.noResult
                ?
                <div>
                  <p>{getQuotationsFn.message}</p>
                </div>
                :
                <div>
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Q-Number</th>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th>Discount</th>
                        <th>Tax</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        filteredQuotations.map((s, index: number) => {
                          return (
                            <tr key={index}>
                              <td>{s.quotationNumber}</td>
                              <td>{s.variousItem ? "various item" : s.product.productName}</td>
                              <td>{s.customer.bussinessName}</td>
                              <td>{s.variousItem ? "?" : s.cart[0].qty} {s.variousItem ? "" : `${s.product.warehouseUnit}`}</td>
                              <td>{s.price}</td>
                              <td>{s.discountType === "percent" ? `${s.discountValue}%` : s.discountValue}</td>
                              <td>{tax(s.price, s.cart, s.discountType, s.discountValue)}</td>
                              <td className="flex flex-row gap-2">
                                <button onClick={() => edit(s)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                  </svg>
                                </button>
                                <button onClick={() => openMakeOrder(s.quotationNumber, s)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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
      <dialog ref={editRef} id="my_modal_1" className="modal h-full text-black">
        <form onSubmit={editQuotationForm.handleSubmit(editSubmit)} className="h-100 w-[500px] modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make quotation</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Product</label>
            <select disabled {...editQuotationForm.register("productId")} className="select flex-1">
              {
                products.map((p) => {
                  return <option value={p._id} key={p._id}>{p.productName} ({p.warehouseUnit})</option>
                })
              }
            </select>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Customer</label>
            <select {...editQuotationForm.register("customerId")} className="select flex-1">
              <option>...</option>
              {
                customers.map((c) => {
                  return <option value={c._id} key={c._id}>{c.bussinessName}</option>
                })
              }
            </select>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quantity</label>
            <input {...editQuotationForm.register("qty")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Expired</label>
            <input {...editQuotationForm.register("expiredDate")} type="date" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Discount</label>
            <input {...editQuotationForm.register("discount")} type="text" className="input flex-1" />
          </div>
          {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full text-black">
        <form onSubmit={newQuotationForm.handleSubmit(submit)} className="h-100 w-[500px] modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make quotation</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Product</label>
            <select {...newQuotationForm.register("productId")} className="select flex-1">
              {
                products.map((p) => {
                  return <option value={p._id} key={p._id}>{p.productName} (${p.warehouseUnit})</option>
                })
              }
            </select>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Customer</label>
            <select {...newQuotationForm.register("customerId")} className="select flex-1">
              <option>...</option>
              {
                customers.map((c) => {
                  return <option value={c._id} key={c._id}>{c.bussinessName}</option>
                })
              }
            </select>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quantity</label>
            <input {...newQuotationForm.register("qty")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Expired</label>
            <input {...newQuotationForm.register("expiredDate")} type="date" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Discount</label>
            <input {...newQuotationForm.register("discount")} type="text" className="input flex-1" />
          </div>
          {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>
      <dialog ref={orderRef} id="make_order_modal" className="modal h-full text-black">
        <form onSubmit={makeOrderForm.handleSubmit(makeOrderSubmit)} className="h-96 w-[500px] modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make Order for {selectedQNumber}</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[100px]">Pay Term</label>
            <label className="input flex-1">
              <input {...makeOrderForm.register("payTerm", { required: true })} type="text" placeholder="pay term" />
              <span className="badge badge-neutral badge-xs aspect-square">Days</span>
            </label>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[100px]">Debt</label>
            <select {...makeOrderForm.register("debt", { onChange: (e) => setIsDebt(e.target.value) })} className="select flex-1 border-gray-300 border">
              <option value="no">No</option>
              <option selected value="yes">Yes</option>
            </select>
          </div>
          <div className={`flex flex-row items-center gap-3`}>
            <label className="w-[100px]">Pay Amount</label>
            <input {...makeOrderForm.register("payAmt", { onChange: (e) => e.target.value > 0 ? setMethod(true) : setMethod(false) })} type="text" className="input flex-1 border-gray-300 border" placeholder="e.g. 10000" />
          </div>
          <div className={`flex flex-row items-center gap-3`}>
            <label className="w-[100px]">payment method</label>
            <select {...makeOrderForm.register("paymentMethod")} className="select flex-1 border-gray-300 border">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          {makeOrderFn.loading && <span className="loading loading-spinner"></span>}
          {makeOrderFn.noResult || makeOrderFn.error ? <label className="input-validator text-red-900" htmlFor="role">{makeOrderFn.message}</label> : null}
          <div className="flex flex-row gap-3 modal-action">
            <button type="submit" className="btn bg-red-900 text-white" disabled={makeOrderFn.loading}>Submit</button>
            <button type="button" className="btn" onClick={() => orderRef.current?.close()}>Cancel</button>
          </div>
        </form>
      </dialog>
      <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
        <Link href="/sales/qservices">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>
    </>
  )
}

function Edit({ customers, product, getAvailableList, availableList, x, pop }: { x: X, customers: Customer[], product: Product[], getAvailableList: () => void, availableList: any[], pop: () => void }) {
  const masterAccountId = useAuth((state) => state.masterAccountId)

  const [cart, setCart] = useState<QCart[]>([])
  const [customer, setCustomer] = useState<string>(x.customerId)
  const [discount, setDiscount] = useState<string>(x.discountType === 'percent' ? `${x.discountValue}%` : `${x.discountValue}`)

  const editQuotationForm = useForm({})

  const editQuotationFn = useFetch<QQ, string>({
    url: '/api/web/quotations',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  function addToCart(data: any) {
    const [productId, productName, sellingPrice, discountType, discountValue] = data.product.split('/')

    const product = { productId, productName }
    const tax = data.tax === 'yes' ? true : false
    const subTotal = discountType === "percent" ? (parseInt(sellingPrice) * data.qty) * (parseInt(discountValue) / 100) : (parseInt(sellingPrice) * data.qty) - (parseInt(discountValue) * data.qty)
    const [filter] = cart.filter(c => c.product.productId === productId)

    const item = { product: { ...product, qty: data.qty }, tax, subTotal }

    if (filter) {
      const newCart = cart.filter(c => c.product.productId != productId)

      setCart(
        [
          item,
          ...newCart
        ]
      )
    }
    else {
      setCart(
        [
          item,
          ...cart
        ]
      )
    }
  }

  function done() {
    const id = masterAccountId
    const customerId = customer
    const discountType = discount.includes("%") ? 'percent' : 'fixed'
    const discountValue = discount.includes("%") ? parseInt(discount) : parseInt(discount)

    const _cart = cart.map((c) => {
      return {
        productId: c.product.productId,
        qty: c.product.qty,
        tax: c.tax,
        subTotal: c.subTotal
      }
    })

    const params = {
      _id: x._id,
      customerId,
      discountType,
      discountValue,
      cart: _cart,
      id,
    }


    editQuotationFn.fn('', JSON.stringify(params), r => {
      pop()
    })
  }

  function parse(c: { product: { productId: string, productName: string, qty: number }, subTotal: number, tax: boolean }) {
    const [p] = product.filter(p => p._id === c.product.productId)

    return `${p.productName}@${c.product.qty} ${c.tax ? '(with tax)' : ''}`
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.product.productId !== productId))
  }

  useEffect(() => {
    if (x?.cart) {
      setCart(
        x.cart.map(c => ({
          product: {
            productId: c.productId,
            qty: c.qty
          },
          tax: c.tax,
          subTotal: c.subTotal
        }))
      );
    }
  }, [x.cart]);

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Product Quotation (Edit)</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-row relative divide-x">
          <div className="flex flex-col gap-3 divide-y p-3">
            <form className="flex flex-col p-6 gap-3">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Customer</label>
                <select value={x.customerId} {...editQuotationForm.register('customerId', { onChange: (e) => setCustomer(e.target.value) })} className="select w-full">
                  <option>Available Customer:</option>
                  {
                    customers?.map((c) => {
                      return (
                        <option key={c._id} value={c._id}>
                          {c.bussinessName}
                        </option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Discount</label>
                <input defaultValue={x.discountType === 'percent' ? `${x.discountValue}%` : x.discountValue} {...editQuotationForm.register('discount', { onChange: (e) => setDiscount(e.target.value) })} placeholder="quantity" type="text" className="input flex-1" />
              </div>
            </form>
            <form onSubmit={editQuotationForm.handleSubmit(addToCart)} className="flex-1 flex flex-col gap-3 p-6">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Product</label>
                <select {...editQuotationForm.register('product', { onChange: (e) => getAvailableList(e.target.value.split('/')[0]) })} className="select w-full">
                  <option>Available Product:</option>
                  {
                    product?.map((p) => {
                      return (<option key={p._id} value={`${p._id}/${p.productName}/${p.sellingPrice}/${p.discountType}/${p.discountValue}`}>{p.productName} ({p.warehouseUnit})</option>)
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Location</label>
                <select {...editQuotationForm.register('locationId')} className="select w-full">
                  <option>Available Location:</option>
                  {
                    availableList?.map((l) => {
                      return (
                        <option key={l._id}>{l.locationName} ({l.remain})</option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Qty</label>
                <input {...editQuotationForm.register('qty')} placeholder="quantity" type="text" className="input flex-1" />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Tax</label>
                <select {...editQuotationForm.register('tax')} className="select w-full">
                  <option>
                    yes
                  </option>
                  <option>
                    no
                  </option>
                </select>
              </div>
              <div className="flex flex-row gap-2 mt-6">
                <button type="submit" className="bg-black p-3 rounded-md text-white w-full">
                  add
                </button>
                <button onClick={done} type="button" className="bg-black p-3 rounded-md text-white w-full">
                  done
                </button>
                <button onClick={done} type="button" className="bg-red-900 p-3 rounded-md text-white w-full">
                  cancel
                </button>
              </div>
            </form>
          </div>
          <div className="flex-1 flex flex-col divide-y p-6">
            <div className="p-3">
              <p className="py-4 font-bold text-red-900">Please review your quotation once more</p>
              <ul className="flex flex-col gap-2">
                {
                  cart.map(c => {
                    return (
                      <li key={c.product.productId} className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
                        <span>{parse(c)}</span>
                        <button type="button" onClick={() => removeFromCart(c.product.productId)} className="bg-red-900 border-none p-2 rounded-md text-white hover:bg-red-800">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </li>
                    )
                  })
                }
              </ul>
            </div>
            <div className="p-3">
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Stock({ customers, pop, product, getAvailableList, availableList }: { customers: Customer[], pop: () => void, product: Product[], getAvailableList: (id: string) => void, availableList: any[] }) {
  const masterAccountId = useAuth((state) => state.masterAccountId)

  const [cart, setCart] = useState<QCart[]>([])
  const [customer, setCustomer] = useState<Customer[]>([])
  const [discount, setDiscount] = useState<string>('')

  const newQuotationForm = useForm()

  function tax(total: number, cart: { subTotal: number, tax: boolean }[], discountType: string, discountValue: number) {

    const ppns = cart.map(c => {
      if (cart.length < 2) {
        if (c.tax) {
          if (discountValue > 0) {
            if (discountType === "fixed") {
              return (c.subTotal - discountValue) * 0.11
            }
            else {
              return (c.subTotal - (c.subTotal * (discountValue / 100))) * 0.11
            }
          }
          else {
            return c.subTotal * 0.11
          }
        }
        else {
          return 0
        }
      }
      else {
        if (c.tax) {
          if (discountValue > 0) {
            if (discountType === "fixed") {
              const proportion = c.subTotal / total
              const proportionValue = discountValue * proportion
              return (c.subTotal - proportionValue) * 0.11
            }
            else {
              const discount = c.subTotal * (discountValue / 100)
              return (c.subTotal - discount) * 0.11
            }
          }
          else {
            return c.subTotal * 0.11
          }
        }
        else {
          return 0
        }
      }
    })

    return Math.round(ppns.reduce((a, b) => a + b, 0))
  }

  const addQuotationFn = useFetch<QQ, string>({
    url: '/api/web/quotations',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  function addToCart(data: any) {
    const [productId, productName, sellingPrice, discountType, discountValue] = data.product.split('/')

    const product = { productId, productName }
    const tax = data.tax === 'yes' ? true : false
    const subTotal = discountType === "percent" ? (parseInt(sellingPrice) * data.qty) * (parseInt(discountValue) / 100) : (parseInt(sellingPrice) * data.qty) - (parseInt(discountValue) * data.qty)
    const [filter] = cart.filter(c => c.product.productId === productId)

    const item = { product: { ...product, qty: data.qty }, tax, subTotal }

    if (filter) {
      const newCart = cart.filter(c => c.product.productId != productId)

      setCart(
        [
          item,
          ...newCart
        ]
      )
    }
    else {
      setCart(
        [
          item,
          ...cart
        ]
      )
    }
  }

  function done() {
    const id = masterAccountId
    const customerId = customer
    const discountType = discount.includes("%") ? 'percent' : 'fixed'
    const discountValue = discount.includes("%") ? parseInt(discount) : parseInt(discount)

    const _cart = cart.map((c) => {
      return {
        productId: c.product.productId,
        qty: c.product.qty,
        tax: c.tax,
        subTotal: c.subTotal
      }
    })

    const total = cart.reduce((a, b) => a + b.subTotal, 0)

    const _c = _cart.map((c) => {
      return {
        subTotal: c.subTotal,
        tax: c.tax as boolean
      }
    })

    const taxValue = tax(total, _c, discountType, discountValue)

    const params = {
      productType: 'good',
      taxValue,
      customerId,
      discountType,
      discountValue,
      cart: _cart,
      id,
    }

    addQuotationFn.fn('', JSON.stringify(params), r => {
      pop()
    })
  }

  function removeFromCart(productId: string) {
    setCart(cart.filter(c => c.product.productId !== productId))
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Product Quotation</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-row relative divide-x">
          <div className="flex flex-col gap-3 divide-y p-3">
            <form className="flex flex-col p-6 gap-3">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Customer</label>
                <select {...newQuotationForm.register('customerId', { onChange: (e) => setCustomer(e.target.value) })} className="select w-full">
                  <option>Available Customer:</option>
                  {
                    customers?.map((c) => {
                      return (
                        <option key={c._id} value={c._id}>
                          {c.bussinessName}
                        </option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Discount</label>
                <input {...newQuotationForm.register('discount', { onChange: (e) => setDiscount(e.target.value) })} placeholder="quantity" type="text" className="input flex-1" />
              </div>
            </form>
            <form onSubmit={newQuotationForm.handleSubmit(addToCart)} className="flex-1 flex flex-col gap-3 p-6">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Product</label>
                <select {...newQuotationForm.register('product', { onChange: (e) => getAvailableList(e.target.value.split('/')[0]) })} className="select w-full">
                  <option>Available Product:</option>
                  {
                    product?.map((p) => {
                      return (<option key={p._id} value={`${p._id}/${p.productName}/${p.sellingPrice}/${p.discountType}/${p.discountValue}`}>{p.productName} ({p.warehouseUnit})</option>)
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Location</label>
                <select {...newQuotationForm.register('locationId')} className="select w-full">
                  <option>Available Location:</option>
                  {
                    availableList?.map((l) => {
                      return (
                        <option key={l._id}>{l.locationName} ({l.remain})</option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Qty</label>
                <input {...newQuotationForm.register('qty')} placeholder="quantity" type="text" className="input flex-1" />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Tax</label>
                <select {...newQuotationForm.register('tax')} className="select w-full">
                  <option>
                    yes
                  </option>
                  <option>
                    no
                  </option>
                </select>
              </div>
              <div className="flex flex-row gap-2 mt-6">
                <button type="submit" className="bg-black p-3 rounded-md text-white w-full">
                  add
                </button>
                <button onClick={done} type="button" className="bg-black p-3 rounded-md text-white w-full">
                  done
                </button>
                <button onClick={pop} type="button" className="bg-red-900 p-3 rounded-md text-white w-full">
                  cancel
                </button>
              </div>
            </form>
          </div>
          <div className="flex-1 flex flex-col divide-y p-6">
            <div className="p-3">
              <p className="py-4 font-bold text-red-900">Please review your quotation once more</p>
              <ul className="flex flex-col gap-2">
                {
                  cart.map(c => {
                    return (
                      <li key={c.product.productId} className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
                        <span>{c.product.productName}@{c.product.qty} {c.tax ? '(with tax)' : ''}</span>
                        <button type="button" onClick={() => removeFromCart(c.product.productId)} className="bg-red-900 border-none p-2 rounded-md text-white hover:bg-red-800">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </li>
                    )
                  })
                }
              </ul>
            </div>
            <div className="p-3">
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Quotation() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [onQMode, setOnQMode] = useState<boolean>(false)
  const [onEditMode, setOnEditMode] = useState<boolean>(false)
  const [availableList, setAvailableList] = useState<Available[]>()
  const [x, setX] = useState<X | null>(null)

  const getProductsFn = useFetch<Product[], string>({
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  })

  const getStockFn = useFetch<Available[], string>({
    url: `/api/web/stock`,
    method: 'GET'
  })

  const getCustomersFn = useFetch<Customer[], string>({
    url: `/api/web/customers?id=xxx`,
    method: 'GET'
  })

  function toggle() {
    setOnQMode(!onQMode)
  }

  function edit(x: X) {
    setX(x)
    setOnEditMode(!onEditMode)
  }

  useEffect(() => {
    if (hasHydrated) {
      const url2 = `/api/web/products?id=${masterAccountId}&type=good`
      const url3 = `/api/web/stock?id=${masterAccountId}`
      const url4 = `/api/web/customers?id=${masterAccountId}`

      const body = JSON.stringify({})

      getProductsFn.fn(url2, body, _ => { })
      getStockFn.fn(url3, body, _ => { })
      getCustomersFn.fn(url4, body, _ => { })
    }
  }, [masterAccountId])

  function getAvailableList(v: string) {
    const list = getStockFn?.result?.filter(s => {
      return s._id.productId === v
    })

    setAvailableList(
      list
    )
  }

  if (!onQMode) {
    if (onEditMode) {
      return (
        <Edit
          availableList={availableList as Available[]}
          getAvailableList={getAvailableList as () => void}
          product={getProductsFn.result as Product[]}
          customers={getCustomersFn.result as Customer[]}
          pop={() => setOnEditMode(false)}
          x={x as X}
        />
      )
    }
    return (
      <Q
        edit={edit}
        toggle={toggle}
      />
    )
  }
  else {
    return (
      <Stock
        availableList={availableList as Available[]}
        getAvailableList={getAvailableList}
        product={getProductsFn.result as Product[]}
        customers={getCustomersFn.result as Customer[]}
        pop={toggle}
      />
    )
  }
}