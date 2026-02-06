"use client"

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
        <span className="text-2xl">Add new product</span>
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
                <legend className="fieldset-legend">Product name</legend>
                <input {...productForm.register("productName")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Product Id</legend>
                <input readOnly value={`P-${String(Date.now()).slice(-5)}`} {...productForm.register("productId")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Barcode type</legend>
                <select {...productForm.register("barcodeType")} className="select w-full">
                  <option disabled selected>Pick a barcode type</option>
                  <option>UPC</option>
                  <option>EAN-13</option>
                  <option>EAN-8</option>
                  <option>CODE 128</option>
                  <option>CODE 39</option>
                  <option>ITF</option>
                  <option>QR Code</option>
                </select>              
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
                <legend className="fieldset-legend">Packaging</legend>
                <select {...productForm.register("unit")} className="select w-full">
                  {
										units.map((c) => {
											return (
												<option key={c._id}>{c.name}</option>
											)
										})
									}
                </select>              
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Unit</legend>
                <select {...productForm.register("altUnit")} className="select w-full">
                  <option selected>None</option>
                  {
										units.map((c) => {
											return (
												<option key={c._id}>{c.name}</option>
											)
										})
									}
                </select>              
              </fieldset>
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
                <input value="good" {...productForm.register("productType")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>  
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend">Price</legend>
                <input {...productForm.register("sellingPrice")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>      
            </div>
            <div className="flex flex-row gap-3">
              <button disabled={addProductsFn.loading} type="submit" className={`p-3 rounded bg-black relative text-white w-full ${addProductsFn.loading ? 'cursor-not-allowed bg-red-900' : ''}`}>
                Submit
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