"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef,useState,useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function XPurchases(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const orderRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [roles,setRoles] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [pr,setPr] = useState<any[]>([])
  const [suppliers,setSuppliers] = useState<any[]>([])
  const [products,setProducts] = useState<any[]>([])
  const [disabled,setDisabled] = useState<boolean>(false)
  const [vendors,setVendors] = useState<any[]>([])


  const orderForm = useForm()
  const newPrForm = useForm()
  const editPrForm = useForm()
  const router = useRouter()

  const status = editPrForm.watch('status');

  const putFn = useFetch<any,any>({
    url:'/api/web/purchases',
    method:'PUT'
  })

  const getVendorsFn = useFetch<any,any>({
    url:'/api/web/vendor',
    method:'GET',
    onError:(m) =>{
      alert(m)
    }
  })

  const addFn = useFetch<any,any>({
    url:'/api/web/purchases',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var editFn = useFetch<any,any>({
    url:`/api/web/purchases`,
    method:'PUT',
    onError:(m) => {
      alert(m)
    }
  })

  var getFn = useFetch<any[],any>({
    url:`/api/web/purchases?id=xxx`,
    method:'GET'
  })

  var getProductsFn = useFetch<any[],any>({
    url:`/api/web/product?id=xxx`,
    method:'GET'
  })

  var getSuppliersFn = useFetch<any[],any>({
    url:`/api/web/suppliers?id=xxx`,
    method:'GET'
  })

  var deleteFn = useFetch<any[],any>({
    url:`/api/web/roles?id=xxx`,
    method:'DELETE',
    onError:(m) => {
      alert(m)
    }
  })

  async function submit(data:any){
    var body = JSON.stringify({
      ...data,
      status:'requested',
      id:masterAccountId,
      date:new Date(),
      purchaseType:'payment',
    })

    addFn.fn('',body,(r) => {
      setPr(
        [
          ...pr,
          r
        ]
      )
      modalRef.current?.close()
    })
  }

  async function search(v:string){
    if(v.length > 0){
      var result = roles.filter((r) => {
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

  async function orderSubmit(data:any){
    var pOrdered = JSON.stringify({
      ...data,
      status:'_approved',
      PurchaseType:'payment'
    })
    if(data.finalPrice > data.estimatedPrice){
      alert("Final price cannot be higher than estimated price")
    }
    else if(data.payAmount > data.finalPrice){
      alert("Pay amount cannot be higher than final price")
    }
    else{
      await editFn.fn('',pOrdered,(result) => {
        var [target] = pr.filter((r) => r._id == result._id)
        target.status = "ordered"
        target.vendor = result.vnd
        target.finalPrice = result.finalPrice
        target.payAmount = result.payAmount
        orderRef.current?.close()
      })
    }
  }

  async function del(_id:string){
    var url = `/api/web/roles?id=${_id}`
    var body = JSON.stringify({})

    await deleteFn.fn(url,body,(result) =>{
      setRoles(
        roles.filter((r) => r._id != result)
      )
    })
  }

  async function edit(_id:string){
    var [filter] = pr.filter((p) => p._id == _id)

    editPrForm.reset({
      _id:filter._id,
      quantity:filter.quantity,
      estimatedPrice:filter.estimatedPrice,
      description:filter.description,
      finalPrice:filter.finalPrice,
      currPayAmt:filter.payAmount,
      payAmount:filter.payAmount,
      vendorId:filter.vendorId,
      editable:filter.editable
    })
  
    editRef.current?.showModal()
  }

  async function editSubmit(data:any){

    var pOrdered = JSON.stringify({
      ...data,
      status:'__approved',
      purchaseType:'payment',
    })

    if(data.editable){
      await editFn.fn('',pOrdered,(result) => {
        var [target] = pr.filter((r) => r._id == result._id)
        target.finalPrice = result.finalPrice
        target.payAmount = result.payAmount
        target.vendor = result.vnd
        editRef.current?.close()
      })
    }
    else{
      alert('this data is not editable anymore')
    }
  }


  async function order(_id:string){
    var [filter] = pr.filter((p) => p._id == _id)

    orderForm.reset({
      _id:filter._id,
      estimatedPrice:filter.estimatedPrice,
      description:filter.description,
      status:filter.status
    })

    if(filter.status === 'approved'){
      setDisabled(false)
    }

    if(filter.status === 'requested' || filter.status === 'ordered' || filter.status === 'rejected'){
      setDisabled(true)
    }
  
    orderRef.current?.showModal()
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/purchases?id=${masterAccountId}&f=requested&type=payment` 
      const url2 = `/api/web/products?id=${masterAccountId}&type=service`
      const url4 = `/api/web/vendor?id=${masterAccountId}`
      const url3 = `/api/web/suppliers?id=${masterAccountId}`
  
      const body = JSON.stringify({})

      getProductsFn.fn(url2,body,(result) => {
        setProducts(result)
      })

      getSuppliersFn.fn(url3,body,(result) => {
        setSuppliers(result)
      })
      getFn.fn(url,body,(result) => {
        setPr(result)
      })
      getVendorsFn.fn(url4,body,(result) => {
        setVendors(result)
      })
    }
  },[masterAccountId])

  if(!hasHydrated) return null
  if(!loggedIn) router.push('/login')
  if(!isSuperAdmin) router.push('/dashboard')
  
  
  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Purchases</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">Manage purchase status</span>
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
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
          </div>
          {
            getFn.loading
            ?
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
            :
            getFn.error || getFn.noResult
            ?
            <div>
              <p>{getFn.message}</p>
            </div>
            :
            <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Estimated price</th>
                      <th>Final Price</th>
                      <th>Pay Amount</th>
                      <th>Status</th>
                      <th>Vendor</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      pr.map((p,index) => {
                        return (
                          <tr key={index}>
                            <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                            <td>{p.description}</td>
                            <td>{p.estimatedPrice}</td>
                            {
                              p.status === "ordered" || p.status === "completed" ? <td>{p.finalPrice}</td> : <td>-</td>
                            }
                            {
                              p.status === "ordered" || p.status === "completed" ? <td>{p.payAmount}</td> : <td>-</td>
                            }
                            <td>{p.status}</td>
                            {
                              p.status === "ordered" || p.status === "completed" ? <td>{p.vendor.name}</td> : <td>-</td>
                            }
                            {
                              p.status === "ordered" || p.status === "completed" 
                              ?
                              <td>
                                <button className="cursor text-red-900" onClick={() => edit(p._id)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                    <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                                    <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                                  </svg>
                                </button>
                              </td>
                              :
                              <td>
                                <button className="cursor text-blue-900" onClick={() => order(p._id)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                    <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                                    <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                                  </svg>
                                </button>
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
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
      <dialog id="my_modal_1" ref={modalRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Purchase Requisition</span>
            <form onSubmit={newPrForm.handleSubmit(submit)} className="h-92 relative flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Service</legend>    
                  <input {...newPrForm.register("description")} className="input w-full"/>
                </fieldset> 
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Estimated price</legend>    
                  <input {...newPrForm.register("estimatedPrice")} className="input w-full"/>
                </fieldset>
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }	
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Add
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_2" ref={orderRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col ">
            <span className="text-2xl">Make purchase order</span>
            <form onSubmit={orderForm.handleSubmit(orderSubmit)} className="h-120 relative flex flex-col">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Description</legend>
                <input className="input w-full" {...orderForm.register("description")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Estimated price</legend>
                <input className="input w-full" {...orderForm.register("estimatedPrice")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Final price</legend>
                <input className="input w-full" {...orderForm.register("finalPrice")} type="text"/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay amount</legend>
                <input className="input w-full" {...orderForm.register("payAmount")} type="text"/>
              </fieldset>              
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Vendor</legend>
                <select {...orderForm.register("vendorId")} className="select w-full">
                  {
                    vendors.map((s,index) => {
                      return (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      )
                    })
                  }
                </select>
              </fieldset>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }			
              <button disabled={disabled} type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Make
              </button>
            </form>
          </div>
        </div>
      </dialog>
			<dialog id="my_modal_3" ref={editRef} className="modal">
 				<div className="modal-box">
					<div className="flex flex-col ">
						<span className="text-2xl">Edit purchase order</span>
						<form onSubmit={editPrForm.handleSubmit(editSubmit)} className="h-120 relative flex flex-col">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Description</legend>
                <input className="input w-full" {...editPrForm.register("description")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Final Price</legend>
                <input className="input w-full" {...editPrForm.register("finalPrice")} type="text"/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay Amount</legend>
                <input className="input w-full" {...editPrForm.register("payAmount")} type="text"/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Vendor</legend>
                <select {...editPrForm.register("vendorId")} className="select w-full">
                  {
                    vendors.map((s,index) => {
                      return (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      )
                    })
                  }
                </select>
              </fieldset>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }			
							<button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
								Edit
							</button>
						</form>
		      </div>
				</div>
			</dialog>      
      <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
        <Link href="/purchases/requisition">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>
    </Sidebar>
  )
}

type Failed = {
  message:string
}