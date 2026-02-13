"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Sidebar from '@/components/sidebar'
import Link from "next/link";
import { NumericFormat } from 'react-number-format';
import { useForm } from 'react-hook-form'
import { useRef,useEffect, useState } from 'react'

export default function Quotation(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [customers,setCustomers] = useState<any[]>([])
  const [quotations,setQuotations] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])
  
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  
  const newQuotationForm = useForm()
  const editQuotationForm = useForm()

  
  var addQuotationFn = useFetch<any,any>({
    url:'/api/web/quotations',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var getCustomersFn = useFetch<any,any>({
    url:`/api/web/customers?id=xxx`,
    method:'GET'    
  })
  
  var getQuotationsFn = useFetch<any,any>({
    url:`/api/web/quotations?id=xxx`,
    method:'GET'    
  })

  var editQuotationsFn = useFetch<any,any>({
    url:`/api/web/quotations`,
    method:'PUT'    
  })

  var getProductsFn = useFetch<any,any>({
    url:`/api/web/products?id=xxx`,
    method:'GET'    
  })  

  function edit(_id:string){
    var q = quotations.find((q) => q._id === _id)

    // var eD = new Date(q.expiredDate).toISOString().split("T")[0]
    
    editQuotationForm.reset({
      _id:q._id,
      productId:q.productId,
      customerId:q.customerId,
      contractType:q.contractType,
      range:q.range,
      frequency:q.frequency,
      qty:q.qty,
      price:q.price,
    })

    editRef.current?.showModal()
  }

  function editSubmit(data:any){
    console.log(data)

    var q = JSON.stringify(
      {
        ...data,
        id:masterAccountId
      }
    )

    editQuotationsFn.fn('',q,(result) => {
      var [target] = quotations.filter((q) => q._id === data._id)
      target.product = result.product
      target.productId = result.prductId
      target.customer = result.customer
      target.customerId = result.customerId
      target.qty = result.qty
      target.price = result.price
      target.contractType = result.contractType
      target.range = result.range
      target.frequency = result.frequency

    
      editRef.current?.close()
    })
  }

  function submit(data:any){
    var params = JSON.stringify(
      {
        ...data,
        id:masterAccountId,
        productType:'service',
        price:data.price
      }
    )

    addQuotationFn.fn('',params,(result) => {
      var product = products.find((p) => p._id === data.productId)
      var customer = customers.find((c) => c._id === data.customerId)
      
      var q = {
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

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/quotations?id=${masterAccountId}&type=service` 
      const url2 = `/api/web/products?id=${masterAccountId}&type=service`
      const url3 = `/api/web/customers?id=${masterAccountId}`

      const body = JSON.stringify({})

      getCustomersFn.fn(url3,body,(result) => {
        setCustomers(result)
      })

      getQuotationsFn.fn(url,body,(result) => {
        console.log(result)
        setQuotations(result)
      })

      getProductsFn.fn(url2,body,(result) => {
        setProducts(result)
      })
    }
  },[masterAccountId])

  return (
    <Sidebar>
      <div className="h-full p-6 h-full flex flex-col gap-3">
        <span className="text-2xl">Services Quotations</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All service quotation</span>
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
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      quotations.map((s,index) => {
                        return (
                          <tr key={index}>
                            <td>{s.product.productName}</td>
                            <td>{s.customer.bussinessName}</td>
                            <td>{s.contractType}</td>
                            <td>{s.range}</td>
                            <td>{s.frequency ?? 0}</td>
                            <td>{s.qty}</td>
                            <td>{s.price}</td>
                            <td>
                              <button onClick={() => edit(s._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                  <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
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
        </div>
      </div>
      <dialog ref={editRef} id="my_modal_2" className="modal h-full">
      <form onSubmit={editQuotationForm.handleSubmit(editSubmit)} className="h-140 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Edit quotation</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Product</label>
            <select {...editQuotationForm.register("productId")} className="select flex-1">
              {
                products.map((p) => {
                  return <option value={p._id} key={p._id}>{p.productName} {p.altUnit ?  (`(${p.altUnit})`): ''}</option>
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
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Type</label>
            <select  {...editQuotationForm.register("contractType")} className="select flex-1">
              <option>...</option>
              <option>Full</option>
              <option>Trial</option>
            </select>              
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Range</label>
            <label className="input flex-1">
            <input {...editQuotationForm.register('range')} type="text" placeholder="range" />
            <span className="badge badge-neutral badge-xs">Month</span>
            </label>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[80px]">Frequency</label>
            <select {...editQuotationForm.register("frequency")} className="select flex-1">
              <option>...</option>
              <option>Week</option>
              <option>Month</option>
            </select>              
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quantity</label>
            <input {...editQuotationForm.register("qty")} type="text" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Price</label>
            <input {...editQuotationForm.register("price")} type="text" className="input flex-1"/>
          </div>
          {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit	</button>
          </div>
        </form>
      </dialog>	
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full">
        <form onSubmit={newQuotationForm.handleSubmit(submit)} className="h-140 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make quotation</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Product</label>
            <select {...newQuotationForm.register("productId")} className="select flex-1">
              {
                products.map((p) => {
                  return <option value={p._id} key={p._id}>{p.productName} {p.altUnit ?  (`(${p.altUnit})`): ''}</option>
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
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Type</label>
            <select  {...newQuotationForm.register("contractType")} className="select flex-1">
              <option>...</option>
              <option>Full</option>
              <option>Trial</option>
            </select>              
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Range</label>
            <label className="input flex-1">
            <input {...newQuotationForm.register('range')} type="text" placeholder="range" />
            <span className="badge badge-neutral badge-xs">Month</span>
            </label>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[80px]">Frequency</label>
            <select {...newQuotationForm.register("frequency")} className="select flex-1">
              <option>...</option>
              <option>Week</option>
              <option>Month</option>
            </select>              
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quantity</label>
            <input {...newQuotationForm.register("qty")} type="text" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Price</label>
            <input {...newQuotationForm.register("price")} type="text" className="input flex-1"/>
          </div>
          {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit	</button>
          </div>
        </form>
      </dialog>	
      <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
        <Link href="/sales/quotations">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>
    </Sidebar>
  )
}