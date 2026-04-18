"use client"

import Image from "next/image"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function Measure() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [measurements, setMeasurement] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const editForm = useForm()
  const newMeasureForm = useForm()
  const router = useRouter()

  const putFn = useFetch<any, any>({
    url: '/api/web/roles',
    method: 'PUT'
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/measure',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/measure',
    method: 'PUT',
    onError: (m) => {

    }
  })

  const getFn = useFetch<any[], any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET'
  })

  const getSuppliersFn = useFetch<any[], any>({
    url: `/api/web/supplier?id=xxx`,
    method: 'GET'
  })


  const getMeasurementsFn = useFetch<any[], any>({
    url: `/api/web/measure?id=xxx`,
    method: 'GET'
  })

  const getUnitFn = useFetch<any[], any>({
    url: `/api/web/unit?id=xxx`,
    method: 'GET'
  })

  const deleteFn = useFetch<any[], any>({
    url: `/api/web/location?id=xxx`,
    method: 'DELETE',
    onError: (m) => {
      alert(m)
    }
  })

  async function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
    })

    console.log(JSON.parse(body))


    await addFn.fn('', body, (r) => {
      const supplier = getSuppliersFn.result?.find((s) => s._id == data.supplierId)
      const product = getFn.result?.find((s) => s._id == data.productId)
      const newMeasurement = { supplier, product, unit: r.unit, ratio: r.ratio }
      setMeasurement([newMeasurement, ...measurements])
      modalRef.current?.close()
    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const [loc, prod] = v.split(":")

      if (prod) {
        const result = measurements.filter((r) => {
          return r.supplier.bussinessName.includes(loc) && r.product.productName.includes(prod)
        })

        if (result.length > 0) {
          setSearchResult(
            [
              ...result
            ]
          )
        }
        else {
          setSearchResult(
            []
          )
        }
      }
      else {
        const result = measurements.filter((r) => {
          return r.supplier.bussinessName.includes(loc) || r.product.productName === loc
        })

        if (result.length > 0) {
          setSearchResult(
            [
              ...result
            ]
          )
        }
        else {
          setSearchResult(
            []
          )
        }
      }
    }
    else {
      setSearchResult(
        []
      )
    }
  }

  async function editSubmit(data: any) {
    const param = JSON.stringify(data)

    await editFn.fn('', param, r => {
      const supplier = getSuppliersFn.result?.find((s) => s._id == r.supplierId)
      const product = getFn.result?.find((s) => s._id == r.productId)
      const newMeasurement = { supplier, product, unit: r.unit, ratio: r.ratio }

      const [target] = measurements.filter((m) => m._id == r._id)

      target.ratio = newMeasurement.ratio
      target.supplier = newMeasurement.supplier
      target.product = newMeasurement.product
      target.unit = newMeasurement.unit

      editRef.current.close()

    })
  }

  async function del(_id: string) {
    const url = `/api/web/location?id=${_id}`
    const body = JSON.stringify({})

    await deleteFn.fn(url, body, (result) => {
      setLocations(
        locations.filter((l) => l._id != result)
      )
    })
  }

  async function edit(m: any) {
    editForm.reset({
      supplierId: m.supplier._id,
      productId: m.product._id,
      unit: m.unit,
      ratio: m.ratio,
      _id: m._id
    })

    editRef.current.showModal()
  }

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/products?id=${masterAccountId}&type=good`
      const url4 = `/api/web/measure?id=${masterAccountId}`
      const url2 = `/api/web/suppliers?id=${masterAccountId}`
      const url3 = `/api/web/unit?id=${masterAccountId}`;

      getFn.fn(url, JSON.stringify({}), (result) => { })
      getSuppliersFn.fn(url2, JSON.stringify({}), (result) => { })
      getUnitFn.fn(url3, JSON.stringify({}), (result) => { })
      getMeasurementsFn.fn(url4, JSON.stringify({}), (result) => {
        setMeasurement(result)
      })
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Measure <span className="text-sm leading-loose">Manage measurement</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All measurement</span>
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
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
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
                        <th>Supplier</th>
                        <th>Product</th>
                        <th>Unit</th>
                        <th>Ratio</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          measurements.map((m, index) => {
                            return (
                              <tr key={index}>
                                <td>{m.supplier.bussinessName}</td>
                                <td>{m.product.productName}</td>
                                <td>{m.unit}</td>
                                <td>{m.ratio}</td>
                                <td>
                                  <button onClick={() => edit(m)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                      <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                                    </svg>

                                  </button>
                                </td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((m, index) => {
                            return (
                              <tr key={index}>
                                <td>{m.supplier.bussinessName}</td>
                                <td>{m.product.productName}</td>
                                <td>{m.unit}</td>
                                <td>{m.ratio}</td>
                                <td>
                                  <button onClick={() => edit(m)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                      <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                                    </svg>

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
      <dialog id="my_modal_2" ref={editRef} className="modal text-black">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Edit Measurement</span>
            <form onSubmit={editForm.handleSubmit(editSubmit)} className="h-99 relative flex flex-col">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Supplier</legend>
                <select {...editForm.register("supplierId")} className="select w-full">
                  {
                    getSuppliersFn?.result?.map((s, index) => {
                      return (
                        <option key={index} value={s._id}>{s.bussinessName}</option>
                      )
                    })
                  }
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <select {...editForm.register("productId")} className="select w-full">
                  <option value={''}>Select Product:</option>

                  {
                    getFn?.result?.map((p, index) => {
                      return (
                        <option key={index} value={p._id}>{p.productName}</option>
                      )
                    })
                  }
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Unit</legend>
                <select {...editForm.register("unit")} className="select w-full">
                  <option value={''}>Select unit:</option>
                  {
                    getUnitFn?.result?.map((p, index) => {
                      return (
                        <option key={index} value={p.name}>{p.name}</option>
                      )
                    })
                  }
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Ratio</legend>
                <input {...editForm.register("ratio")} type="text" className="input w-full" />
              </fieldset>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Edit
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Measurement</span>
            <form onSubmit={newMeasureForm.handleSubmit(submit)} className="h-99 relative flex flex-col">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Supplier</legend>
                <select {...newMeasureForm.register("supplierId")} className="select w-full">
                  {
                    getSuppliersFn?.result?.map((s, index) => {
                      return (
                        <option key={index} value={s._id}>{s.bussinessName}</option>
                      )
                    })
                  }
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <select {...newMeasureForm.register("productId")} className="select w-full">
                  <option value={''}>Select Product:</option>

                  {
                    getFn?.result?.map((p, index) => {
                      return (
                        <option key={index} value={p._id}>{p.productName}</option>
                      )
                    })
                  }
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Unit</legend>
                <select {...newMeasureForm.register("unit")} className="select w-full">
                  <option value={''}>Select unit:</option>
                  {
                    getUnitFn?.result?.map((p, index) => {
                      return (
                        <option key={index} value={p.name}>{p.name}</option>
                      )
                    })
                  }
                </select>
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Ratio</legend>
                <input {...newMeasureForm.register("ratio")} type="text" className="input w-full" />
              </fieldset>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Add
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

type Failed = {
  message: string
}