"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Sidebar from '@/components/sidebar'
import Link from "next/link";

import { useForm } from 'react-hook-form'
import { useRef,useEffect, useState } from 'react'

export default function XOrder(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [customers,setCustomers] = useState<any[]>([])
  const [quotations,setQuotations] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])
  const [contract,setContract] = useState<File|null>(null)
  const [orders,setOrders] = useState<any[]>([])
  const [contractFileName,setContractFileName] = useState<File|null>(null)
  const [attachment,setAttachment] = useState<File|null>(null)
  const [attachmentFileName,setAttachmentFileName] = useState<File|null>(null)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  
  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()

  var addOrderFn = useFetch<any,any>({
    url:'/api/web/order',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })
  
  var getOrdersFn = useFetch<any,any>({
    url:`/api/web/orders?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })


  function submit(data:any){
    const formData = new FormData()
    formData.append("id",masterAccountId)
    formData.append("contract",contract as any)
    formData.append("attachment",attachment as any)
    formData.append("productType","service")

    Object.keys(data).forEach((key) => {
      formData.append(key,data[key])
    })

    addOrderFn.fn('',formData,(r) => {
      modalRef.current?.close()

      setOrders(
        [
          r,
          ...orders
        ]
      )
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
      const url4 = `/api/web/order?id=${masterAccountId}&type=service`


      const body = JSON.stringify({})

      getOrdersFn.fn(url4,body,(result) => {
        setOrders(result)

        console.log(result)
      })
    }
  },[masterAccountId])

  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Services Order</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All order</span>
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
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Range</th>
                      <th>Frequency</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Pay Term</th>
                      <th>Contract</th>
                      <th>Attachment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      orders.map((s,index) => {
                        return (
                          <tr key={index}>
                            <td>{s.product.productName}</td>
                            <td>{s.customer.bussinessName}</td>
                            <td>{s.contractType}</td>
                            <td>{s.range}</td>
                            <td>{s.frequency}</td>
                            <td>{s.qty}</td>
                            <td>{s.price}</td>
                            <td>{s.payTerm} (Days)</td>
                            {
                              s.contract
                              ?
                              <td>
                                <a href={s.contract} target="_blank" rel="noopener noreferrer">
                                   view
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
                                  view
                                </a>
                              </td>
                              :
                              <td>
                                -
                              </td>
                            }
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
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full">
        <form onSubmit={newOrderForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make order</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quotation Number</label>
            <input {...newOrderForm.register("qNumber")} type="text" className="input flex-1"/>
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
          {addOrderFn.noResult || addOrderFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>	
    </Sidebar>
  )
}