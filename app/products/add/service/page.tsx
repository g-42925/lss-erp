"use client"

import Link from "next/link";
import { useEffect, useState,useRef } from "react";
import Sidebar from '@/components/sidebar'
import useAuth from "@/store/auth";
import useFetch from "@/hooks/useFetch";

import { useForm } from "react-hook-form"


export default function Add(){
  const [file,setFile] = useState<File|null>(null)
  const [fileName,setFileName] = useState<string>('')
  const [previewUrl,setPreviewUrl] = useState('')
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const [categories,setCategories] = useState<any[]>([])
  const [units,setUnits] = useState<any[]>([])


  const productForm = useForm()

  var getUnitsFn = useFetch<any[],any>({
    url:`/api/web/unit?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })	

  var getCategoriesFn = useFetch<any[],any>({
    url:`/api/web/categories?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })

  var addProductsFn = useFetch<any,FormData>({
    url:`/api/web/products`,
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  async function setPreview(e:any){
    const file = e.target.files[0]
    setPreviewUrl(URL.createObjectURL(file))
    setFile(file)
    setFileName(file.name)
  }

  async function handleSubmit(data:any){
    const formData = new FormData();

    formData.append("command","addProduct")
    formData.append("file",file as any)
    formData.append("id",masterAccountId)

    Object.keys(data).forEach((key) => {
      formData.append(key,data[key])
    })

    addProductsFn.fn(`/api/web/products`,formData,(r) => {
      console.log({r})
    })
  
  }
  
  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/categories?id=${masterAccountId}`
      const url2 = `/api/web/unit?id=${masterAccountId}`
      getCategoriesFn.fn(url,JSON.stringify({}),(r) => {
        setCategories(r)
      })
      getUnitsFn.fn(url2,JSON.stringify({}),(r) => {
        setUnits(r)
      })
    }
  },[masterAccountId])  

  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Add new service</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-row p-6 gap-6 divide-x">
          <form onSubmit={productForm.handleSubmit(handleSubmit)} className="flex flex-1 flex-col gap-3 p-6">
            {
              addProductsFn.error 
              ?
              <div className="bg-red-900 text-white p-3 rounded-md">
                product upload failed
              </div>
              :
              <></>
            }
            <div className="flex flex-row gap-3">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Service name</legend>
                <input {...productForm.register("productName")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Service Id</legend>
                <input readOnly value={`S-${String(Date.now()).slice(-5)}`} {...productForm.register("productId")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Category</legend>
                <select {...productForm.register("category")} className="select w-full">
                  <option disabled selected>Pick a category</option>
                  {
                    categories.map((c) => {
                      return (
                        <option key={c._id}>{c.name}</option>
                      )
                    })
                  }
                  
                </select>              
              </fieldset>
            </div>
            <div className="flex flex-row gap-6">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Description</legend>    
                <textarea {...productForm.register("description")} className="textarea w-full" placeholder="Bio"></textarea>            
              </fieldset>
              <div className="flex-1 flex flex-col gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Product Image</legend>    
                  <div className="w-full flex flex-col justify-center items-center h-[80px] border-2 border-dashed border-gray-400 overflow-hidden">
                    <input onChange={(e) => setPreview(e)} type="file" className="h-full w-full opacity-0" />
                    { fileName == '' ? <span className="absolute">upload here</span> : <span className="absolute overflow-hidden ellipsis">{fileName}</span> } 
                  </div> 
                </fieldset> 
              </div>
            </div>
            <div className="flex flex-row gap-3">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Applicable tax</legend>
                <select {...productForm.register("applicableTax")} className="select w-full">
                  <option>PPN11</option>
                </select>              
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Selling price tax type</legend>
                <select {...productForm.register("sellingPriceTaxType")} className="select w-full">
                  <option>Excluded</option>
                  <option>Included</option>
                </select>              
              </fieldset>
            </div>
            <div className="flex flex-row gap-3">
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Product type</legend>
                <input value="service" {...productForm.register("productType")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>  
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Price</legend>
                <input value="0" {...productForm.register("sellingPrice")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>      
            </div>
            <div className="flex flex-row gap-3">
              <button disabled={addProductsFn.loading} type="submit" className={`flex-1 p-3 rounded-full bg-black relative text-white w-full ${addProductsFn.loading ? 'cursor-not-allowed bg-red-900' : ''}`}>
                Submit
              </button>
              <button disabled={addProductsFn.loading} type="submit" className="p-3 rounded-full bg-black relative text-white">
                <Link href="/products/list">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>                
                </Link>
              </button>
              <button disabled={addProductsFn.loading} type="submit" className="p-3 rounded-full bg-black relative text-white">
                <Link href="/products/add/good">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </Link>
              </button>
            </div>
          </form>
          {
            previewUrl != '' 
            ?
            <div className="w-1/4 flex flex-col justify-center items-center">
              <img className="rounded-md" src={previewUrl}/>
            </div>
            :
            <></>
          }
        </div>
      </div>

      <div className="modal">
        <div className="modal-box p-0 bg-transparent shadow-none">
          <label htmlFor="lightbox-modal" className="btn btn-sm btn-circle absolute right-2 top-2 z-50">✕</label>
          <img id="lightbox-image" src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgVfHORQFLyUf_rNove-xUmxIskDeMJ63REz_YIMQ6S0vCyQdkBvJos4igKspvCgpqnpy8h0xM--1uckzZIxDgyoHy37-MowkF-YzvVx8&s=10" className="w-full max-w-3xl mx-auto" />
        </div>
      </div>

    </Sidebar>
  )
}