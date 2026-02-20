"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Sidebar from '@/components/sidebar'
import Link from "next/link";

import { useForm } from 'react-hook-form'
import { useRef,useEffect, useState } from 'react'

export default function Invoices(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [customers,setCustomers] = useState<any[]>([])
  const [quotations,setQuotations] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])
  const [invoices,setInvoices] = useState<any[]>([])
  const [contract,setContract] = useState<File|null>(null)
  const [orders,setOrders] = useState<any[]>([])
  const [contractFileName,setContractFileName] = useState<File|null>(null)
  const [attachment,setAttachment] = useState<File|null>(null)
  const [attachmentFileName,setAttachmentFileName] = useState<File|null>(null)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  
  const newInvoiceForm = useForm()
  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()

  var addInvoiceFn = useFetch<any,any>({
    url:'/api/web/invoice',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })
  
  var getInvoicesFn = useFetch<any,any>({
    url:`/api/web/orders?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })


  function submit(data:any){
    var body = JSON.stringify({
      ...data,
      id:masterAccountId,
      invoiceType:'product'
    })
    addInvoiceFn.fn('',body,(i) => {
      setInvoices([
        i,
        ...invoices
      ])
      modalRef.current?.close()
    })
  }

  async function attachmentSubmit(e:any){
    const file = e.target.files[0]
    setAttachment(file)
    setAttachmentFileName(file)
    console.log(file)
  }

  async function contractSubmit(e:any){
    const file = e.target.files[0]
    setContract(file)
    setContractFileName(file)
    console.log(file)
  }

  useEffect(() => {
    if(hasHydrated){
      const url4 = `/api/web/invoice?id=${masterAccountId}&type=product`

      const body = JSON.stringify({})

      getInvoicesFn.fn(url4,body,(result) => {
        console.log(result)
        setInvoices(result)
      })
    }
  },[masterAccountId])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Invoices</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All invoices</span>
            <button onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
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
            <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
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
                      invoices.map((s,index) => {
                        return (
                          <tr key={index}>
                            <td>{new Date(s.date).toLocaleDateString('id-ID')}</td>
                            <td>{s.invoiceNumber}</td>
                            <td>{s.salesOrderNumber}</td>
                            <td>{s.order.customer.bussinessName}</td>
                            <td>{s.order.product.productName}</td>
                            <td>{s.order.price}</td>
                            <td>{s.payAmount}</td>
                            <td>{s.paid ? 'yes':'no'}</td>
                            <td>
                              <button>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                  <path fill-rule="evenodd" d="M7.875 1.5C6.839 1.5 6 2.34 6 3.375v2.99c-.426.053-.851.11-1.274.174-1.454.218-2.476 1.483-2.476 2.917v6.294a3 3 0 0 0 3 3h.27l-.155 1.705A1.875 1.875 0 0 0 7.232 22.5h9.536a1.875 1.875 0 0 0 1.867-2.045l-.155-1.705h.27a3 3 0 0 0 3-3V9.456c0-1.434-1.022-2.7-2.476-2.917A48.716 48.716 0 0 0 18 6.366V3.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM16.5 6.205v-2.83A.375.375 0 0 0 16.125 3h-8.25a.375.375 0 0 0-.375.375v2.83a49.353 49.353 0 0 1 9 0Zm-.217 8.265c.178.018.317.16.333.337l.526 5.784a.375.375 0 0 1-.374.409H7.232a.375.375 0 0 1-.374-.409l.526-5.784a.373.373 0 0 1 .333-.337 41.741 41.741 0 0 1 8.566 0Zm.967-3.97a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H18a.75.75 0 0 1-.75-.75V10.5ZM15 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V10.5a.75.75 0 0 0-.75-.75H15Z" clip-rule="evenodd" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                      :
                      searchResult.map((role,index) => {
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
            <input {...newInvoiceForm.register("salesOrderNumber")} type="text" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Pay Amount</label>
            <label className="input flex-1">
            <input {...newInvoiceForm.register('payAmount')} type="text"/>
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
          {addInvoiceFn.noResult || addInvoiceFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>	    
    </>
  )
}