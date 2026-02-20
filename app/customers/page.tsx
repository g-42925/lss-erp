"use client";

import Sidebar from '@/components/sidebar'
import useFetch from '@/hooks/useFetch'
import useAuth from "@/store/auth"

import { v4 as uuidv4 } from "uuid";
import { useForm } from "react-hook-form";
import { useEffect, useState,useRef } from "react";
import { useRouter } from 'next/navigation'

export default function Customers(){
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const roleDetail = useAuth((state) => state.roleDetail)
  
  const [customers,setCustomers] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newCustomerForm = useForm();
  const editCustomerForm = useForm();
  const router = useRouter();

  var getCustomersFn = useFetch<any[],any>({
    url:`/api/web/customers?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })

  var addFn = useFetch<any,any>({
    url:'/api/web/customers',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var editFn = useFetch<any,any>({
    url:'/api/web/customers',
    method:'PUT',
    onError:(m) => {
      alert(m)
    }
  })



  async function submit(data:any){
    const newCustomers = JSON.stringify({
      ...data,
      masterAccountId
    })

    await addFn.fn('',newCustomers,(result) => {
      modalRef.current?.close()
      setCustomers(
        [
          ...customers,
          result
        ]
      )
    })
  }

  async function search(v:string){
    if(v.length > 0){
      var result = customers.filter((r) => {
        return r.name.includes(v)
      })

      if(result.length > 0){
        setSearchResult(
          [
            ...result
          ]
        )
      }
      else{
        setSearchResult(
          []
        )
      }
    }
    else{
      setSearchResult(
        []
      )
    }
  }

  async function handleEdit(data:any){
    const [f] = customers.filter((s) => s._id === data._id)

    const body = JSON.stringify({...data,addedOn:f.addedOn})

    await editFn.fn('',body,(result) => {
      var [target] = customers.filter((s,index) => {
        return s._id === data._id
      })

      Object.keys(target).forEach(key => {
        target[key] = result[key]
      })

      setSearchResult([])

      editRef.current?.close()
    })       
  }


  function edit(_id:string){
    var [customer] = customers.filter((s) => {
      return s._id === _id
    })

    editCustomerForm.reset({
      _id:customer._id,
      vendorId:customer.vendorId,
      contactId:customer.contactId,
      bussinessName:customer.bussinessName,
      name:customer.name,
      email:customer.email,
      taxNumber:customer.taxNumber,
      creditLimit:customer.creditLimit,
      payTerm:customer.payTerm,
      openingBalance:customer.openingBalance,
      advanceBalance:customer.advanceBalance,
      address:customer.address,
      mobile:customer.mobile,
      totalSaleDue:customer.totalSaleDue
    })

    editRef.current?.show()
  }

  function normalizeDate(date:string){
    return new Date(date).toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta"
    })
  }

  useEffect(() => {
    if(hasHydrated){
      const url1 = `/api/web/customers?id=${masterAccountId}` 
      const url2 = `/api/web/categories?id=${masterAccountId}`
      getCustomersFn.fn(url1,JSON.stringify({}),(r) => {
        setCustomers(r)
      })
    }
  },[masterAccountId])

  if(!hasHydrated) return null
  if(!loggedIn) router.push('/login')
  if(!isSuperAdmin){
    if(!roleDetail.page.includes('suppliers')){
      router.push('/dashboard')
    }
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Customers <span className="text-sm leading-loose">Manage your customers</span></span>
        <label className="input w-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          <input type="search" required placeholder="Search" className="w-full p-3" />
        </label>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your Customers</span>
            <button disabled={!isSuperAdmin && roleDetail.permission === 'readonly'} onClick={() => modalRef.current?.show()} className="btn ml-auto">
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
            <div className="ml-auto mr-auto flex flex-row gap-1">
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Export to csv
              </div>
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Export to excel
              </div>
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Export to pdf
              </div>
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                Print
              </div>
            </div>
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
          </div>
          {
            getCustomersFn.loading
            ?
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
            :
            getCustomersFn.noResult || getCustomersFn.error
            ?
            <div>
              <p>{getCustomersFn.message}</p>
            </div> 
            :
            searchResult.length < 1
            ?
              <div className="overflow-x-auto">
                <table className="table">
                  <tbody>
                    <tr className="divide-x">
                      <th>Contact ID</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.contactId}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Vendor ID</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.vendorId}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Bussines Name</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.bussinessName}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Name</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.name}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Email</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.email}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Tax number</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.taxNumber}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Credit Limit</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.creditLimit}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Pay Term</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.payTerm}</th>
                        )
                      })}
                    </tr> 
                    <tr className="divide-x">
                      <th>Opening Balance</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.openingBalance}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Advance Balance</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.openingBalance}</th>
                        )
                      })}
                    </tr>  
                    <tr className="divide-x">
                      <th>Added On</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{normalizeDate(customer.addedOn)}</th>
                        )
                      })}
                    </tr>   
                    <tr className="divide-x">
                      <th>Addres</th>
                      {customers.map((customer,index) => {
                        return (
                          <th key={index}>{customer.address}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Mobile</th>
                      {customers.map((customer,index) => {
                        return (
                          <>
                            <th key={index}>{customer.mobile}</th>
                          </>
                        )
                      })}
                    </tr> 
                    <tr className="divide-x">
                      <th>Total sale due</th>
                      {customers.map((customer,index) => {
                        return (
                          <>
                            <th key={index}>{customer.totalSaleDue}</th>
                          </>
                        )
                      })}
                    </tr> 
                    <tr className="divide-x">
                      <th>...</th>
                      {customers.map((customer,index) => {
                        return (
                          <th>
                            <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} className="btn" onClick={() => edit(customer._id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          </th>
                        )
                      })}
                    </tr>                                
                  </tbody>
                </table>
              </div>
            :
            <div className="overflow-x-auto">
              <table className="table">
                  <tbody>
                    <tr className="divide-x">
                      <th>Contact ID</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.contactId}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Vendor ID</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.vendorId}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Bussines Name</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.bussinessName}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Name</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.name}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Email</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.email}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Tax number</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.taxNumber}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Credit Limit</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.creditLimit}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Pay Term</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.payTerm}</th>
                        )
                      })}
                    </tr> 
                    <tr className="divide-x">
                      <th>Opening Balance</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.openingBalance}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Advance Balance</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.advanceBalance}</th>
                        )
                      })}
                    </tr>  
                    <tr className="divide-x">
                      <th>Added On</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{normalizeDate(customer.addedOn)}</th>
                        )
                      })}
                    </tr>   
                    <tr className="divide-x">
                      <th>Addres</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.address}</th>
                        )
                      })}
                    </tr>
                    <tr className="divide-x">
                      <th>Mobile</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th key={index}>{customer.mobile}</th>
                        )
                      })}
                    </tr> 
                    <tr className="divide-x">
                      <th>Total sale due</th>
                      {customers.map((customer,index) => {
                        return (
                          <>
                            <th key={index}>{customer.totalSaleDue}</th>
                          </>
                        )
                      })}
                    </tr> 
                    <tr className="divide-x">
                      <th>...</th>
                      {searchResult.map((customer,index) => {
                        return (
                          <th>
                            <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} className="btn" onClick={() => edit(supplier._id)}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          </th>
                        )
                      })}
                    </tr>                                 
              </tbody>
            </table>
          </div>         
          }      
        </div>
      </div>
      <dialog id="my_modal_2" ref={editRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Edit Supplier</span>
            <form onSubmit={editCustomerForm.handleSubmit(handleEdit)} className="h-90 flex flex-col gap-3 relative">
              <div className="flex flex-row gap-3">
                <input {...editCustomerForm.register("_id")} type="hidden" placeholder="contact id" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input readOnly {...editCustomerForm.register("contactId")} type="text" placeholder="contact id" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input readOnly {...editCustomerForm.register("vendorId")} type="text" placeholder="vendor id" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...editCustomerForm.register("bussinessName")} type="text" placeholder="bussiness name" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
              </div>
              <div  className="flex flex-row gap-3">
                <input {...editCustomerForm.register("name")} type="text" placeholder="name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>              
                <input {...editCustomerForm.register("email")} type="text" placeholder="email" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...editCustomerForm.register("taxNumber")} type="text" placeholder="tax number" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>   
              </div>       
              <div className="flex flex-row gap-3">
                <input {...editCustomerForm.register("creditLimit")} type="text" placeholder="credit limit" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>   
                <input {...editCustomerForm.register("payTerm")} type="text" placeholder="pay term" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...editCustomerForm.register("openingBalance")}  type="text" placeholder="opening balance" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>              
              </div>    
              <div className="flex flex-row gap-3">
                <input {...editCustomerForm.register("advanceBalance")} type="text" placeholder="advance balance" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>              
                <input {...editCustomerForm.register("address")} type="text" placeholder="addres" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>    
                <input {...editCustomerForm.register("mobile")} type="text" placeholder="mobile" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>                 
                <input {...editCustomerForm.register("totalSaleDue")} type="text" placeholder="total sale due" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>                 
              </div>       
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></> }
              <div className="modal-action">
                {/* <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                    Cancel
                  </button>		
                </form> */}
              </div>					
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Edit
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Customer</span>
            <form onSubmit={newCustomerForm.handleSubmit(submit)} className="h-90 flex flex-col gap-3 relative">
              <div className="flex flex-row gap-3">
                <input {...newCustomerForm.register("contactId")} value={`cnt-${uuidv4().split('-')[1]}`} type="text" placeholder="contact id" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...newCustomerForm.register("vendorId")} value={`vnd-${uuidv4().split('-')[1]}`} type="text" placeholder="vendor id" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...newCustomerForm.register("bussinessName")} type="text" placeholder="bussiness name" className="flex-1 mb-3 w-full p-3 rounded-md border-1 border-black"/>
              </div>
              <div  className="flex flex-row gap-3">
                <input {...newCustomerForm.register("name")} type="text" placeholder="name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>              
                <input {...newCustomerForm.register("email")} type="text" placeholder="email" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...newCustomerForm.register("taxNumber")} type="text" placeholder="tax number" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>   
              </div>       
              <div className="flex flex-row gap-3">
                <input {...newCustomerForm.register("creditLimit")} type="text" placeholder="credit limit" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>   
                <input {...newCustomerForm.register("payTerm")} type="text" placeholder="pay term" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
                <input {...newCustomerForm.register("openingBalance")}  type="text" placeholder="opening balance" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>              
              </div>    
              <div className="flex flex-row gap-3">
                <input {...newCustomerForm.register("advanceBalance")} type="text" placeholder="advance balance" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>              
                <input {...newCustomerForm.register("address")} type="text" placeholder="addres" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>    
                <input {...newCustomerForm.register("mobile")} type="text" placeholder="mobile" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>                 
                <input {...newCustomerForm.register("totalSaleDue")} type="text" placeholder="totalSaleDue" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>                 

              </div>       
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></> }
              <div className="modal-action">
                {/* <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                    Cancel
                  </button>		
                </form> */}
              </div>					
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Add
              </button>
            </form>
          </div>
        </div>
      </dialog>    
    </>
  )
}

