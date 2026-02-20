"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";

import { useRef,useState,useEffect } from "react"
import { useForm } from "react-hook-form"
import { redirect,useRouter } from "next/navigation";

export default function Receiving(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
	const [locations,setLocations] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [purchases,setPurchases] = useState<any[]>([])
  const [disabled,setDisabled] = useState<boolean>(false)

  const editRef = useRef<HTMLDialogElement>(null)
  
  const editPrForm = useForm()

  const router = useRouter()

  var fetchLocationsFn = useFetch<any[],any>({
    url:`/api/web/location?id=xxx`,
    method:'GET'
  })

  var getFn = useFetch<any[],any>({
    url:`/api/web/purchases?id=xxx`,
    method:'GET'
  })

  var editFn = useFetch<any,any>({
    url:`/api/web/purchases`,
    method:'PUT',
    onError:(m) => {
      alert(m)
    }
  })


  async function editSubmit(data:any){
    var {product,estimatedPrice,supplier,finalPrice,...rest} = data
    
    var additional = {
      isOpening:false,
      createdAt:new Date().toISOString().slice(0,10),
      outQty:0,
    }

    const batch = JSON.stringify(
      {
        ...rest,
        ...additional,
        qty:data.quantity
      }
    )
    
    await editFn.fn('',batch,(result) => {
      router.push('/products/stock')
    })
  }

  async function edit(_id:string){
    var [filter] = purchases.filter((p) => p._id == _id)

    editPrForm.reset({
      ...filter,
      productId:filter.product._id,
      product:filter.product.productName,
      supplier:filter.supplier.bussinessName,
      status:filter.status
    })

    if(filter.status != 'ordered'){
      setDisabled(true)
    }
  
    editRef.current?.showModal()
  }


  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/purchases?id=${masterAccountId}&type=product` 
      const url2 = `/api/web/location?id=${masterAccountId}`
      
      const body = JSON.stringify({})

      fetchLocationsFn.fn(url2,body,(result) => {
				setLocations(result)
			})

      getFn.fn(url,JSON.stringify({}),(result) => {
        setPurchases(result)
      })
    }
  },[masterAccountId])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Receiving</span>
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
                      <th>Status</th>
                      <th>Supplier</th>
                      <th>Final price</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      purchases.map((p,index) => {
                        return (
                          <tr key={index}>
                            <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                            <td>{p.product.productName}</td>
                            <td>{p.quantity} ({p.product.unit})</td>
                            <td>{p.estimatedPrice}</td>
                            <td>{p.status}</td>
                            {
                              p.status === "ordered" || p.status === "completed" ? <td>{p.supplier.bussinessName}</td> : <td>-</td>
                            }
                            {
                              p.status === "ordered" || p.status === "completed" ? <td>{p.finalPrice}</td> : <td>0</td>
                            }
                            <td>
                            <button className="btn" onClick={() => edit(p._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
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
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
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
      <dialog id="my_modal_2" ref={editRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col ">
            <span className="text-2xl">Receive</span>
            <form onSubmit={editPrForm.handleSubmit(editSubmit)} className="h-120 relative flex flex-col gap-3">
              <div className="flex flex-row items-center gap-2">
                <label>Product</label>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly/>
              </div>
              <div className="flex flex-row items-center gap-2">
                <label>Quantity</label>
                <input className="input w-full" {...editPrForm.register("quantity")} type="text" readOnly/>
              </div>
              <div className="flex flex-row items-center gap-2">
                <label>Accumulative</label>
                <input className="input w-full" {...editPrForm.register("accumulative")} type="text"/>
              </div>
              <div className="flex flex-row items-center gap-2">
                <label>Unit cost</label>
                <input className="input w-full" {...editPrForm.register("unitCost")} type="text"/>
              </div>    
              <div className="flex flex-frow items-center gap-2">
                <label>Expiry date</label>
                <input className="input w-full" {...editPrForm.register("expiryDate")} type="date"/>
              </div>
              <div className="flex flex-frow items-center">
                <label>Batch number</label>
                <input value={Date.now()} className="input w-full" {...editPrForm.register("batchNumber")} type="text" readOnly/>
              </div>
              <div className="flex flex-row items-center gap-2">
              <label className="w-[60px]">Location</label>
              <select  {...editPrForm.register("locationId")} className="select flex-1">
                <option>
                  Select Location
                </option>
                {
                  locations.map((location) => {
                    return <option value={location._id} key={location._id}>{location.name}</option>
                  })
                }
              </select>              
              </div>
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
    </>
  )
}
  
type Failed = {
  message:string
}