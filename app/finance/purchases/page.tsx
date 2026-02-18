"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef,useState,useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function Purchases(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const editRef = useRef<HTMLDialogElement>(null)
  const _editRef = useRef<HTMLDialogElement>(null)

  const [searchResult,setSearchResult] = useState<any[]>([])
  const [pr,setPr] = useState<any[]>([])  

  const editPrForm = useForm()
  const router = useRouter()

  var getFn = useFetch<any[],any>({
    url:`/api/web/purchases?id=xxx`,
    method:'GET'
  })

  var editFn = useFetch<any,any>({
    url:`/api/web/purchases`,
    method:'PUT'
  })

  async function search(v:string){
    if(v.length > 0){
      // var result = roles.filter((r) => {
      //   return r.name.includes(v)
      // })

      // if(result.length > 0){
      //   setSearchResult(
      //     [
      //       ...result
      //     ]
      //   )
      // }
      // else{
      //   setSearchResult(
      //     []
      //   )
      // }
    }
    else{
      setSearchResult(
        []
      )
    }
  }

  async function _editSubmit(data:any){
    var newPayAmt = data.payAmount - parseInt(data.currPayAmt)

    var pOrdered = JSON.stringify({
      ...data,
      status:'___approved',
      purchaseType:'product',
      newPayAmt
    })

    await editFn.fn('',pOrdered,(result) => {
      var [target] = pr.filter((r) => r._id == result._id)
      
      target.payAmount = result.payAmount
      _editRef.current?.close()
    })
  }

  async function editSubmit(data:any){
    const pApproved = JSON.stringify(data)

    await editFn.fn('',pApproved,(result) => {
      var [target] = pr.filter((r) => r._id == result._id)
      
      target.status = result.status

      setSearchResult([])

      editRef.current?.close()     
    })
  }

  async function _edit(_id:string){
    var [filter] = pr.filter((p) => p._id == _id)

    editPrForm.reset({
      _id:filter._id,
      quantity:filter.quantity,
      estimatedPrice:filter.estimatedPrice,
      product:filter.product.productName,
      finalPrice:filter.finalPrice,
      currPayAmt:filter.payAmount,
      payAmount:filter.payAmount,
      supplierId:filter.supplierId
    })
  
    _editRef.current?.showModal()
  }
  async function edit(_id:string){
    var [filter] = pr.filter((p) => p._id == _id)

    editPrForm.reset({
      _id:filter._id,
      quantity:filter.quantity,
      estimatedPrice:filter.estimatedPrice,
      product:filter.product.productName,
      status:filter.status
    })

    editRef.current?.showModal()
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/purchases?id=${masterAccountId}&type=product` 
    
      getFn.fn(url,JSON.stringify({}),(result) => {
        setPr(result)
      })

  
      const body = JSON.stringify({})
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
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Estimated price</th>
                      <th>Final price</th>

                      <th>Status</th>
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
                            <td>{p.product.productName}</td>
                            <td>{p.quantity} ({p.product.unit})</td>
                            <td>{p.estimatedPrice}</td>
                            <td>
                              {
                                p.status === "ordered" || p.status === "completed" 
                                ? 
                                p.finalPrice
                                :
                                0
                              }
                            </td>
                            <td>{p.status}</td>
                            <td className="flex flex-row gap-3">
                              <button onClick={() => edit(p._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                              </button>
                              <button onClick={() => _edit(p._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
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
      <dialog id="my_modal_2" ref={editRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col ">
            <span className="text-2xl">Edit purchase order</span>
            <form onSubmit={editPrForm.handleSubmit(editSubmit)} className="h-96 relative flex flex-col">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Quantity</legend>
                <input className="input w-full" {...editPrForm.register("quantity")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Estimated price</legend>
                <input className="input w-full" {...editPrForm.register("estimatedPrice")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Status</legend>
                <select className="input w-full" {...editPrForm.register("status")}>
                  <option value="requested">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </fieldset>              
              <div className="modal-action">
                {
                  /*
                    <form method="dialog">
                      <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                        Cancel
                      </button>		
                    </form>
                  */
                }
              </div>					
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Save
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_3" ref={_editRef} className="modal">
 				<div className="modal-box">
					<div className="flex flex-col ">
						<span className="text-2xl">Edit purchase order</span>
						<form onSubmit={editPrForm.handleSubmit(_editSubmit)} className="h-100 relative flex flex-col">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Quantity</legend>
                <input className="input w-full" {...editPrForm.register("quantity")} type="text" readOnly/>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay amount</legend>
                <input className="input w-full" {...editPrForm.register("payAmount")} type="text"/>
              </fieldset> 
              {editFn.noResult || editFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }			
							<button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
								Edit
							</button>
						</form>
		      </div>
				</div>
			</dialog>
      <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
        <Link href="/finance/xpurchases">
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