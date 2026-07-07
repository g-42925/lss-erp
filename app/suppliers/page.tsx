"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import Sidebar from '@/components/sidebar'
import useFetch from '@/hooks/useFetch'
import useAuth from "@/store/auth"

import { v4 as uuidv4 } from "uuid";
import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation'

export default function Suppliers() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const roleDetail = useAuth((state) => state.roleDetail)

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newSupplierForm = useForm();
  const editSupplierForm = useForm();
  const router = useRouter()

  const getSuppliersFn = useFetch<any[], any>({
    url: `/api/web/suppliers?id=xxx`,
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/suppliers',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/suppliers',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })



  async function submit(data: any) {
    const newSupplier = JSON.stringify({
      ...data,
      masterAccountId,
    })

    await addFn.fn('', newSupplier, (result) => {
      modalRef.current?.close()
      setSuppliers(
        [
          ...suppliers,
          result
        ]
      )
    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const result = suppliers.filter((r) => {
        return r.bussinessName.toLowerCase().includes(v)
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
      setSearchResult(
        []
      )
    }
  }

  async function handleEdit(data: any) {
    const [f] = suppliers.filter((s) => s._id === data._id)

    const body = JSON.stringify({ ...data, addedOn: f.addedOn })

    await editFn.fn('', body, (result) => {
      const [target] = suppliers.filter((s, index) => {
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
    const [supplier] = suppliers.filter((s) => {
      return s._id === _id
    })

    editSupplierForm.reset({
      _id: supplier._id,
      vendorId: supplier.vendorId,
      contactId: supplier.contactId,
      bussinessName: supplier.bussinessName,
      name: supplier.name,
      email: supplier.email,
      taxNumber: supplier.taxNumber,
      creditLimit: supplier.creditLimit,
      payTerm: supplier.payTerm,
      openingBalance: supplier.openingBalance,
      advanceBalance: supplier.advanceBalance,
      address: supplier.address,
      mobile: supplier.mobile,
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
      const url1 = `/api/web/suppliers?id=${masterAccountId}`
      getSuppliersFn.fn(url1, JSON.stringify({}), (r) => {
        setSuppliers(r)
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
        <span className="text-2xl">Suppliers <span className="text-sm leading-loose">Manage your suppliers</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your Suppliers</span>
            <button disabled={!isSuperAdmin && roleDetail.permission === 'readonly'} onClick={() => modalRef.current?.show()} className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>
          {
            getSuppliersFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getSuppliersFn.noResult || getSuppliersFn.error
                ?
                <div>
                  <p>{getSuppliersFn.message}</p>
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
                          suppliers.map((s) => {
                            return (
                              <tr key={s._id}>
                                <td>{s.bussinessName}</td>
                                <td className="max-w-[10ch] truncate">{s.email}</td>
                                <td className="max-w-[10ch] truncate">{s.mobile}</td>
                                <td>
                                  <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} onClick={() => edit(s._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
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
                  :
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Tax Number</th>
                          <th>Address</th>
                          <th>Mobile</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          searchResult.map((s) => {
                            return (
                              <tr key={s._id}>
                                <td>{s.bussinessName}</td>
                                <td>{s.email}</td>
                                <td>{s.taxNumber}</td>
                                <td>{s.address}</td>
                                <td>{s.mobile}</td>
                                <td>
                                  <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} onClick={() => edit(s._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
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
            <span className="text-2xl">Edit Supplier</span>
            <form onSubmit={(e) => editSupplierForm.handleSubmit(handleEdit)(e)} className="h-140 flex flex-col gap-3 relative">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Bussiness Name</legend>
                  <input className="input w-full bg-white" {...editSupplierForm.register("bussinessName")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Email</legend>
                  <input className="input w-full bg-white" {...editSupplierForm.register("email")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Tax Number</legend>
                  <input className="input w-full bg-white" {...editSupplierForm.register("taxNumber")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Address</legend>
                  <input className="input w-full bg-white" {...editSupplierForm.register("address")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Mobile</legend>
                  <input className="input w-full bg-white" {...editSupplierForm.register("mobile")} type="text" />
                </fieldset>
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
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
        <div className="modal-box bg-white text-black">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Supplier</span>
            <form onSubmit={(e) => newSupplierForm.handleSubmit(submit)(e)} className="h-140 flex flex-col gap-3 relative">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Bussiness Name</legend>
                  <input className="input w-full bg-white" {...newSupplierForm.register("bussinessName")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Email</legend>
                  <input className="input w-full bg-white" {...newSupplierForm.register("email")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Tax Number</legend>
                  <input className="input w-full bg-white" {...newSupplierForm.register("taxNumber")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Address</legend>
                  <input className="input w-full bg-white" {...newSupplierForm.register("address")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Mobile</legend>
                  <input className="input w-full bg-white" {...newSupplierForm.register("mobile")} type="text" />
                </fieldset>
              </div>
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

