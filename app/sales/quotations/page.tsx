"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'

import { useForm } from 'react-hook-form'
import { useRef,useEffect, useState } from 'react'

function Q({toggle}:any){
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

    var eD = new Date(q.expiredDate).toISOString().split("T")[0]
    
    editQuotationForm.reset({
      _id:q._id,
      productId:q.productId,
      customerId:q.customerId,
      qty:q.qty,
      discount:q.discount,
      expiredDate:eD
    })

    editRef.current?.showModal()
  }

  function editSubmit(data:any){
    var q = JSON.stringify(
      {
        ...data,
        id:masterAccountId
      }
    )

    editQuotationsFn.fn('',q,(result) => {
      var [target] = quotations.filter((q) => q._id === data._id)

      target.product = result.product
      target.productId = result.productId
      target.customer = result.customer
      target.customerId = result.customerId
      target.qty = result.qty
      target.discount = result.discount
      target.taxType = result.taxType
      target.price = result.price
      target.discount = result.discount
      target.expiredDate = result.expiredDate

      editRef.current?.close()
    })
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

      setQuotations([
        q,
        ...quotations
      ])

      modalRef.current?.close()
    })
  }

  function tax(total:number,cart:any[],discountType:string,discountValue:number){
    var ppns = cart.map(c => {
      if(cart.length < 2){
        console.log("apa bedanya")
        if(discountType === "fixed"){
          return 0         
        }
      }
      else{
        if(c.tax){
          if(discountType === "fixed"){
            return (c.subTotal - (discountValue * (c.subTotal / total))) * 0.11
          }
          else{
            // perhitungan diskon persen
          }
        }
      }
    })

    return ppns.reduce((a,b) => a + b,0)
  
  } 

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/quotations?id=${masterAccountId}&type=good` 
      const url2 = `/api/web/products?id=${masterAccountId}&type=good`
      const url3 = `/api/web/customers?id=${masterAccountId}`

      const body = JSON.stringify({})

      getCustomersFn.fn(url3,body,(result) => {
        setCustomers(result)
      })

      getQuotationsFn.fn(url,body,(result) => {})

      getProductsFn.fn(url2,body,(result) => {
        setProducts(result)
      })
    }
  },[masterAccountId])

  return (
    <>
      <div className="h-full p-6 h-full flex flex-col gap-3">
        <span className="text-2xl">Product Quotation <span className="text-sm leading-loose"></span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center">All quotation</span>
            <button onClick={toggle} className="btn ml-auto">
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
                <table className="table text-center">
                  <thead>
                    <tr>
                      <th>Q-Number</th>
                      <th>Product</th>
                      <th>Customer</th>
                      <th>Quantity</th>
                      <th>Price</th>
                      <th>Discount</th>
                      <th>Tax</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      getQuotationsFn?.result?.map((s,index) => {
                        return (
                          <tr key={index}>
                            <td>{s.quotationNumber}</td>
                            <td>{s.variousItem ? "various item" :s.product.productName}</td>
                            <td>{s.customer.bussinessName}</td>
                            <td>{s.variousItem ? "?": s.cart[0].qty} {s.variousItem ? "":`${s.product.warehouseUnit}`}</td>
                            <td>{s.price}</td>
                            <td>{s.discountType === "percent" ? `${s.discountValue}%` : s.discountValue}</td>
                            <td>{tax(s.price,s.cart,s.discountType,s.discountValue)}</td>
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
      <dialog ref={editRef} id="my_modal_1" className="modal h-full">
        <form onSubmit={editQuotationForm.handleSubmit(editSubmit)} className="h-100 w-[500px] modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make quotation</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Product</label>
            <select disabled {...editQuotationForm.register("productId")} className="select flex-1">
              {
                products.map((p) => {
                  return <option value={p._id} key={p._id}>{p.productName} ({p.warehouseUnit})</option>
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
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Quantity</label>
            <input {...editQuotationForm.register("qty")} type="text" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Expired</label>
            <input {...editQuotationForm.register("expiredDate")} type="date" className="input flex-1"/>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Discount</label>
            <input {...editQuotationForm.register("discount")} type="text" className="input flex-1"/>
          </div>
          {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>	
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full">
        <form onSubmit={newQuotationForm.handleSubmit(submit)} className="h-100 w-[500px] modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make quotation</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Product</label>
            <select {...newQuotationForm.register("productId")} className="select flex-1">
              {
                products.map((p) => {
                  return <option value={p._id} key={p._id}>{p.productName} (${p.altUnit})</option>
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
      <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
        <Link href="/sales/qservices">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </Link>
      </button>    
    </>
  )
}

function Stock({customers,pop,product,getAvailableList,availableList}:any){
  const masterAccountId = useAuth((state) => state.masterAccountId)	
 
  const [cart,setCart] = useState<any[]>([])
  const [customer,setCustomer] = useState<string>('')
  const [discount,setDiscount] = useState<string>('')

  const newQuotationForm = useForm()
  
  var addQuotationFn = useFetch<any,any>({
    url:'/api/web/quotations',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  function addToCart(data:any){
    const [productId,productName,sellingPrice,discountType,discountValue] = data.product.split('/')

    const product = {productId,productName}
    const tax = data.tax === 'yes' ? true : false
    const subTotal = discountType === "percent" ? (sellingPrice * data.qty) * (discountValue/100) : (sellingPrice * data.qty) - (discountValue * data.qty)
    const [filter] = cart.filter(c => c.product.productId === productId)
    
    var item = {product:{...product,qty:data.qty},tax,subTotal}

    if(filter){ 
      var newCart = cart.filter(c =>  c.product.productId != productId)

      setCart(
        [
          item,
          ...newCart
        ]
      )
    }
    else{
      setCart(
        [
          item,
          ...cart
        ]
      )
    }
  }

  function done(){
    var id = masterAccountId
    var customerId = customer
    var discountType = discount.includes("%") ? 'percent' : 'fixed'
    var discountValue = discount.includes("%") ? parseInt(discount)  : parseInt(discount)

    var _cart = cart.map((c) => {
      return {
        productId:c.product.productId,
        qty:c.product.qty,
        tax:c.tax,
        subTotal:c.subTotal
      }
    })

    var params = {
      customerId,
      discountType,
      discountValue,
      cart:_cart,
      id,
    }

    addQuotationFn.fn('',JSON.stringify(params),r => {
      pop()
    })
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Product Quotation</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-row relative divide-x">
          <div className="flex flex-col gap-3 divide-y p-3">
            <form className="flex flex-col p-6 gap-3">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Customer</label>
                <select {...newQuotationForm.register('customerId', {onChange:(e) => setCustomer(e.target.value)})}  className="select w-full">
                  <option>Available Customer:</option>
                  {
                    customers?.map((c) => {
                      return (
                        <option key={c._id} value={c._id}>
                          {c.bussinessName}
                        </option>
                      )
                    })
                  }
                </select> 
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Discount</label>
                <input {...newQuotationForm.register('discount',{onChange:(e) => setDiscount(e.target.value)})} placeholder="quantity" type="text" className="input flex-1"/>
              </div>              
            </form>      
            <form onSubmit={newQuotationForm.handleSubmit(addToCart)} className="flex-1 flex flex-col gap-3 p-6">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Product</label>
                <select {...newQuotationForm.register('product',{onChange:(e) => getAvailableList(e.target.value.split('/')[0])})}  className="select w-full">
                  <option>Available Product:</option>
                  {
                    product?.map((p) => {
                      return (<option key={p._id} value={`${p._id}/${p.productName}/${p.sellingPrice}/${p.discountType}/${p.discountValue}`}>{p.productName} ({p.warehouseUnit})</option>)
                    })
                  }
                </select> 
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Location</label>
                <select {...newQuotationForm.register('locationId')} className="select w-full">
                  <option>Available Location:</option>  
                  {
                    availableList?.map((l) => {
                      return (
                        <option key={l._id}>{l.locationName} ({l.remain})</option>
                      )
                    })
                  }                
                </select> 
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[70px]">Qty</label>
                <input {...newQuotationForm.register('qty')} placeholder="quantity" type="text" className="input flex-1"/>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[85px]">Tax</label>
                <select {...newQuotationForm.register('tax')} className="select w-full">
                  <option>
                    yes
                  </option>
                  <option>
                    no
                  </option>
                </select> 
              </div>
              <div className="flex flex-row gap-2 mt-6">
                <button type="submit" className="bg-black p-3 rounded-md text-white w-full">
                  add
                </button>  
                <button onClick={done} type="button" className="bg-black p-3 rounded-md text-white w-full">
                  done
                </button>  
                <button onClick={pop} type="button" className="bg-red-900 p-3 rounded-md text-white w-full">
                  cancel
                </button>  
              </div>  
            </form>
          </div>
          <div className="flex-1 flex flex-col divide-y p-6">
            <div className="p-3">
              <p className="py-4 font-bold text-red-900">Please review your quotation once more</p>
              <ul className="flex flex-col">
                {
                  cart.map(c => {
                    return <li key={c.product.productId}>{c.product.productName}@{c.product.qty} {c.tax ? '(with tax)':''}</li>
                  })
                }
              </ul>              
            </div>
            <div className="p-3">
            </div>
          </div>
        </div>
      </div>         
    </>
  )
}

// function Stock({pop}:any){
//   const [mounted, setMounted] = useState<boolean>(false);
// 	const [stock,setStock] = useState<any[]>([])	
// 	const [locations,setLocations] = useState<any[]>([])
// 	const [products,setProducts] = useState<any[]>([])
// 	const [searchResult,setSearchResult] = useState<any[]>([])
//   const [customers,setCustomers] = useState<any[]>([])
  
// 	const [batchNumber,setBatchNumber] = useState<any>(0)
// 	const loggedIn = useAuth((state) => state.loggedIn)
// 	const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
	// const masterAccountId = useAuth((state) => state.masterAccountId)	
// 	const hasHydrated = useAuth((s) => s._hasHydrated)

// 	const modalRef = useRef<HTMLDialogElement>(null)
// 	const qModalRef = useRef<HTMLDialogElement>(null)
	
//   const openingStockForm = useForm();
//   const newQuotationForm = useForm()

//   async function search(v:string){
//     if(v.length > 0){
//       var result = locations.filter((r) => {
//         return r.name.includes(v)
//       })

//       if(result.length > 0){
//         setSearchResult(
//           [
//             ...result
//           ]
//         )
//       }
//       else{
//         setSearchResult(
//           []
//         )
//       }
//     }
//     else{
//       setSearchResult(
//         []
//       )
//     }
//   }

  // var getCustomersFn = useFetch<any,any>({
  //   url:`/api/web/customers?id=xxx`,
  //   method:'GET'    
  // })
    
  // var addQuotationFn = useFetch<any,any>({
  //   url:'/api/web/quotations',
  //   method:'POST',
  //   onError:(m) => {
  //     alert(m)
  //   }
  // })

// 	var openStockFn = useFetch<any,any>({
// 		url:`/api/web/stock`,
// 		method:'POST',
//     onError:(m) => {
//       alert(m)
//     }
// 	})

// 	var getStockFn = useFetch<any,any>({
// 		url:`/api/web/stock`,
// 		method:'GET'
// 	})

// 	function handleSubmit(data:any){
// 		const body = JSON.stringify({
// 			...data,
// 			status:'ACTIVE',
// 			isOpening:true,
// 			outQty:0
// 		})

// 		openStockFn.fn('',body,(result) => {
//       setStock([
//         ...stock,
//         result
//       ])

//       modalRef.current?.close()
// 		})
// 	}

// 	function makeBatchNumber(){
// 		return `BAT-${new Date().toISOString().slice(0,10)}-${Date.now()}`;
// 	}
	
// 	var fetchLocationsFn = useFetch<any[],any>({
// 		url:`/api/web/location?id=xxx`,
// 		method:'GET'
// 	})

// 	var fetchProductsFn = useFetch<any[],any>({
// 		url:`/api/web/products?id=xxx`,
// 		method:'GET',
// 		onError:(m) => {
// 			console.log(m)
// 		}
// 	})

//   function toggle(){
//     setBatchNumber(Date.now())
//     modalRef.current?.showModal()
//   }

//   function submit(data:any){
//     if(parseInt(data.qty) > data.remaining){
//       alert('can not be more than avalaible qty')
//     }
//     else{
//       var discountType = data.discount.includes("%") ? 'percent':'fixed'
//       var discountValue = parseInt(data.discount)
//       var params = {...data,discountType,discountValue}
//       var {discount,...rest} = params

//       addQuotationFn.fn('',JSON.stringify(rest),r => {
//         pop()
//       })
//     }
//   }

//   function qModalRefShow(s:any){
//     newQuotationForm.reset({
//       productId:s.product._id,
//       remaining:s.remain,
//       locationId:s._id.locationId,
//       productType:'good',
//       id:masterAccountId
//     })
//     qModalRef.current?.show()
//   }

// 	useEffect(() => {
// 		if(hasHydrated){
// 			const url = `/api/web/location?id=${masterAccountId}` 
// 			const url2 = `/api/web/products?id=${masterAccountId}&type=good` 
// 			const url3 = `/api/web/stock?id=${masterAccountId}` 
//       const url4 = `/api/web/customers?id=${masterAccountId}`

// 			const body = JSON.stringify({})

//       getCustomersFn.fn(url4,body,(result) => {
//         setCustomers(result)
//       })
		 
// 			fetchLocationsFn.fn(url,body,(result) => {
// 				setLocations(result)
// 			})

// 			fetchProductsFn.fn(url2,body,(result) => {
// 				setProducts(result)
// 			})

// 			getStockFn.fn(url3,body,(r) => {
//         console.log({r})
// 				setStock(r)
// 			})

//       setMounted(
//         true
//       )
// 		}
// 	},[masterAccountId])	
  

//   if (!mounted) return null;

//   return (
//     <>
// 			<div className="h-full p-6 flex flex-col gap-3">
//         <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
//           <div className="flex flex-row">
//             <span className="self-center">All stock</span>
// 						<button onClick={pop} className="btn ml-auto">
//               Back
//             </button>
//           </div>
//           <div className="flex flex-row">
//             <div className="flex flex-row gap-2 items-center">
//               Show
//               <select className="select w-16">
//                 <option>20</option>
//                 <option>30</option>
//                 <option>40</option>
//               </select>
//               Entries
//             </div>
//             <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
//           </div>
//           {
//             getStockFn.loading
//             ?
//             <div className="flex-1 flex flex-col justify-center items-center">
//               <span className="loading loading-spinner loading-xl"></span>
//             </div>
//             :
//             getStockFn.error || getStockFn.noResult
//             ?
//             <div>
//               <p>{getStockFn.message}</p>
//             </div>
//             :
//             <div>
//                 <table className="table">
//                   <thead>
//                     <tr>
//                       <th>Location</th>
//                       <th>Product</th>
//                       <th>Remaining</th>
//                       <th>...</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {
//                       searchResult.length < 1
//                       ?
//                       stock.map((s,index) => {
//                         return (
//                           <tr key={index}>
//                             <td>{s.locationName}</td>
//                             <td>{s.product.productName}</td>
//                             <td>
//                               <Link href={`/batches?pId=${s.product._id}&lId=${s._id.locationId}`}>
//                                 {s.remain} ({s.product.warehouseUnit})                        
//                               </Link>
//                             </td>
//                             <td>
//                               <button onClick={() => qModalRefShow(s)}>
//                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
//                                   <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
//                                 </svg>
//                               </button>
//                             </td>        
//                           </tr>
//                         )
//                       })
//                       :
//                       searchResult.map((role,index) => {
//                         return (
//                           <tr key={index}>
//                             <td>{role.name}</td>
//                             <td className="flex flex-row gap-3">
//                               <button className="btn">
//                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
//                                   <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
//                                 </svg>
//                                 Edit
//                               </button>
//                               <button className="btn">
//                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
//                                   <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
//                                 </svg>
//                                   Delete
//                               </button>
//                             </td>
//                           </tr>
//                         )
//                       })              
//                     }
//                   </tbody>
//                </table>
//             </div>
//           }
//         </div>
//       </div>
//       <dialog ref={qModalRef} id="my_modal_2" className="modal h-full">
//         <form onSubmit={newQuotationForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
//           <h3 className="text-lg font-bold">Make quotation</h3>
//           <div className="flex flex-row items-center gap-2">
//             <label className="w-[70px]">Product</label>
//             <select disabled {...newQuotationForm.register("productId")} className="select flex-1">
//               {
//                 products.map((p) => {
//                   return <option value={p._id} key={p._id}>{p.productName} ({p.warehouseUnit})</option>
//                 })
//               }
//             </select>              
//           </div>
//           <div className="flex flex-row items-center gap-2">
//             <label className="w-[70px]">Customer</label>
//             <select {...newQuotationForm.register("customerId")} className="select flex-1">
//               <option>...</option>
//               {
//                 customers.map((c) => {
//                   return <option value={c._id} key={c._id}>{c.bussinessName}</option>
//                 })
//               }
//             </select>              
//           </div>
//           <div className="flex flex-row items-center gap-3">
//             <label className="w-[70px]">Quantity</label>
//             <input {...newQuotationForm.register("qty")} type="text" className="input flex-1"/>
//           </div>
//           <div className="flex flex-row items-center gap-3">
//             <label className="w-[70px]">Expired</label>
//             <input {...newQuotationForm.register("expiredDate")} type="date" className="input flex-1"/>
//           </div>
//           <div className="flex flex-row items-center gap-3">
//             <label className="w-[70px]">Discount</label>
//             <input {...newQuotationForm.register("discount")} type="text" className="input flex-1"/>
//           </div>
//           {addQuotationFn.noResult || addQuotationFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
//           <div className="flex flex-row gap-3 modal-action">
//             <button className="btn bg-red-900 text-white">Submit</button>
//           </div>
//         </form>
// 			</dialog>	    
//     </>
//   )
// }

export default function Quotation(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [onQMode,setOnQMode] = useState<boolean>(false)
  const [availableList,setAvailableList] = useState<any[]>()

  var getProductsFn = useFetch<any,any>({
    url:`/api/web/products?id=xxx`,
    method:'GET'    
  }) 

  var getStockFn = useFetch<any,any>({
		url:`/api/web/stock`,
		method:'GET'
	})

  var getCustomersFn = useFetch<any,any>({
    url:`/api/web/customers?id=xxx`,
    method:'GET'    
  })

  function toggle(){
    setOnQMode(!onQMode)
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/quotations?id=${masterAccountId}&type=good` 
      const url2 = `/api/web/products?id=${masterAccountId}&type=good`
 			const url3 = `/api/web/stock?id=${masterAccountId}` 
      const url4 = `/api/web/customers?id=${masterAccountId}`

      const body = JSON.stringify({})

      getProductsFn.fn(url2,body,_ => {})
			getStockFn.fn(url3,body,_ => {})
      getCustomersFn.fn(url4,body,_ => {})
    }
  },[masterAccountId])

  function getAvailableList(v:string){
    var list = getStockFn?.result?.filter(s => {
      return s._id.productId === v
    })

    setAvailableList(
      list
    )
  }

  if(!onQMode){
    return (
      <Q toggle={toggle}></Q>
    )
  }
  else{
    return (
      <Stock 
        availableList={availableList} 
        getAvailableList={getAvailableList} 
        product={getProductsFn.result} 
        customers={getCustomersFn.result}
        pop={toggle}
      />
    )
  }
}