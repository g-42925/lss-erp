"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef,useState,useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function Delivery(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [batches,setBatches] = useState<any[]>([])
  const [limit,setLimit] = useState<number>(-1)
  const [deliveries,setDeliveries] = useState<any[]>([])

  const newPrForm = useForm()
  const editPrForm = useForm()
  const router = useRouter()

  const status = editPrForm.watch('status');

  const addFn = useFetch<any,any>({
    url:'/api/web/delivery',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var getDeliveries = useFetch<any[],any>({
    url:`/api/web/delivery?id=xxx`,
    method:'GET'
  })

  var getBatchesFn = useFetch<any,any>({
    url:`/api/web/delivery?id=xxx`,
    method:'GET'
  })

  async function submit(data:any){
    if(parseInt(data.qty) > limit){
      alert('can not deliver more than order qty')
    }
    else{
      var [locId,batchNumber,remain] = data.batchDetail.split('/')
      
      if(parseInt(data.qty) > remain){
        alert('can not deliver more than remain qty')
      }
      else{
        var params = {
          locationId:locId,
          batchNumber:batchNumber,
          qty:parseInt(data.qty),
          salesOrderNumber:data.salesOrderNumber,
          date:new Date(),
          id:masterAccountId
        }

        await addFn.fn('',JSON.stringify(params),r => {
          newPrForm.reset({salesOrderNumber:''})
          setDeliveries([r,...deliveries])
          setLimit(-1)
          modalRef.current?.close()
        })
      }
    }
  }

  async function search(v:string){
    
  }

  function getBatches(salesOrderNumber:string){
    var url = `/api/web/delivery?so=${salesOrderNumber}&f=x`

    getBatchesFn.fn(url,JSON.stringify({}),result => {
      setBatches(result.batches)
      setLimit(result.limit)
    })
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/delivery?id=${masterAccountId}&f=all&id=${masterAccountId}` 

      getDeliveries.fn(url,JSON.stringify({}),(result) => {
        setDeliveries(result)
        setLimit(0)
      })
    }
  },[masterAccountId])

  if(!hasHydrated) return null
  if(!loggedIn) router.push('/login')
  if(!isSuperAdmin) router.push('/dashboard')
  
  
  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Deliveries</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">Deliveries status</span>
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
            getDeliveries.loading
            ?
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
            :
            getDeliveries.error || getDeliveries.noResult
            ?
            <div>
              <p>{getDeliveries.message}</p>
            </div>
            :
            <div>
                <table className="table text-center">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Delivery Number</th>
                      <th>Sales Order Number</th>
                      <th>Location</th>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      deliveries.map((p,index) => {
                        return (
                          <tr key={index}>
                            <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                            <td>{p.deliveryNumber}</td>
                            <td>{p.salesOrderNumber}</td>
                            <td>{p.location.name}</td>
                            <td>{p.order.product.productName}</td>
                            <td>{p.order.customer.bussinessName}</td>
                            <td>{p.qty}</td>
                            <td>
                              <button className="cursor">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                  <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                                  <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
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
                              <button className="btn">
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
      <dialog id="my_modal_1" ref={modalRef} className="modal">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Make delivery info</span>
            <form onSubmit={newPrForm.handleSubmit(submit)} className="h-92 relative flex flex-col gap-3">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Sales Order Number</legend>    
                  <input onKeyUp={(e) => getBatches(e.target.value)} {...newPrForm.register("salesOrderNumber")} className="input w-full"/>
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Batch</legend>
                  <select {...newPrForm.register("batchDetail")} className="select w-full">
                    <option>...</option>
                    {
                      batches.map((b,index) => {
                        return  <option value={`${b.locationId}/${b.batchNumber}/${b.remain}`} key={index}>{`${b.location.name} - ${b.batchNumber} (${b.remain})`}</option>
                      })
                    }
                  </select>
                </fieldset>
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Quantity</legend>    
                  <input {...newPrForm.register("qty")} className="input w-full"/>
                  { limit > -1 ? <p className="label">max qty {limit}</p> : <></> }
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
      <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
        <Link href="/xpurchases">
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