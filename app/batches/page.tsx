"use client"

import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import useFetch from "@/hooks/useFetch";
import { useSearchParams } from 'next/navigation'
import { useState,useEffect,useRef } from "react"
import { useForm } from "react-hook-form";


export default function Batches(){
  const [mounted, setMounted] = useState<boolean>(false);
  const [stock,setStock] = useState<any[]>([])	
  const [batches,setBatches] = useState<any[]>([])
  const [locations,setLocations] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [batchNumber,setBatchNumber] = useState<any>(0)
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)	
  const hasHydrated = useAuth((s) => s._hasHydrated)
  
  const searchParams = useSearchParams()
  const productId = searchParams.get('pId')
  const locationId = searchParams.get('lId')

  const modalRef = useRef<HTMLDialogElement>(null)

  const editBatchForm = useForm()
  
  const openingStockForm = useForm();

  async function search(v:string){
    if(v.length > 0){
      var result = locations.filter((r) => {
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

  var fetchBatchesFn  = useFetch<any,any>({
    url:'/api/web/batches?pId=xxx',
    method:'GET',
    onError:(m) => {
      alert('something went wrong')
    }
  })

  var openStockFn = useFetch<any,any>({
    url:`/api/web/stock`,
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var getStockFn = useFetch<any,any>({
    url:`/api/web/stock`,
    method:'GET'
  })

  function handleSubmit(data:any){
    const body = JSON.stringify({
      ...data,
      status:'ACTIVE',
      isOpening:true,
      outQty:0
    })

    openStockFn.fn('',body,(result) => {
      setStock([
        ...stock,
        result
      ])
      modalRef.current?.close()
    })
  }

  function makeBatchNumber(){
    return `BAT-${new Date().toISOString().slice(0,10)}-${Date.now()}`;
  }

  var editBatchFn = useFetch<any,any>({
    url:'/api/web/batches',
    method:'PUT'
  })
  
  var fetchLocationsFn = useFetch<any[],any>({
    url:`/api/web/location?id=xxx`,
    method:'GET'
  })

  var fetchProductsFn = useFetch<any[],any>({
    url:`/api/web/products?id=xxx`,
    method:'GET',
    onError:(m) => {
      console.log(m)
    }
  })

  function toggle(){
    setBatchNumber(Date.now())
    modalRef.current?.showModal()
  }

  function edit(batchNumber:string){
    var [filter] = batches.filter((b) => {
      return b.batchNumber == batchNumber
    })

    editBatchForm.reset({
      ...filter,
      expiryDate:new Date(filter.expiryDate).toISOString().slice(0, 10)
    })

    modalRef.current?.showModal()
  }

  function editSubmit(data:any){
    var {supplier,suppliers,...rest} = data
    
    editBatchFn.fn('',JSON.stringify(rest),(r) => {
      var [target] = batches.filter((b) => {
        return b.batchNumber == data.batchNumber
      })

      target.status = r.status

      modalRef.current?.close()
    })
  }

  useEffect(() => {
    if(hasHydrated){
      const url4 = `/api/web/batches?pId=${productId}&lId=${locationId}` 
  
      const body = JSON.stringify({})

      fetchBatchesFn.fn(url4,body,(r) => {
        setBatches(r)        
      })

      setMounted(
        true
      )
    }
  },[masterAccountId])	

  if (!mounted) return null;

  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Batch <span className="text-sm leading-loose">Manage batch</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All batch</span>
            <button onClick={() => toggle()} className="btn ml-auto">
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
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
          </div>
          {
            fetchBatchesFn.loading
            ?
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
            :
            fetchBatchesFn.error || fetchBatchesFn.noResult
            ?
            <div>
              <p>{fetchBatchesFn.message}</p>
            </div>
            :
            <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Batch number</th>
                      <th>Received At</th>
                      <th>Expiry Date</th>
                      <th>Supplier</th>
                      <th>Remain</th>
                      <th>Status</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      batches.map((b,index) => {
                        return (
                          <tr key={index}>
                            <td>{b.batchNumber}</td>                         
                            <td>{new Date(b.createdAt).toLocaleString('id-ID')}</td>   
                            <td>{new Date(b.expiryDate).toLocaleString('id-ID')}</td>   
                            <td>{b.isOpening ? '-' : b.supplier.bussinessName}</td>   
                            <td>{b.remain}</td>   
                            <td>{b.status}</td>   
                            <td>
                              <svg onClick={() => edit(b.batchNumber)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                              </svg>
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
                                  <path strokeLinecap="round" strokeLineJoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full">
        <form onSubmit={editBatchForm.handleSubmit(editSubmit)} className="modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Manage batch</h3>
            <div className="flex flex-row items-center">
              <label className="w-[150px]">Batch number</label>
              <input readOnly {...editBatchForm.register("batchNumber")} value={Date.now()} type="text" className="input p-3 rounded-md w-full"/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[80px]">Supplier</label>
              <input readOnly placeholder="submit unit cost here" className="input p-3 rounded-md w-full"  {...editBatchForm.register("supplier.bussinessName")}/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[60px]">Expiry Date</label>
              <input readOnly  {...editBatchForm.register("expiryDate")} type="date" className="input p-3 rounded-md w-full" placeholder="quantity"/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[100px]">Remain</label>
              <input readOnly  {...editBatchForm.register("remain")} type="text" className="input p-3 rounded-md w-full" placeholder="initial quantity"/>
            </div>
    			  <div className="flex flex-row items-center gap-2">
              <label className="w-[60px]">Status</label>
						  <select {...editBatchForm.register("status")} className="select flex-1">
                <option>
                  ACTIVE
                </option>
                <option>
                  EXPIRED
                </option>
						  </select>              
            </div>
            {editBatchFn.noResult || editBatchFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
            <div className="flex flex-row gap-3 modal-action">
              <button className="btn bg-red-900 text-white">Submit</button>
            </div>
          </form>
        </dialog>			
    </Sidebar>
  )
}

