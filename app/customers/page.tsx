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

  const [customers, setCustomers] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const newCustomerForm = useForm();
  const editCustomerForm = useForm();
  const router = useRouter();

  const getCustomersFn = useFetch<any[], any>({
    url: `/api/web/customers?id=xxx`,
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
      taxNumber: customer.taxNumber,
      creditLimit: customer.creditLimit,
      payTerm: customer.payTerm,
      openingBalance: customer.openingBalance,
      advanceBalance: customer.advanceBalance,
      address: customer.address,
      mobile: customer.mobile,
      totalSaleDue: customer.totalSaleDue
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
        <span className="text-2xl">Customers <span className="text-sm leading-loose">Manage your customers</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your Customers</span>
            <button disabled={!isSuperAdmin && roleDetail.permission === 'readonly'} onClick={() => modalRef.current?.show()} className="ml-auto">
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
                          customers.map((c) => {
                            return (
                              <tr key={c._id}>
                                <td>{c.bussinessName}</td>
                                <td className="max-w-[10ch] truncate">{c.email} </td>
                                <td className="max-w-[10ch] truncate">{c.mobile} </td>
                                <td>
                                  <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} onClick={() => edit(c._id)}>
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
                          searchResult.map((c) => {
                            return (
                              <tr key={c._id}>
                                <td>{c.bussinessName}</td>
                                <td>{c.email} </td>
                                <td>{c.taxNumber} </td>
                                <td>{c.address} </td>
                                <td>{c.mobile} </td>
                                <td>
                                  <button disabled={!isSuperAdmin && roleDetail.permission !== 'addandedit'} onClick={() => edit(c._id)}>
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
            <span className="text-2xl">Edit Customer</span>
            <form onSubmit={(e) => { void editCustomerForm.handleSubmit(handleEdit)(e); }} className="h-140 flex flex-col gap-3 relative">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Bussiness Name</legend>
                  <input className="input w-full bg-white" {...editCustomerForm.register("bussinessName")} type="text" />
                </fieldset>
                <fieldset className="fieldset ">
                  <legend className="fieldset-legend text-black">Email</legend>
                  <input className="input w-full bg-white" {...editCustomerForm.register("email")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Tax Number</legend>
                  <input className="input w-full bg-white" {...editCustomerForm.register("taxNumber")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Address</legend>
                  <input className="input w-full bg-white" {...editCustomerForm.register("address")} type="text" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Mobile</legend>
                  <input className="input w-full bg-white" {...editCustomerForm.register("mobile")} type="text" />
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
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Customer</span>
            <form onSubmit={(e) => { void newCustomerForm.handleSubmit(submit)(e); }} className="h-140 flex flex-col gap-3 relative">
              <div className="flex flex-col gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Bussiness Name</legend>
                  <input className="input w-full bg-white" {...newCustomerForm.register("bussinessName")} type="text bg-white border-1 border-black" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Email</legend>
                  <input className="input w-full bg-white" {...newCustomerForm.register("email")} type="text bg-white border-1 border-black" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Tax Number</legend>
                  <input className="input w-full bg-white" {...newCustomerForm.register("taxNumber")} type="text bg-white border-1 border-black" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Address</legend>
                  <input className="input w-full bg-white" {...newCustomerForm.register("address")} type="text bg-white border-1 border-black" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend text-black">Mobile</legend>
                  <input className="input w-full bg-white" {...newCustomerForm.register("mobile")} type="text bg-white border-1 border-black" />
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

