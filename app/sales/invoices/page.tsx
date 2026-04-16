"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Sidebar from '@/components/sidebar'
import Link from "next/link";

import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState } from 'react'

export default function Invoices() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [contract, setContract] = useState<File | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [contractFileName, setContractFileName] = useState<File | null>(null)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentFileName, setAttachmentFileName] = useState<File | null>(null)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const invoiceModalRef = useRef<HTMLDialogElement>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

  function openInvoice(invoice: any) {
    setSelectedInvoice(invoice)
    invoiceModalRef.current?.showModal()
  }


  const newInvoiceForm = useForm()
  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()

  const addInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const getProductsFn = useFetch<any, any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  });

  const getInvoicesFn = useFetch<any, any>({
    url: `/api/web/orders?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })


  function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
      invoiceType: 'product'
    })
    addInvoiceFn.fn('', body, (i) => {
      setInvoices([
        i,
        ...invoices
      ])
      modalRef.current?.close()
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
      const url4 = `/api/web/invoice?id=${masterAccountId}&type=product`
      const url5 = `/api/web/products?id=${masterAccountId}&type=good`

      const body = JSON.stringify({})

      getInvoicesFn.fn(url4, body, (result) => {
        console.log(result)
      })

      getProductsFn.fn(url5, body, (result: any) => {
        setProducts(result)
      })
    }
  }, [masterAccountId])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 print:hidden">
        <span className="text-2xl">Invoices</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All invoices</span>
            <button disabled onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
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
            <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
          </div>
          {
            getInvoicesFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getInvoicesFn.error || getInvoicesFn.noResult
                ?
                <div>
                  <p>{getInvoicesFn.message}</p>
                </div>
                :
                <div>
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>date</th>
                        <th>invoice number</th>
                        <th>sales order number</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Value</th>
                        <th>pay amount</th>
                        <th>paid</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody className="text-center">
                      {
                        searchResult.length < 1
                          ?
                          getInvoicesFn?.result?.map((s, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(s.date).toLocaleDateString('id-ID')}</td>
                                <td>{s.invoiceNumber}</td>
                                <td>{s.salesOrderNumber}</td>
                                <td>{s.order.customerName ?? s.order.customer.bussinessName}</td>
                                <td>{s.variousItem ? s.product : s.product.productName}</td>
                                <td>{s.order.total}</td>
                                <td>{s.payAmount}</td>
                                <td>{s.paid ? 'yes' : 'no'}</td>
                                <td>
                                  <button onClick={() => openInvoice(s)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                      <path fillRule="evenodd" d="M7.875 1.5C6.839 1.5 6 2.34 6 3.375v2.99c-.426.053-.851.11-1.274.174-1.454.218-2.476 1.483-2.476 2.917v6.294a3 3 0 0 0 3 3h.27l-.155 1.705A1.875 1.875 0 0 0 7.232 22.5h9.536a1.875 1.875 0 0 0 1.867-2.045l-.155-1.705h.27a3 3 0 0 0 3-3V9.456c0-1.434-1.022-2.7-2.476-2.917A48.716 48.716 0 0 0 18 6.366V3.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM16.5 6.205v-2.83A.375.375 0 0 0 16.125 3h-8.25a.375.375 0 0 0-.375.375v2.83a49.353 49.353 0 0 1 9 0Zm-.217 8.265c.178.018.317.16.333.337l.526 5.784a.375.375 0 0 1-.374.409H7.232a.375.375 0 0 1-.374-.409l.526-5.784a.373.373 0 0 1 .333-.337 41.741 41.741 0 0 1 8.566 0Zm.967-3.97a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H18a.75.75 0 0 1-.75-.75V10.5ZM15 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V10.5a.75.75 0 0 0-.75-.75H15Z" clipRule="evenodd" />
                                    </svg>
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
                                  <button className="btn" onClick={() => edit(role._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button className="btn">
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
            <Link href="/sales/xinvoices">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>
        </div>
      </div>
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full">
        <form onSubmit={newInvoiceForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make invoice</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Sales Order Number</label>
            <input {...newInvoiceForm.register("salesOrderNumber")} type="text" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Pay Amount</label>
            <label className="input flex-1">
              <input {...newInvoiceForm.register('payAmount')} type="text" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Paid</label>
            <select {...newInvoiceForm.register("paid")} className="select flex-1">
              <option>
                false
              </option>
              <option>
                true
              </option>
            </select>
          </div>
          {addInvoiceFn.noResult || addInvoiceFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>

      <dialog ref={invoiceModalRef} className="modal h-full print:block print:opacity-100 print:pointer-events-auto print:visible">
        <div className="modal-box w-11/12 max-w-3xl flex flex-col gap-6 print:max-w-full print:w-full print:border-none print:shadow-none print:m-0 print:p-0 print:bg-white print:text-black">
          <div className="flex justify-between items-start border-b pb-4 print:border-b-2 print:border-gray-200">
            <div>
              <h2 className="text-3xl font-bold uppercase tracking-widest text-gray-800">Invoice</h2>
              <p className="text-sm text-gray-500 mt-1">Order # {selectedInvoice?.salesOrderNumber}</p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg text-gray-800">LSS ERP</h3>
              <p className="text-sm text-gray-500">lss-erp@example.com</p>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Billed To</p>
              <h4 className="font-bold text-gray-800">{selectedInvoice?.order?.customerName ?? selectedInvoice?.order?.customer?.bussinessName}</h4>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Invoice Info</p>
              <p className="text-sm text-gray-800"><span className="font-bold">No:</span> {selectedInvoice?.invoiceNumber}</p>
              <p className="text-sm text-gray-600"><span className="font-bold">Date:</span> {selectedInvoice ? new Date(selectedInvoice.date).toLocaleDateString('id-ID') : ''}</p>
              <p className="text-sm mt-1">
                <span className={`px-2 py-1 text-xs font-bold rounded print:border print:border-black print:text-black ${selectedInvoice?.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedInvoice?.paid ? 'PAID' : 'UNPAID'}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2 text-sm text-gray-600 uppercase">Product</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="border-b border-gray-200">
                {selectedInvoice?.variousItem && selectedInvoice?.order?.cart?.length > 1 ? (
                  selectedInvoice.order.cart.map((cartItem: any, idx: number) => {
                    const matchedProduct = products.find(p => p._id === cartItem.productId)
                    return (
                      <tr key={idx}>
                        <td className="py-4 text-gray-800">{matchedProduct ? matchedProduct.productName : 'Unknown Product'} <span className="text-gray-500 whitespace-nowrap ml-2">x{cartItem.qty}</span></td>
                        <td className="py-4 text-gray-800 text-right font-medium">{Number(cartItem.subTotal)?.toLocaleString('id-ID')}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td className="py-4 text-gray-800">{selectedInvoice?.product?.productName}</td>
                    <td className="py-4 text-gray-800 text-right font-medium">{Number(selectedInvoice?.order?.total)?.toLocaleString('id-ID')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-1/2">
              <div className="flex justify-between py-2 border-b print:border-gray-200">
                <span className="font-bold text-gray-700">Subtotal</span>
                <span className="text-gray-800">{Number(selectedInvoice?.order?.total)?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-2 border-b print:border-gray-200">
                <span className="font-bold text-gray-700">Paid Amount</span>
                <span className="text-gray-800">{Number(selectedInvoice?.payAmount)?.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between py-2 text-lg">
                <span className="font-bold text-gray-800">Remaining</span>
                <span className="font-bold text-gray-800">
                  {(Number(selectedInvoice?.order?.total || 0) - Number(selectedInvoice?.payAmount || 0)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-action print:hidden">
            <button type="button" onClick={(e) => { e.preventDefault(); window.print(); }} className="btn bg-black text-white px-6 hover:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0v-2.941c0-1.13.91-2.046 2.046-2.046h6.408c1.135 0 2.046.915 2.046 2.046v2.941Z" />
              </svg>
              Print
            </button>
            <button type="button" onClick={() => invoiceModalRef.current?.close()} className="btn">Close</button>
          </div>
        </div>
      </dialog>
    </>
  )
}