"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Link from "next/link";

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState, useMemo } from 'react'

export default function Order() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult, setSearchResult] = useState<any[]>([])
  const modalRef = useRef<HTMLDialogElement>(null)
  const cartRef = useRef<HTMLDialogElement>(null)
  const customRef = useRef<HTMLDialogElement>(null)
  const [cart, setCart] = useState<any[]>([])
  const [discount, setDiscount] = useState<string>("0")
  const [directSellMode, setDirectSellMode] = useState<boolean>(false)
  const [customerName, setCustomerName] = useState<string>("")
  const [customerAddress, setCustomerAddress] = useState<string>("")
  const [debt, setDebt] = useState<string>('no')
  const [payTerm, setPayTerm] = useState<number>(0)
  const [payAmt, setPayAmt] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')

  const newOrderForm = useForm()
  const router = useRouter()


  const tax = useMemo(() => {
    const subtotals = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const _discount = parseInt(c.discountValue)
        return (price * qty) - ((_discount / 100) * (price * qty))
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const _discount = parseInt(c.discountValue) * qty
        return (price * qty) - _discount
      }
    })

    const total = subtotals.reduce((a, b) => a + b, 0)

    const ppns = cart.map(c => {
      if (cart.length === 1) {
        if (c.tax === 'PPN11') {
          if (discount.includes("%")) {
            return (total - (total * (parseInt(discount) / 100))) * 0.11 // works
          }
          else {
            return (total - parseInt(discount)) * 0.11 // works
          }
        }
        else {
          return 0
        }
      }
      else {
        if (c.tax === 'PPN11') {
          if (discount.includes("%")) {
            return ((c.price - c.discountValue) - ((c.price - c.discountValue) * (parseInt(discount) / 100))) * 0.11 // works
          }
          else {
            const proportion = (c.price - c.discountValue) / total
            const proportionValue = parseInt(discount) * proportion
            return ((c.price - c.discountValue) - proportionValue) * 0.11 // works
          }
        }
        else {
          return 0
        }
      }
    })

    const _ppn = ppns.reduce((a, b) => a + b, 0)

    if (discount === 0) {
      return 0
    }
    else {
      return (Math.round(_ppn as number))
    }

  }, [discount, cart])

  const _total = useMemo(() => {
    const subTotal = getSubTotal(cart)
    const totalDiscount = getTotalDiscount(cart, discount)
    return subTotal - totalDiscount + tax
  }, [discount, cart])

  const total = useMemo(() => {
    const subTotal = getSubTotal(cart)
    const totalDiscount = getTotalDiscount(cart, discount)
    return subTotal - totalDiscount + tax
  }, [tax])

  const payAmount = useMemo(() => tax > 0 ? total : _total
    , [total, _total])



  const addOrderFn = useFetch<any, any>({
    url: '/api/web/order',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const directSellFn = useFetch<any, any>({
    url: '/api/web/csale',
    method: 'POST',
    onError: (m) => {
      alert('x')
    }
  })
  const getLocationsFn = useFetch<any, any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET',
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

  const getProductsFn = useFetch<any, any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getDSaleStockFn = useFetch<any, any>({
    url: `/api/web/csale`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  async function addToCart(data: any) {
    console.log(data)


    const tax = data.ppn === 'yes' ? 'PPN11' : 'PPN00'

    const [_id, name, limit, price, discountType, discountValue] = data.product.split('/')

    const item = {
      product: data.product,
      qty: parseInt(data.qty),
      batches: data.batches,
      price: parseInt(data.qty) * parseInt(price),
      discountType: discountType,
      discountValue: parseInt(discountValue),
      tax: tax,
      debt: data.debt,
      locationId: data.locationId
    }

    console.log(
      item
    )

    if (data.qty > parseInt(limit)) {
      alert('stock not enough')
    }
    else {
      const [filter] = cart.filter(c => {
        return c.product.includes(`${_id}/${name}`)
      })

      if (filter) {
        const index = cart.findIndex(c => {
          return c.product.includes(`${_id}/${name}`)
        })

        cart[index] = {
          ...item
        }
        setCart([
          ...cart
        ])
      }
      else {
        await setCart(
          [
            item,
            ...cart
          ]
        )
      }
    }
  }

  function submit(data: any) {
    const formData = new FormData()
    formData.append("id", masterAccountId)
    formData.append("contract", contract as any)
    formData.append("attachment", attachment as any)
    formData.append("productType", "good")

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

  async function attachmentSubmit(e: any) {
    const file = e.target.files[0]
    setAttachment(file)
    setAttachmentFileName(file)
  }

  async function contractSubmit(e: any) {
    const file = e.target.files[0]
    setContract(file)
    setContractFileName(file)
  }

  async function onProdChg(e: any) {
    const url = `/api/web/csale?&prod=${e.target.value.split('/')[0]}`

    getDSaleStockFn.fn(url, JSON.stringify({}), result => { })
  }

  function cartToggle(dst: string) {
    if (dst === "toCart") {
      customRef.current?.close()
      cartRef.current?.showModal()
    }
    else {
      cartRef.current?.close()
      customRef.current?.showModal()
    }
  }


  function getTotalDiscount(cart: any[], d: string) {
    const discount = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const discount = parseInt(c.discountValue)
        return (discount / 100) * (price * qty)
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const discount = parseInt(c.discountValue)
        return discount * qty
      }
    })

    const subtotals = cart.map((c) => {
      if (c.discountType === 'percent') {
        const price = parseInt(c.product.split('/')[3])
        const qty = parseInt(c.qty)
        const _discount = parseInt(c.discountValue)
        return (price * qty) - ((_discount / 100) * (price * qty))
      }

      if (c.discountType === 'fixed') {
        const qty = parseInt(c.qty)
        const price = parseInt(c.product.split('/')[3])
        const _discount = parseInt(c.discountValue) * qty
        return (price * qty) - _discount
      }
    })

    const total = subtotals.reduce((a, b) => a + b, 0)

    const _discount = discount.reduce((a, b) => {
      return a + b
    }, 0)

    if (d.includes("%")) {
      return _discount + (total * (parseInt(d) / 100))
    }
    else {
      return _discount + parseInt(d)
    }
  }

  function getSubTotal(cart: any[]) {
    const prices = cart.map((c) => {
      const price = parseInt(c.product.split('/')[3])
      const qty = parseInt(c.qty)
      return price * qty
    })

    return prices.reduce((a, b) => {
      return a + b
    }, 0)
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }


  function done() {
    const discountType = discount.includes("%") ? 'percent' : 'fixed'
    const _payAmt = debt === 'yes' ? payAmt : payAmount
    const discountValue = parseInt(discount)

    const _cart = cart.map(c => {
      const productId = c.product.split("/")[0]
      const qty = c.qty
      const subTotal = qty * c.price

      return {
        productId,
        qty,
        subTotal,
        loc: c.locationId
      }
    })

    const customer = {
      name: customerName,
      address: customerAddress
    }

    const params = JSON.stringify({
      id: masterAccountId,
      cart: _cart,
      discountType,
      discountValue,
      tax,
      total: payAmount, // use payAmount: it picks _total (which tracks cart/discount) when tax === 0
      debt,
      payTerm,
      payAmount: _payAmt,
      paymentMethod,
      customer
    })


    directSellFn.fn('', params, async r => {
      const saleDate = r.saleDate
      const salesOrderNumber = r.salesOrderNumber
      const [{ productId, qty }] = r.cart // (productId)
      const _product = await fetch(`/api/web/product?_id=${productId}`)
      const response = await _product.json()
      const product = r.cart.length > 1 ? 'various item' : response.result
      const variousItem = cart.length > 1 ? true : false
      const customerName = r.customerName
      const customerAddress = r.customerAddress
      const quantity = variousItem ? '?' : qty
      const total = r.total
      const discountType = r.discountType
      const discountValue = r.discountValue
      const taxValue = r.taxValue
      const payTerm = r.payTerm

      const result = {
        saleDate,
        salesOrderNumber,
        product,
        variousItem,
        customerName,
        customerAddress,
        quantity,
        total,
        discountType,
        discountValue,
        taxValue,
        payTerm,
      }

      getOrdersFn.reset(
        [
          result,
          ...getOrdersFn.result
        ]
      )

      setDirectSellMode(
        false
      )

    })
  }


  useEffect(() => {
    if (hasHydrated) {
      const url4 = `/api/web/order?id=${masterAccountId}&type=good`
      const url = `/api/web/products?id=${masterAccountId}&type=good`
      const url2 = `/api/web/location?id=${masterAccountId}`
      const body = JSON.stringify({})

      getProductsFn.fn(url, body, result => {
        console.log(JSON.stringify(result))
      })
      getLocationsFn.fn(url2, body, result => { })
      getOrdersFn.fn(url4, body, (result) => {
        //console.log(result)
      })
    }
  }, [masterAccountId])

  return directSellMode ? (
    <>
      <div className="h-full p-6 flex flex-col gap- text-black">
        <span className="text-2xl">Product Order</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-row relative divide-x">
          <div className="flex flex-col gap-3 divide-y p-3">
            <form className="flex flex-col p-6 gap-3">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Customer</label>
                <input
                  placeholder="quantity"
                  type="text"
                  className="input flex-1"
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Address</label>
                <input
                  placeholder="address"
                  type="text"
                  className="input flex-1"
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Discount</label>
                <input
                  placeholder="discount value" {...newOrderForm.register("discount", { onChange: (e) => setDiscount(e.target.value === '' ? '0' : e.target.value) })}
                  type="text" className="input flex-1"
                />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Debt</label>
                <select {...newOrderForm.register('debt', { onChange: (e) => setDebt(e.target.value) })} className="select w-full">
                  <option>
                    no
                  </option>
                  <option>
                    yes
                  </option>
                </select>
              </div>
              <div className={`flex flex-row items-center gap-3`}>
                <label className="w-[85px]">Payment Method</label>
                <select {...newOrderForm.register('paymentMethod', { onChange: (e) => setPaymentMethod(e.target.value) })} className="select w-full">
                  <option>Cash</option>
                  <option>Bank</option>
                </select>
              </div>
              <div className={`flex flex-row items-center gap-3 ${debt === 'yes' ? '' : 'hidden'}`}>
                <label className="w-[70px]">Pay term</label>
                <label className="input flex-1">
                  <input {...newOrderForm.register('payTerm', { onChange: (e) => setPayTerm(parseInt(e.target.value)) })} type="text" placeholder="pay term" />
                  <span className="badge badge-neutral badge-xs aspect-square">Days</span>
                </label>
              </div>
              <div className={`flex flex-row items-center gap-3 ${debt === 'yes' ? '' : 'hidden'}`}>
                <label className="w-[70px]">Pay Amount</label>
                <input defaultValue={0} placeholder="quantity" {...newOrderForm.register("payAmount", { onChange: (e) => setPayAmt(parseInt(e.target.value)) })} type="text" className="input flex-1" />
              </div>
            </form>
            <form className="flex-1 flex flex-col gap-3 p-6" onSubmit={newOrderForm.handleSubmit(addToCart)}>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Product</label>
                <select {...newOrderForm.register('product', { onChange: onProdChg })} className="select w-full">
                  <option>Available Product:</option>
                  {
                    getProductsFn?.result?.map((p) => {
                      return (
                        <option key={p._id} value={`${p._id}/${p.productName}/${p.remain}/${p.sellingPrice}/${p.discountType}/${p.discountValue}`}>{p.productName}</option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Location</label>
                <select {...newOrderForm.register('locationId')} className="select w-full">
                  <option>Available Location:</option>
                  {
                    getDSaleStockFn?.result?.map((l) => {
                      return (
                        <option key={l._id} value={l._id} >{l.name} ({l.available})</option>
                      )
                    })
                  }
                </select>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Qty</label>
                <input placeholder="quantity" {...newOrderForm.register("qty")} type="text" className="input flex-1" />
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Tax</label>
                <select {...newOrderForm.register('ppn')} className="select w-full">
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
                <button onClick={() => setDirectSellMode(false)} type="button" className="bg-red-900 p-3 rounded-md text-white w-full">
                  cancel
                </button>
              </div>
            </form>

          </div>

          <div className="flex-1 flex flex-col divide-y p-6">
            <div className="p-3">
              <p className="py-4 font-bold text-red-900">Please review your order once more</p>
              <ul className="flex flex-col">
                {
                  cart.map((c) => {
                    return (
                      <li key={generateId()}>{`${c.product.split('/')[1]}@${c.qty}`} ({c.price})</li>
                    )
                  })
                }
              </ul>
            </div>
            <div className="p-3">
              <p>Subtotal : {getSubTotal(cart)}</p>
              <p>Total discount : {getTotalDiscount(cart, discount)}</p>
              <p>Total tax : {tax}</p>
              <p>Total : {tax > 0 ? total : _total}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
    :
    (
      <>
        <div className="h-full p-6 flex flex-col gap-3 text-black">
          <span className="text-2xl">Product Order</span>
          <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
            <div className="flex flex-row">
              <span className="self-center">All order</span>
              <div className="flex flex-row gap-3 ml-auto">
                <button disabled onClick={() => modalRef.current?.showModal()} className="btn m">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add
                </button>
                <button onClick={() => setDirectSellMode(true)} className="btn ml-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Custom
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
                          <th>Sale Date</th>
                          <th>Order Number</th>
                          <th>Product</th>
                          <th>Customer</th>
                          <th>Price</th>
                          <th>Discount</th>
                          <th>Tax</th>
                          <th>Pay Term</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          searchResult.length < 1
                            ?
                            getOrdersFn?.result?.map((x, index) => {
                              return (
                                <tr key={index}>
                                  <td>{x.saleDate}</td>
                                  <td>{x.salesOrderNumber}</td>
                                  <td>{x.variousItem ? 'various item' : x.product.productName}</td>
                                  <td>{x.customCustomer ? x.customCustomer.name : x.customer.bussinessName}</td>
                                  <td>{x.total}</td>
                                  <td>{x.discountType === "percent" ? x.total * (x.discountValue / 100) : x.discountValue}</td>
                                  <td>{x.taxValue}</td>
                                  <td>{x.payTerm} (Days)</td>
                                </tr>
                              )
                            })
                            :
                            searchResult.map((role, index) => {
                              return (
                                <tr key={index}>
                                  <td>{role.name}</td>
                                  <td className="flex flex-row gap-3">
                                    <button className="btn" onClick={() => edit(role._id)}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                      </svg>
                                      Edit
                                    </button>
                                    <button className="btn" onClick={() => del(role._id)}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
            }
            <button className="bg-black text-white rounded-full p-3 absolute right-10 bottom-10">
              <Link href="/sales/xorder">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </Link>
            </button>
          </div>
        </div>
        <dialog ref={modalRef} id="my_modal_1" className="modal h-full text-black">
          <form onSubmit={newOrderForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Make order</h3>
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
              <button className="btn bg-red-900 text-white">Submit</button>
            </div>
          </form>
        </dialog>
        <dialog id="my_modal_3" ref={cartRef} className="modal text-black">
          <div className="modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Cart!</h3>
            <p className="py-4">Please review your order once more</p>
            <ul className="flex flex-col">
              {
                cart.map((c) => {
                  return (
                    <li key={c._id}>{`${c.product.split('/')[1]}@${c.qty}`} ({c.price})</li>
                  )
                })
              }
            </ul>
            <p>===============================</p>
            <div>
              <p>Total price : {getSubTotal(cart)}</p>
              <p>Total discount : {getTotalDiscount(cart, discount)}</p>
              <p>Total tax : {tax}</p>
            </div>
            <form>
              <input
                onChange={(e) => {
                  if (e.target.value === '') {
                    setDiscount(0)
                    getTax(cart)
                  }
                  else {
                    setDiscount(parseInt(e.target.value))
                    getTax(cart)
                  }
                }}
                type="text"
                className="w-[300px] border-2 border-black p-3 rounded-md"
                placeholder="discount value"
              />
            </form>
            <div className="modal-action">
              <button className="btn" onClick={() => cartToggle("toPreorder")}>Back</button>
              <button className="btn">Order</button>
            </div>
          </div>
        </dialog>
        <dialog ref={customRef} id="my_modal_2" className="modal h-full text-black">
          <form onSubmit={newOrderForm.handleSubmit(addToCart)} className="h-120 modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Preorder</h3>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[85px]">Product</label>
              <select {...newOrderForm.register('product', { onChange: onProdChg })} className="select w-full">
                <option>Available Product:</option>
                {
                  getProductsFn?.result?.map((p) => {
                    return (
                      <option key={p._id} value={`${p._id}/${p.productName}/${p.allocated}/${p.sellingPrice}/${p.applicableTax}`}>{p.productName}</option>
                    )
                  })
                }
              </select>
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[85px]">Location</label>
              <select {...newOrderForm.register('locationId')} className="select w-full">
                <option>Available Location:</option>
                {
                  getDSaleStockFn?.result?.map((l) => {
                    return (
                      <option key={l._id} value={l._id}>{l.name} ({l.allocated})</option>
                    )
                  })
                }
              </select>
            </div>
            <div className="flex flex-row items-center gap-3">
              <label className="w-[70px]">Qty</label>
              <input placeholder="quantity" {...newOrderForm.register("qty")} type="text" className="input flex-1" />
            </div>
            {addOrderFn.noResult || addOrderFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
            <div className="flex flex-row gap-3 modal-action">
              <button className="btn bg-red-900 text-white">Add to cart</button>
              <button type="button" onClick={() => cartToggle("toCart")} className="btn bg-red-900 text-white">Cart</button>
            </div>
          </form>
        </dialog>

      </>
    )
}