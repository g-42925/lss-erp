/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import useFetch from '@/hooks/useFetch'
import useAuth from "@/store/auth"

import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react';
import { AddCircleHalfDotIcon, Edit03Icon } from '@hugeicons/core-free-icons';



export default function Suppliers() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const pages = useAuth((state) => state.pages)

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newSupplierForm = useForm();
  const editSupplierForm = useForm();
  const router = useRouter();

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
      newSupplierForm.reset()
      setSuppliers([...suppliers, result])
    })
  }

  function search(v: string) {
    setSearchQuery(v)
    if (v.length > 0) {
      const result = suppliers.filter((r) => {
        return (
          r.bussinessName?.toLowerCase().includes(v.toLowerCase()) ||
          r.name?.toLowerCase().includes(v.toLowerCase()) ||
          r.email?.toLowerCase().includes(v.toLowerCase()) ||
          r.mobile?.toLowerCase().includes(v.toLowerCase())
        )
      })
      setSearchResult(result)
    } else {
      setSearchResult([])
    }
  }

  async function handleEdit(data: any) {
    const body = JSON.stringify({ ...data })
    await editFn.fn('', body, (result) => {
      const target = suppliers.find((s) => s._id === data._id)
      if (target) {
        Object.keys(target).forEach(key => {
          target[key] = result[key]
        })
      }
      setSearchResult([])
      setSearchQuery('')
      editRef.current?.close()
    })
  }

  function edit(_id: string) {
    const supplier = suppliers.find((s) => s._id === _id)
    if (!supplier) return

    editSupplierForm.reset({
      _id: supplier._id,
      bussinessName: supplier.bussinessName,
      name: supplier.name,
      email: supplier.email,
      address: supplier.address,
      mobile: supplier.mobile,
    })

    editRef.current?.show()
  }

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/suppliers?id=${masterAccountId}`
      getSuppliersFn.fn(url, JSON.stringify({}), (r) => {
        setSuppliers(r)
      })
    }
  }, [masterAccountId])

  useEffect(() => {
    if (hasHydrated) {
      if (!loggedIn) {
        router.push('/login')
      } else if (!isSuperAdmin && (!pages['/suppliers'] || !pages['/suppliers'].includes('view'))) {
        router.push('/dashboard')
      }
    }
  }, [hasHydrated, loggedIn, isSuperAdmin, pages, router])

  if (!hasHydrated || !loggedIn || (!isSuperAdmin && (!pages['/suppliers'] || !pages['/suppliers'].includes('view')))) {
    return null
  }

  const displayList = searchQuery.length > 0 ? searchResult : suppliers

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">
          Suppliers <span className="text-sm leading-loose">Manage your suppliers</span>
        </span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row gap-3">
            <span className="self-center">All Suppliers</span>
            <input
              type="text"
              placeholder="Search supplier..."
              className="input input-bordered bg-white ml-4 w-64"
              value={searchQuery}
              onChange={(e) => search(e.target.value)}
            />
            <button
              disabled={!isSuperAdmin && !pages['/suppliers']?.includes('create')}
              onClick={() => { newSupplierForm.reset(); modalRef.current?.show() }}
              className="ml-auto"
            >
              <HugeiconsIcon icon={AddCircleHalfDotIcon} size={24} color="currentColor" strokeWidth={1.5} />
            </button>
          </div>

          {getSuppliersFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
          ) : getSuppliersFn.noResult || getSuppliersFn.error ? (
            <div>
              <p>{getSuppliersFn.message}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="text-black">
                  <tr>
                    <th>Business Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-8">
                        {searchQuery.length > 0 ? 'No supplier matches your search' : 'No suppliers yet. Click + to add one.'}
                      </td>
                    </tr>
                  ) : (
                    displayList.map((s) => (
                      <tr key={s._id}>
                        <td>{s.bussinessName}</td>
                        <td>{s.name}</td>
                        <td className="max-w-[14ch] truncate">{s.email}</td>
                        <td className="max-w-[12ch] truncate">{s.mobile}</td>
                        <td className="max-w-[16ch] truncate">{s.address}</td>
                        <td>
                          <button
                            disabled={!isSuperAdmin && !pages['/suppliers']?.includes('edit')}
                            onClick={() => edit(s._id)}
                          >
                            <HugeiconsIcon icon={Edit03Icon} size={24} color="currentColor" strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Supplier Modal */}
      <dialog ref={editRef} className="modal text-black">
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Edit Supplier</span>
            <form
              onSubmit={(e) => { void editSupplierForm.handleSubmit(handleEdit)(e) }}
              className="flex flex-col gap-3 relative pb-14"
            >
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Business Name</legend>
                <input className="input w-full bg-white" {...editSupplierForm.register("bussinessName")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Contact Person</legend>
                <input className="input w-full bg-white" {...editSupplierForm.register("name")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Email</legend>
                <input className="input w-full bg-white" {...editSupplierForm.register("email")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Address</legend>
                <input className="input w-full bg-white" {...editSupplierForm.register("address")} type="text" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Mobile</legend>
                <input className="input w-full bg-white" {...editSupplierForm.register("mobile")} type="text" />
              </fieldset>
              {editFn.noResult || editFn.error
                ? <label className="input-validator text-red-900">Something went wrong</label>
                : <></>
              }
              <div className="modal-action mt-2">
                <form method="dialog">
                  <button className="btn p-3 rounded-md text-white bg-gray-400">Cancel</button>
                </form>
                <button
                  type="submit"
                  disabled={editFn.loading}
                  className="btn p-3 rounded-md text-white bg-blue-900"
                >
                  {editFn.loading ? <span className="loading loading-spinner loading-sm"></span> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* Add Supplier Modal */}
      <dialog ref={modalRef} className="modal text-black">
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Supplier</span>
            <form
              onSubmit={(e) => { void newSupplierForm.handleSubmit(submit)(e) }}
              className="flex flex-col gap-3 relative pb-14"
            >
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Business Name <span className="text-red-500">*</span></legend>
                <input
                  className="input w-full bg-white"
                  {...newSupplierForm.register("bussinessName", { required: true })}
                  type="text"
                  placeholder="e.g. PT. Supplier Jaya"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Contact Person</legend>
                <input
                  className="input w-full bg-white"
                  {...newSupplierForm.register("name")}
                  type="text"
                  placeholder="e.g. Budi Santoso"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Email</legend>
                <input
                  className="input w-full bg-white"
                  {...newSupplierForm.register("email")}
                  type="email"
                  placeholder="e.g. supplier@example.com"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Address <span className="text-red-500">*</span></legend>
                <input
                  className="input w-full bg-white"
                  {...newSupplierForm.register("address", { required: true })}
                  type="text"
                  placeholder="e.g. Jl. Merdeka No. 1, Jakarta"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend text-black">Mobile</legend>
                <input
                  className="input w-full bg-white"
                  {...newSupplierForm.register("mobile")}
                  type="text"
                  placeholder="e.g. 08123456789"
                />
              </fieldset>
              {addFn.noResult || addFn.error
                ? <label className="input-validator text-red-900">Something went wrong</label>
                : <></>
              }
              <div className="modal-action mt-2">
                <form method="dialog">
                  <button className="btn p-3 rounded-md text-white bg-gray-400">Cancel</button>
                </form>
                <button
                  type="submit"
                  disabled={addFn.loading}
                  className="btn p-3 rounded-md text-white bg-blue-900"
                >
                  {addFn.loading ? <span className="loading loading-spinner loading-sm"></span> : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
