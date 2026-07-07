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

  const [vendors, setVendors] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newVendorForm = useForm();
  const editVendorForm = useForm();
  const router = useRouter()

  const getVendorsFn = useFetch<any[], any>({
    url: `/api/web/vendor?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
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
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) {
    if (!roleDetail.page.includes('suppliers')) {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Vendors <span className="text-sm leading-loose">Manage your vendor</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your Vendor</span>
            <button disabled={!isSuperAdmin && roleDetail.permission === 'readonly'} onClick={() => modalRef.current?.show()} className="ml-auto">
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
                                  <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} onClick={() => edit(v._id)}>
                                    <HugeiconsIcon icon={Edit03Icon} size={24} />
                                  </button>
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
                                  <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} onClick={() => edit(v._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
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
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Edit Vendor</span>
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
              {editFn.noResult || editFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="modal-action">
                <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                    Cancel
                  </button>
                </form>
              </div>
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Edit
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box bg-white h-120">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Vendor</span>
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
              <fieldset className="fieldset hidden">
                <legend className="fieldset-legend text-black">Vendor ID</legend>
                <input className="input w-full bg-white" {...newVendorForm.register("vendorId")} value={`vnd-${uuidv4().split('-')[1]}`} placeholder="vendor id" />
              </fieldset>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="modal-action">
                <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                    Cancel
                  </button>
                </form>
              </div>
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

