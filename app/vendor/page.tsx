"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */;

import Sidebar from '@/components/sidebar'
import useFetch from '@/hooks/useFetch'
import useAuth from "@/store/auth"

import { v4 as uuidv4 } from "uuid";
import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react';
import { AddCircleHalfDotIcon } from '@hugeicons/core-free-icons';
import { Edit03Icon } from '@hugeicons/core-free-icons';


export default function Vendor() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const roleDetail = useAuth((state) => state.roleDetail)
  const pages = useAuth((state) => state.pages)

  const [vendors, setVendors] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const taxModalRef = useRef<HTMLDialogElement>(null)
  const taxForm = useForm();
  const [selectedVendorForTax, setSelectedVendorForTax] = useState<string>('')
  const [taxes, setTaxes] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newVendorForm = useForm();
  const editVendorForm = useForm();
  const router = useRouter()

  const pph23Fn = useFetch<any, any>({
    url: '/api/web/vendor',
    method: 'PATCH',
    onError: (m) => {
      alert(m)
    }
  })

  const getVendorsFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getTaxesFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => alert(m)
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/vendor',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/vendor',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })



  async function submit(data: any) {
    const newVendor = JSON.stringify({
      ...data,
      vendorId: `vnd-${uuidv4().split('-')[1]}`,
      masterAccountId
    })

    await addFn.fn('', newVendor, (result) => {
      modalRef.current?.close()
      setVendors(
        [
          ...vendors,
          result
        ]
      )
    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const result = vendors.filter((r) => {
        return r.name.toLowerCase().includes(v)
      })

      console.log(
        result
      )

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
      setSearchResult(
        []
      )
    }
  }

  async function handleEdit(data: any) {
    const [f] = vendors.filter((s) => s._id === data._id)
    const body = JSON.stringify({ ...data })
    await editFn.fn('', body, (result) => {
      const [target] = vendors.filter((s, index) => {
        return s._id === data._id
      })

      Object.keys(target).forEach(key => {
        target[key] = result[key]
      })

      setSearchResult([])

      editRef.current?.close()
    })
  }

  function openTaxModal(_id: string) {
    const [vendor] = vendors.filter((v) => v._id === _id)
    setSelectedVendorForTax(_id)
    const taxIds = Array.isArray(vendor.taxes) ? vendor.taxes.map((t: any) => t._id || t) : (vendor.taxes ? [vendor.taxes._id || vendor.taxes] : [])
    taxForm.reset({
      taxes: taxIds
    })
    taxModalRef.current?.show()
  }

  async function handleTax(data: any) {
    let selectedTaxIds: string[] = []
    if (Array.isArray(data.taxes)) {
      selectedTaxIds = data.taxes
    } else if (typeof data.taxes === 'string') {
      selectedTaxIds = [data.taxes]
    }

    const body = JSON.stringify({ _id: selectedVendorForTax, taxes: selectedTaxIds })
    await editFn.fn('', body, (result) => {
      const selectedTaxObjs = taxes.filter(t => selectedTaxIds.includes(t._id))
      setVendors((prev) => prev.map((v) => v._id === selectedVendorForTax ? { ...v, taxes: selectedTaxObjs } : v))
      setSearchResult((prev) => prev.map((v) => v._id === selectedVendorForTax ? { ...v, taxes: selectedTaxObjs } : v))
      taxModalRef.current?.close()
    })
  }

  async function setPph23(_id: string) {
    if (!confirm("Jadikan vendor ini sebagai pengusaha PPh 23?")) return

    const body = JSON.stringify({
      _id,
      pph23: true
    })

    await pph23Fn.fn('', body, (result) => {
      setVendors((prev) =>
        prev.map((v) =>
          v._id === _id
            ? { ...v, pph23: true }
            : v
        )
      )
      setSearchResult((prev) =>
        prev.map((v) =>
          v._id === _id
            ? { ...v, pph23: true }
            : v
        )
      )
    })
  }

  function isPermitted(permission: string) {
    return permission != "readonly"

    console.log(permission != "readonly")
  }

  function edit(_id: string) {
    const [vendor] = vendors.filter((v) => {
      return v._id === _id
    })

    editVendorForm.reset({
      name: vendor.name,
      email: vendor.email,
      address: vendor.address,
      mobile: vendor.mobile,
      taxNumber: vendor.taxNumber || "",
      _id: vendor._id
    })

    editRef.current?.show()
  }

  function normalizeDate(date: string) {
    return new Date(date).toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta"
    })
  }

  useEffect(() => {
    if (hasHydrated) {
      const url1 = `/api/web/vendor?id=${masterAccountId}`
      getVendorsFn.fn(url1, JSON.stringify({}), (r) => {
        setVendors(r)
      })
      const url2 = `/api/web/tax?id=${masterAccountId}`
      getTaxesFn.fn(url2, JSON.stringify({}), (r) => {
        setTaxes(r)
      })
    }
  }, [masterAccountId, hasHydrated])

  useEffect(() => {
    if (hasHydrated) {
      if (!loggedIn) {
        router.push('/login')
      } else if (!isSuperAdmin && (!pages['/vendors'] || !pages['/vendors'].includes('view'))) {
        router.push('/dashboard')
      }
    }
  }, [hasHydrated, loggedIn, isSuperAdmin, pages, router])

  if (!hasHydrated || !loggedIn || (!isSuperAdmin && (!pages['/vendors'] || !pages['/vendors'].includes('view')))) {
    return null
  }

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Vendors <span className="text-sm leading-loose">Manage your vendor</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your Vendor</span>
            <button disabled={!isSuperAdmin && !pages['/vendors']?.includes('create')} onClick={() => modalRef.current?.show()} className="ml-auto">
              <HugeiconsIcon icon={AddCircleHalfDotIcon} size={24} />
            </button>
          </div>
          {
            getVendorsFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getVendorsFn.noResult || getVendorsFn.error
                ?
                <div>
                  <p>{getVendorsFn.message}</p>
                </div>
                :
                searchResult.length < 1
                  ?
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="text-black">
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          vendors.map((v) => {
                            return (
                              <tr key={v._id}>
                                <td>{v.name}</td>
                                <td className="max-w-[10ch] truncate">{v.email}</td>
                                <td className="max-w-[10ch] truncate">{v.mobile}</td>
                                <td>
                                  <div className="flex gap-2">
                                    <button disabled={!isSuperAdmin && !pages['/vendors']?.includes('edit')} onClick={() => openTaxModal(v._id)} title="Set Tax" className="text-green-700">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                      </svg>
                                    </button>
                                    <button disabled={!isSuperAdmin && !pages['/vendors']?.includes('edit')} onClick={() => edit(v._id)}>
                                      <HugeiconsIcon icon={Edit03Icon} size={24} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        }
                      </tbody>
                    </table>
                  </div>
                  :
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Address</th>
                          <th>Mobile</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          searchResult.map((v) => {
                            return (
                              <tr key={v._id}>
                                <td>{v.name}</td>
                                <td>{v.email}</td>
                                <td>{v.address}</td>
                                <td>{v.mobile}</td>
                                <td>
                                  <div className="flex gap-2">
                                    <button disabled={!isSuperAdmin && !pages['/vendors']?.includes('edit')} onClick={() => openTaxModal(v._id)} title="Set Tax" className="text-green-700">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                      </svg>
                                    </button>
                                    <button disabled={!isSuperAdmin && !pages['/vendors']?.includes('edit')} onClick={() => edit(v._id)}>
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                      </svg>
                                    </button>
                                  </div>
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
        <div className="modal-box w-11/12 max-w-md bg-white">
          <div className="flex flex-col gap-3 w-full">
            <span className="page-title">Edit Vendor</span>
            <form onSubmit={editVendorForm.handleSubmit(handleEdit)} className="h-90 flex flex-col gap-3 relative">
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Name</legend>
                <input className="input w-full bg-white" {...editVendorForm.register("name")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Email</legend>
                <input className="input w-full bg-white" {...editVendorForm.register("email")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Address</legend>
                <input className="input w-full bg-white" {...editVendorForm.register("address")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Mobile</legend>
                <input className="input w-full bg-white" {...editVendorForm.register("mobile")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Tax Number</legend>
                <input className="input w-full bg-white" {...editVendorForm.register("taxNumber")} type="text" placeholder="NPWP / KTP" />
              </fieldset>
              {editFn.noResult || editFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => editRef.current?.close()} className="btn px-4 py-2 rounded-md text-white bg-gray-400 hover:bg-gray-500">
                  Cancel
                </button>
                <button type="submit" className="btn px-4 py-2 rounded-md text-white bg-blue-900 hover:bg-blue-800">
                  Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-md bg-white">
          <div className="flex flex-col gap-3 w-full">
            <span className="page-title">Add Vendor</span>
            <form onSubmit={newVendorForm.handleSubmit(submit)} className="h-90 flex flex-col gap-3 relative">
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Bussiness Name</legend>
                <input className="input w-full bg-white" {...newVendorForm.register("name")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Email</legend>
                <input className="input w-full bg-white" {...newVendorForm.register("email")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Address</legend>
                <input className="input w-full bg-white" {...newVendorForm.register("address")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Mobile</legend>
                <input className="input w-full bg-white" {...newVendorForm.register("mobile")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Tax Number</legend>
                <input className="input w-full bg-white" {...newVendorForm.register("taxNumber")} type="text" placeholder="NPWP / KTP" />
              </fieldset>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => modalRef.current?.close()} className="btn px-4 py-2 rounded-md text-white bg-gray-400 hover:bg-gray-500">
                  Cancel
                </button>
                <button type="submit" className="btn px-4 py-2 rounded-md text-white bg-blue-900 hover:bg-blue-800">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="modal_tax" ref={taxModalRef} className="modal backdrop:bg-black/50">
        <div className="modal-box w-11/12 max-w-lg bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 text-slate-800">
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
            <h3 className="text-lg font-bold text-slate-900">Set Vendor Taxes</h3>
            <button
              type="button"
              onClick={() => taxModalRef.current?.close()}
              className="text-gray-400 hover:text-gray-600 text-xl font-semibold leading-none"
            >
              ✕
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={taxForm.handleSubmit(handleTax)} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Applicable Taxes
              </label>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {taxes.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No taxes available
                  </div>
                )}

                {taxes.map((t) => (
                  <label
                    key={t._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        value={t._id}
                        {...taxForm.register("taxes")}
                        className="w-5 h-5 accent-blue-900 rounded cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                        {t.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                        {t.value}%
                      </span>
                      {t.isPPh && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          PPh
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => taxModalRef.current?.close()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editFn.loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 active:scale-95 transition-all shadow-md shadow-blue-900/20 disabled:opacity-50"
              >
                {editFn.loading ? 'Saving...' : 'Save Taxes'}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}

