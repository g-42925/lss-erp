/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form"

import Link from "next/link";
import useAuth from "@/store/auth";
import useFetch from "@/hooks/useFetch";

import { useRouter } from "next/navigation";
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon } from '@hugeicons/core-free-icons';



export default function Add() {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState('')
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const [categories, setCategories] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [packagings, setPackagings] = useState<any[]>([])

  const router = useRouter()

  const productForm = useForm()
  const newCategoryForm = useForm()
  const newUnitForm = useForm()

  const conversionType = productForm.watch("conversionType") || "value";
  const getUnitsFn = useFetch<any[], any>({
    url: `/api/web/unit?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getCategoriesFn = useFetch<any[], any>({
    url: `/api/web/categories?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getPackagingsFn = useFetch<any[], any>({
    url: `/api/web/packaging?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const addCategoryFn = useFetch<any, any>({
    url: '/api/web/categories',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const addUnitFn = useFetch<any, any>({
    url: '/api/web/unit',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const addProductsFn = useFetch<any, FormData>({
    url: `/api/web/products`,
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  async function setPreview(e: any) {
    const file = e.target.files[0]
    setPreviewUrl(URL.createObjectURL(file))
    setFile(file)
    setFileName(file.name)
  }

  async function submitCategory(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
    })

    await addCategoryFn.fn('', body, (c) => {
      const modal = document.getElementById('my_modal_category') as HTMLDialogElement;
      if (modal) modal.close();
      setCategories([...categories, c])
      newCategoryForm.reset()
      productForm.setValue('category', c.name) // automatically select it
    })
  }

  function openCategoryModal() {
    const modal = document.getElementById('my_modal_category') as HTMLDialogElement;
    if (modal) modal.showModal();
  }

  async function submitUnit(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
    })

    await addUnitFn.fn('', body, (c) => {
      const modal = document.getElementById('my_modal_unit') as HTMLDialogElement;
      if (modal) modal.close();
      setUnits([...units, c])
      newUnitForm.reset()
      productForm.setValue('conversionRatioX', c.name)
    })
  }

  function openUnitModal() {
    const modal = document.getElementById('my_modal_unit') as HTMLDialogElement;
    if (modal) modal.showModal();
  }

  async function handleSubmit(data: any) {
    const formData = new FormData();

    formData.append("command", "addProduct")
    formData.append("file", file as any)
    formData.append("id", masterAccountId)

    Object.keys(data).forEach((key) => {
      formData.append(key, data[key])
    })

    addProductsFn.fn(`/api/web/products`, formData, (r) => {
      window.location.href = '/products/catalog'
    })

  }

  useEffect(() => {
    productForm.setValue("productId", `P-${String(Date.now()).slice(-5)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/categories?id=${masterAccountId}`
      const url2 = `/api/web/unit?id=${masterAccountId}`
      const urlPackaging = `/api/web/packaging?id=${masterAccountId}`
      getCategoriesFn.fn(url, JSON.stringify({}), (r) => {
        setCategories(r)
      })
      getUnitsFn.fn(url2, JSON.stringify({}), (r) => {
        setUnits(r)
      })
      getPackagingsFn.fn(urlPackaging, JSON.stringify({}), (r) => {
        setPackagings(r)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterAccountId, hasHydrated])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Add new product</span>
        <div className="bg-white h-fit border-t-4 border-blue-900 flex flex-col lg:flex-row p-4 lg:p-6 gap-6 lg:divide-x relative">
          <form onSubmit={productForm.handleSubmit(handleSubmit)} className="flex flex-1 flex-col gap-3 p-0 lg:p-6">
            {
              addProductsFn.error
                ?
                <div className="bg-red-900 text-white p-3 rounded-md">
                  product upload failed
                </div>
                :
                <></>
            }
            <div className="flex flex-col lg:flex-row gap-3">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">Product name</legend>
                <input {...productForm.register("productName")} type="text" className="input w-full bg-white" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Product Id</legend>
                <input readOnly {...productForm.register("productId")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend text-black">Barcode type</legend>
                <select {...productForm.register("barcodeType")} className="select w-full bg-white">
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
                <legend className="fieldset-legend text-black">Category</legend>
                <div className="flex gap-2 w-full">
                  <select {...productForm.register("category")} className="select flex-1 bg-white">
                    {
                      categories.map((c) => {
                        return (
                          <option key={c._id}>{c.name}</option>
                        )
                      })
                    }
                  </select>
                  <button type="button" onClick={openCategoryModal} className="btn bg-blue-900 text-white rounded-md px-4">
                    +
                  </button>
                </div>
              </fieldset>
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">Description</legend>
                <textarea {...productForm.register("description")} className="textarea w-full bg-white" placeholder="Bio"></textarea>
              </fieldset>
              <div className="flex-1 flex flex-col gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend text-black">Product Image</legend>
                  <div className="w-full flex flex-col justify-center items-center h-[80px] border-2 border-dashed border-gray-400 overflow-hidden">
                    <input onChange={(e) => setPreview(e)} type="file" className="h-full w-full opacity-0" />
                    {fileName == '' ? <span className="absolute">upload here</span> : <span className="absolute overflow-hidden ellipsis">{fileName}</span>}
                  </div>
                </fieldset>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">From</legend>
                <div className="flex gap-2 w-full">
                  <select {...productForm.register("conversionRatioX")} className="select flex-1 bg-white">
                    {
                      units.map((c) => {
                        return (
                          <option key={c._id}>{c.name}</option>
                        )
                      })
                    }
                  </select>
                </div>
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">To</legend>
                <div className="flex gap-2 w-full">
                  <select {...productForm.register("conversionRatioY")} className="select flex-1 bg-white">
                    {
                      units.map((c) => {
                        return (
                          <option key={c._id}>{c.name}</option>
                        )
                      })
                    }
                  </select>
                  <button type="button" onClick={openUnitModal} className="btn bg-blue-900 text-white rounded-md px-4">
                    +
                  </button>
                </div>
              </fieldset>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">Conversion Type</legend>
                <div className="flex gap-2 w-full mt-2 items-center">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-md border text-black text-sm">
                    <input {...productForm.register("conversionType")} type="radio" value="value" className="radio radio-sm" />
                    Conversion Value
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-md border text-black text-sm">
                    <input {...productForm.register("conversionType")} type="radio" value="packaging" className="radio radio-sm" />
                    Packaging Options
                  </label>
                </div>
              </fieldset>
              {conversionType === "value" && (
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend text-black">Conversion Value (Integer)</legend>
                  <input {...productForm.register("conversionValue", { valueAsNumber: true })} type="number" className="input w-full bg-white" placeholder="e.g. 12" />
                </fieldset>
              )}
              {conversionType === "packaging" && (
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend text-black">Select Packaging</legend>
                  <select {...productForm.register("packagingId")} className="select w-full bg-white">
                    <option value="">Select an option...</option>
                    {
                      packagings.map((p) => {
                        return (
                          <option key={p._id} value={p._id}>{p.name} (Qty: {p.qty})</option>
                        )
                      })
                    }
                  </select>
                </fieldset>
              )}
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend text-black">Applicable tax</legend>
                <select {...productForm.register("applicableTax")} className="select w-full bg-white">
                  <option selected>No</option>
                  <option>PPN11</option>
                </select>
              </fieldset>
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Discount type</legend>
                <select {...productForm.register("discountType")} className="select w-full">
                  <option selected>fixed</option>
                  <option>percentage</option>
                  <option>none</option>
                </select>
              </fieldset>
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Selling price tax type</legend>
                <select {...productForm.register("sellingPriceTaxType")} className="select w-full">
                  <option selected>Excluded</option>
                  <option>Included</option>
                </select>
              </fieldset>
            </div>
            <div className="flex flex-row lg:flex-row gap-3">
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Product type</legend>
                <input value="good" {...productForm.register("productType")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">Price</legend>
                <input {...productForm.register("sellingPrice")} type="text" className="input w-full bg-white" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1 hidden">
                <legend className="fieldset-legend">Discount value</legend>
                <input value="0" {...productForm.register("discountValue")} type="text" className="input w-full" placeholder="Type here" />
              </fieldset>
              <fieldset className="fieldset flex-1">
                <legend className="fieldset-legend text-black">Have Expired Date</legend>
                <select {...productForm.register("haveExpiredDate")} className="select w-full bg-white">
                  <option value={"true"}>Yes</option>
                  <option value={"false"}>No</option>
                </select>
              </fieldset>
            </div>
            <div className="flex flex-row sm:flex-row gap-3">
              <button disabled={addProductsFn.loading} type="submit" className={`flex-1 p-3 rounded-full bg-black relative text-white w-full ${addProductsFn.loading ? 'cursor-not-allowed bg-red-900' : ''}`}>
                Submit
              </button>
              <button disabled={addProductsFn.loading} type="submit" className="p-3 rounded-full bg-black relative text-white">
                <Link href="/products/add/service">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </Link>
              </button>
              <button disabled={previewUrl == ''} type="submit" className="p-3 rounded-full bg-black relative text-white" onClick={() => (document.getElementById('preview_modal') as HTMLDialogElement)?.showModal()}>
                <HugeiconsIcon
                  icon={Image01Icon}
                  size={24}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </button>
            </div>
          </form>
          {
            previewUrl != ''
              ?
              <div className="w-full lg:w-1/4 flex flex-col justify-center items-center p-4 lg:p-0">
                <img className="rounded-md hidden lg:block" src={previewUrl} alt="Product preview" />
              </div>
              :
              <></>
          }
        </div>
      </div>

      <dialog id="preview_modal" className="modal text-black">
        <div className="modal-box p-0 bg-transparent shadow-none">
          <form method="dialog">
            <button className="btn btn-sm btn-circle absolute right-2 top-2 z-50">✕</button>
          </form>
          {previewUrl && <img src={previewUrl} className="w-full max-w-3xl mx-auto rounded-md" alt="Product preview" />}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <dialog id="my_modal_category" className="modal text-black">
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Category</span>
            <form onSubmit={newCategoryForm.handleSubmit(submitCategory)} className="relative flex flex-col gap-3">
              <input {...newCategoryForm.register("name")} type="text" placeholder="New category name" className="mb-3 w-full p-3 rounded-md border-1 border-black bg-white" />
              <input value="xxx" {...newCategoryForm.register("categoryCode")} type="hidden" />
              {addCategoryFn.error ? <label className="input-validator text-red-900">something went wrong</label> : <></>}
              <div className="flex flex-row gap-3 mt-4 justify-end">
                <button type="button" onClick={() => (document.getElementById('my_modal_category') as HTMLDialogElement)?.close()} className="btn p-3 rounded-md text-white bg-gray-400 border-none">
                  Cancel
                </button>
                <button type="submit" disabled={addCategoryFn.loading} className={`btn p-3 rounded-md text-white bg-blue-900 border-none ${addCategoryFn.loading ? 'opacity-50' : ''}`}>
                  {addCategoryFn.loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <dialog id="my_modal_unit" className="modal text-black">
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Unit</span>
            <form onSubmit={newUnitForm.handleSubmit(submitUnit)} className="relative flex flex-col gap-3">
              <input {...newUnitForm.register("name")} type="text" placeholder="New unit name" className="mb-3 w-full p-3 rounded-md border-1 border-black bg-white" />
              {addUnitFn.error ? <label className="input-validator text-red-900">something went wrong</label> : <></>}
              <div className="flex flex-row gap-3 mt-4 justify-end">
                <button type="button" onClick={() => (document.getElementById('my_modal_unit') as HTMLDialogElement)?.close()} className="btn p-3 rounded-md text-white bg-gray-400 border-none">
                  Cancel
                </button>
                <button type="submit" disabled={addUnitFn.loading} className={`btn p-3 rounded-md text-white bg-blue-900 border-none ${addUnitFn.loading ? 'opacity-50' : ''}`}>
                  {addUnitFn.loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  )
}