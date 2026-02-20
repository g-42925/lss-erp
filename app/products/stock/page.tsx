"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import useFetch from "@/hooks/useFetch";
import { useState,useEffect,useRef } from "react"
import { useForm } from "react-hook-form";


export default function Stock(){
  const [mounted, setMounted] = useState<boolean>(false);
	const [stock,setStock] = useState<any[]>([])	
	const [locations,setLocations] = useState<any[]>([])
	const [products,setProducts] = useState<any[]>([])
	const [searchResult,setSearchResult] = useState<any[]>([])
  const [customers,setCustomers] = useState<any[]>([])
  
	const [batchNumber,setBatchNumber] = useState<any>(0)
	const loggedIn = useAuth((state) => state.loggedIn)
	const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
	const masterAccountId = useAuth((state) => state.masterAccountId)	
	const hasHydrated = useAuth((s) => s._hasHydrated)

	const modalRef = useRef<HTMLDialogElement>(null)
	const qModalRef = useRef<HTMLDialogElement>(null)
	
  const openingStockForm = useForm();
  const newQuotationForm = useForm()

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

  var getCustomersFn = useFetch<any,any>({
    url:`/api/web/customers?id=xxx`,
    method:'GET'    
  })
    
  var addQuotationFn = useFetch<any,any>({
    url:'/api/web/quotations',
    method:'POST',
    onError:(m) => {
      alert(m)
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

  function submit(data:any){
    var params = JSON.stringify(
      {
        ...data,
        id:masterAccountId,
        productType:'good'
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

    })
  }

	useEffect(() => {
		if(hasHydrated){
			const url = `/api/web/location?id=${masterAccountId}` 
			const url2 = `/api/web/products?id=${masterAccountId}` 
			const url3 = `/api/web/stock?id=${masterAccountId}` 
      const url4 = `/api/web/customers?id=${masterAccountId}`

			const body = JSON.stringify({})

      getCustomersFn.fn(url3,body,(result) => {
        setCustomers(result)
      })
		 
			fetchLocationsFn.fn(url,body,(result) => {
				setLocations(result)
			})

			fetchProductsFn.fn(url2,body,(result) => {
				setProducts(result)
			})

			getStockFn.fn(url3,body,(r) => {
				setStock(r)
			})

      setMounted(
        true
      )
		}
	},[masterAccountId])	

  if (!mounted) return null;

  return (
    <>
			<div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Stock <span className="text-sm leading-loose">Manage stock</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All stock</span>
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
            <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
          </div>
          {
            getStockFn.loading
            ?
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
            :
            getStockFn.error || getStockFn.noResult
            ?
            <div>
              <p>{getStockFn.message}</p>
            </div>
            :
            <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      <th>Product</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      stock.map((s,index) => {
                        return (
                          <tr key={index}>
                            <td>{s.locationName}</td>
                            <td>{s.product.productName}</td>
                            <td>
                              <Link href={`/batches?pId=${s.product._id}&lId=${s._id.locationId}`}>
                                {s.product.altUnit === "None" ? `${s.remain} ${s.product.unit}` : `${s.remain} ${s.product.altUnit}` }                            
                              </Link>
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
			<dialog ref={modalRef} id="my_modal_1" className="modal h-full">
  			<form onSubmit={openingStockForm.handleSubmit(handleSubmit)} className="modal-box flex flex-col gap-3">
            <h3 className="text-lg font-bold">Add opening stock</h3>
    			  <div className="flex flex-row items-center gap-2">
              <label className="w-[60px]">Location</label>
						  <select  {...openingStockForm.register("locationId")} className="select flex-1">
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
    			  <div className="flex flex-row items-center gap-2">
              <label className="w-[60px]">Product</label>
						  <select  {...openingStockForm.register("productId")} className="select flex-1">
							  <option>
								  Select Product
							  </option>
							  {
								  products.map((p) => {
									  return <option value={p._id} key={p._id}>{p.productName} - ({p.unit})</option>
								  })
							  }
						  </select>              
            </div>
    			  <div className="flex flex-row items-center">
              <label className="w-[150px]">Batch number</label>
              <input  {...openingStockForm.register("batchNumber")} value={Date.now()} type="text" className="input p-3 rounded-md w-full" readOnly/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[80px]">Unit cost</label>
              <input placeholder="submit unit cost here" className="input p-3 rounded-md w-full"  {...openingStockForm.register("unitCost")}/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[110px]">Expiry date</label>
						  <input  {...openingStockForm.register("expiryDate")} type="date" className="input p-3 rounded-md w-full" placeholder="unit cost before tax"/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[60px]">Quantity</label>
              <input  {...openingStockForm.register("qty")} type="text" className="input p-3 rounded-md w-full" placeholder="quantity"/>
            </div>
            <div className="flex flex-row items-center gap-2">
              <label className="w-[255px]">Accumulative quantity</label>
              <input  {...openingStockForm.register("accumulative")} type="text" className="input p-3 rounded-md w-full" placeholder="initial quantity"/>
            </div>
						{openStockFn.noResult || openStockFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
						<div className="flex flex-row gap-3 modal-action">
							<button className="btn bg-red-900 text-white">Submit	</button>
						</div>
  			</form>
			</dialog>
      <dialog ref={qModalRef} id="my_modal_2" className="modal h-full">
        <form onSubmit={newQuotationForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
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
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quantity</label>
            <input {...newQuotationForm.register("qty")} type="text" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Expired</label>
            <input {...newQuotationForm.register("expiredDate")} type="date" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Discount</label>
            <input {...newQuotationForm.register("discount")} type="text" className="input flex-1"/>
          </div>
          {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
			</dialog>    
    </>
  )
}

