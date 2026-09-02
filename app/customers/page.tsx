/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import useFetch from '@/hooks/useFetch'
import useAuth from "@/store/auth"

import { useForm } from "react-hook-form";
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react';
import { AddCircleHalfDotIcon } from '@hugeicons/core-free-icons';
import { Edit03Icon } from '@hugeicons/core-free-icons';



export default function Customers() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const roleDetail = useAuth((state) => state.roleDetail)
  const pages = useAuth((state) => state.pages)

  const [customers, setCustomers] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'yes' | 'no'>('yes')

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newCustomerForm = useForm();
  const editCustomerForm = useForm();
  const router = useRouter();

  const getCustomersFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/customers',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/customers',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })



  async function submit(data: any) {
    const newCustomers = JSON.stringify({
      ...data,
      masterAccountId,
      name: data.bussinessName
    })

    await addFn.fn('', newCustomers, (result) => {
      modalRef.current?.close()
      setCustomers(
        [
          ...customers,
          result
        ]
      )
    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const result = customers.filter((r) => {
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
    const [f] = customers.filter((s) => s._id === data._id)

    console.log(data)

    const body = JSON.stringify({ ...data, addedOn: f.addedOn })

    await editFn.fn('', body, (result) => {
      const [target] = customers.filter((s) => {
        return s._id === data._id
      })

      Object.keys(target).forEach(key => {
        target[key] = result[key]
      })

      setSearchResult([])

      editRef.current?.close()
    })
  }


  function edit(_id: string) {
    const [customer] = customers.filter((s) => {
      return s._id === _id
    })

    editCustomerForm.reset({
      _id: customer._id,
      vendorId: customer.vendorId,
      contactId: customer.contactId,
      bussinessName: customer.bussinessName,
      name: customer.name,
      email: customer.email,
      taxType: customer.taxType,
      taxNumber: customer.taxNumber,
      creditLimit: customer.creditLimit,
      payTerm: customer.payTerm,
      openingBalance: customer.openingBalance,
      advanceBalance: customer.advanceBalance,
      address: customer.address,
      mobile: customer.mobile,
      totalSaleDue: customer.totalSaleDue,
      active: customer.active
    })

    editRef.current?.show()
  }

  useEffect(() => {
    if (hasHydrated) {
      const url1 = `/api/web/customers?id=${masterAccountId}`
      getCustomersFn.fn(url1, JSON.stringify({}), (r) => {
        setCustomers(r)
      })
    }
  }, [masterAccountId])

  useEffect(() => {
    if (hasHydrated) {
      if (!loggedIn) {
        router.push('/login')
      }
      else if (!isSuperAdmin && (!pages['/customers'] || !pages['/customers'].includes('view'))) {
        router.push('/dashboard')
      }
    }
  }, [hasHydrated, loggedIn, isSuperAdmin, pages, router])

  const displayedCustomers = customers.filter(c => statusFilter === 'all' || (c.active || 'yes') === statusFilter)
  const displayedSearchResult = searchResult.filter(c => statusFilter === 'all' || (c.active || 'yes') === statusFilter)

  if (!hasHydrated || !loggedIn || (!isSuperAdmin && (!pages['/customers'] || !pages['/customers'].includes('view')))) {
    return null
  }

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Customers <span className="text-sm leading-loose">Manage your customers</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          <div className="flex flex-row flex-wrap gap-2 items-center">
            <input
              type="search"
              placeholder="Cari nama customer..."
              onChange={(e) => search(e.target.value)}
              className="toolbar-search"
            />
            <select className="select select-bordered select-sm bg-white border border-gray-300" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="yes">Active</option>
              <option value="no">Inactive</option>
            </select>
            <button disabled={!isSuperAdmin && !pages['/customers']?.includes('create')} onClick={() => modalRef.current?.show()} className="ml-auto">
              <HugeiconsIcon
                icon={AddCircleHalfDotIcon}
                size={24}
                color="currentColor"
                strokeWidth={1.5}
              />
            </button>
          </div>
          {
            getCustomersFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getCustomersFn.noResult || getCustomersFn.error
                ?
                <div>
                  <p>{getCustomersFn.message}</p>
                </div>
                :
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="text-black">
                      <tr>
                        <th className="w-auto">Name</th>
                        <th>Address</th>
                        <th>Phone</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        (searchResult.length > 0 ? displayedSearchResult : displayedCustomers).map((c) => {
                          return (
                            <tr key={c._id}>
                              <td className="w-auto">{c.bussinessName}</td>
                              <td className="w-auto">{c.address}</td>
                              <td className="w-auto">{c.mobile}</td>
                              <td>
                                <button disabled={!isSuperAdmin && !pages['/customers']?.includes('edit')} onClick={() => edit(c._id)}>
                                  <HugeiconsIcon
                                    icon={Edit03Icon}
                                    size={24}
                                    color="currentColor"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      }
                      {(searchResult.length > 0 ? displayedSearchResult : displayedCustomers).length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-gray-400 py-6">Tidak ada customer ditemukan.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
          }
        </div>
      </div>
      <dialog id="my_modal_2" ref={editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-4xl bg-white">
          <div className="flex flex-col gap-3">
            <span className="page-title">Edit Customer</span>
            <form onSubmit={(e) => { void editCustomerForm.handleSubmit(handleEdit)(e); }} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Bussiness Name</legend>
                  <textarea className="textarea w-full bg-white border border-gray-300 h-24" {...editCustomerForm.register("bussinessName")} />
                </fieldset>
                <fieldset className="fieldset col-span-full">
                  <legend className="fieldset-legend text-black">Mobile</legend>
                  <input className="input w-full bg-white border border-gray-300" {...editCustomerForm.register("mobile")} type="text" />
                </fieldset>
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Tax Info</legend>
                  <div className="grid grid-cols-3 w-full gap-2">
                    <select className="select bg-white border border-gray-300 col-span-1" {...editCustomerForm.register("taxType")}>
                      <option value="">Select Type</option>
                      <option value="KTP">KTP</option>
                      <option value="NPWP">NPWP</option>
                    </select>
                    <input className="input bg-white border border-gray-300 col-span-2" {...editCustomerForm.register("taxNumber")} type="text" placeholder="Tax Number (KTP/NPWP)" />
                  </div>
                </fieldset>
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Address</legend>
                  <textarea className="textarea w-full bg-white border border-gray-300 h-24" {...editCustomerForm.register("address")} />
                </fieldset>
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Active</legend>
                  <select className="select w-full bg-white border border-gray-300" {...editCustomerForm.register("active")} >
                    <option value={'yes'}>yes</option>
                    <option value={'no'}>no</option>
                  </select>
                </fieldset>
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="modal-action flex justify-end gap-3 mt-4 w-full">
                <form method="dialog">
                  <button className="btn rounded-md text-white bg-gray-400 border-none hover:bg-gray-500">
                    Cancel
                  </button>
                </form>
                <button type="submit" className="btn rounded-md text-white bg-blue-900 border-none hover:bg-blue-800">
                  Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-4xl bg-white">
          <div className="flex flex-col gap-3">
            <span className="page-title">Add Customer</span>
            <form onSubmit={(e) => { void newCustomerForm.handleSubmit(submit)(e); }} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Bussiness Name</legend>
                  <textarea className="textarea w-full bg-white border border-gray-300 h-24" {...newCustomerForm.register("bussinessName")} />
                </fieldset>
                <fieldset className="fieldset col-span-full">
                  <legend className="fieldset-legend text-black">Mobile</legend>
                  <input className="input w-full bg-white border border-gray-300" {...newCustomerForm.register("mobile")} type="text" />
                </fieldset>
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Tax Info</legend>
                  <div className="grid grid-cols-3 w-full gap-2">
                    <select className="select bg-white border border-gray-300 col-span-1" {...newCustomerForm.register("taxType")}>
                      <option value="">Select Type</option>
                      <option value="KTP">KTP</option>
                      <option value="NPWP">NPWP</option>
                    </select>
                    <input className="input bg-white border border-gray-300 col-span-2" {...newCustomerForm.register("taxNumber")} type="text" placeholder="Tax Number (KTP/NPWP)" />
                  </div>
                </fieldset>
                <fieldset className="fieldset md:col-span-2">
                  <legend className="fieldset-legend text-black">Address</legend>
                  <textarea className="textarea w-full bg-white border border-gray-300 h-24" {...newCustomerForm.register("address")} />
                </fieldset>
              </div>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="modal-action flex justify-end gap-3 mt-4 w-full">
                <form method="dialog">
                  <button className="btn rounded-md text-white bg-gray-400 border-none hover:bg-gray-500">
                    Cancel
                  </button>
                </form>
                <button type="submit" className="btn rounded-md text-white bg-blue-900 border-none hover:bg-blue-800">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

