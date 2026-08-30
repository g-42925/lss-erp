"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";

import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'

export default function Taxes() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [tax, setTax] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const newTaxForm = useForm()
  const editTaxForm = useForm()
  const router = useRouter()

  const putFn = useFetch<any, any>({
    url: '/api/web/tax',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/tax',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const getFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const deleteFn = useFetch<any[], any>({
    url: '',
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

    await addFn.fn('', body, (c) => {
      modalRef.current?.close()

      setTax(
        [
          ...tax,
          c,
        ]
      )

    })
  }

  async function search(v: string) {
    if (v.length > 0) {
      const result = tax.filter((r) => {
        return r.name.toLowerCase().includes(v.toLowerCase())
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

  async function editSubmit(data: any) {
    const body = JSON.stringify({
      ...data,
    })

    await putFn.fn('', body, (result) => {
      const [target] = tax.filter((r) => r._id == result._id)

      Object.keys(target).forEach(key => {
        target[key] = result[key]
      })

      setSearchResult([])

      editRef.current?.close()
    })
  }

  async function del(_id: string) {
    const url = `/api/web/tax?id=${_id}`
    const body = JSON.stringify({})

    await deleteFn.fn(url, body, (result) => {
      setTax(
        tax.filter((c) => c._id != result)
      )
    })
  }

  async function edit(_id: string) {
    const [filter] = tax.filter((c) => c._id == _id)

    editTaxForm.reset({
      _id: filter._id,
      name: filter.name,
      value: filter.value,
      isPPh: filter.isPPh || false,
      isLiability: filter.isLiability || false,
    })

    editRef.current?.showModal()
  }

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/tax?id=${masterAccountId}`

      const body = JSON.stringify({})

      getFn.fn(url, body, (result) => {
        setTax(result)
      })
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')


  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Tax <span className="text-sm leading-loose">Manage your tax</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          <div className="flex flex-row">
            <button onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
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
                  <div className="overflow-x-auto w-full">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Value (%)</th>
                        <th>Type</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          tax.map((u, index) => {
                            return (
                              <tr key={index}>
                                <td>{u.name}</td>
                                <td>{u.value}</td>
                                <td>{u.isPPh ? <span className="badge badge-primary text-white">PPh</span> : <span className="badge badge-ghost text-black">Non-PPh</span>}</td>
                                <td className="flex flex-row gap-3">
                                  <button className="btn" onClick={() => edit(u._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button className="btn" onClick={() => del(u._id)}>Delete</button>
                                </td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((u, index) => {
                            return (
                              <tr key={index}>
                                <td>{u.name}</td>
                                <td>{u.value}</td>
                                <td>{u.isPPh ? <span className="badge badge-primary text-white">PPh</span> : <span className="badge badge-ghost text-black">Non-PPh</span>}</td>
                                <td className="flex flex-row gap-3">
                                  <button className="btn" onClick={() => edit(u._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button className="btn" onClick={() => del(u._id)}>Delete</button>
                                </td>
                              </tr>
                            )
                          })
                      }
                    </tbody>
                  </table>
                  </div>
                </div>
          }
        </div>
      </div>
      <dialog id="my_modal_2" ref={editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-bold">Edit Tax</h3>
            <form onSubmit={editTaxForm.handleSubmit(editSubmit)} className="flex flex-col gap-4">
              <input type="hidden" {...editTaxForm.register("_id")} />
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tax Name</legend>
                <input
                  {...editTaxForm.register("name", { required: true })}
                  type="text"
                  placeholder="e.g. PPN 11%"
                  className="input w-full"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Value (%)</legend>
                <input
                  {...editTaxForm.register("value", { valueAsNumber: true, required: true })}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 11"
                  className="input w-full"
                />
              </fieldset>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input {...editTaxForm.register("isPPh")} type="checkbox" id="edit-isPPh" className="checkbox checkbox-primary" />
                  <span className="text-sm font-medium">Is this PPh?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input {...editTaxForm.register("isLiability")} type="checkbox" id="edit-isLiability" className="checkbox checkbox-primary" />
                  <span className="text-sm font-medium">Is this Liability?</span>
                </label>
              </div>
              {putFn.noResult || putFn.error ? <p className="text-red-600 text-sm">Terjadi kesalahan. Silakan coba lagi.</p> : null}
              <div className="flex flex-row gap-3 modal-action mt-2">
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => editRef.current?.close()}
                >
                  Cancel
                </button>
                <button type="submit" disabled={putFn.loading} className="btn bg-blue-900 text-white flex-1">
                  {putFn.loading ? <span className="loading loading-spinner loading-sm"></span> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-bold">Add Tax</h3>
            <form onSubmit={newTaxForm.handleSubmit(submit)} className="flex flex-col gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tax Name</legend>
                <input
                  {...newTaxForm.register("name", { required: true })}
                  type="text"
                  placeholder="e.g. PPN 11%"
                  className="input w-full"
                />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Value (%)</legend>
                <input
                  {...newTaxForm.register("value", { valueAsNumber: true, required: true })}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 11"
                  className="input w-full"
                />
              </fieldset>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input {...newTaxForm.register("isPPh")} type="checkbox" id="isPPh" className="checkbox checkbox-primary" />
                  <span className="text-sm font-medium">Is this PPh?</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input {...newTaxForm.register("isLiability")} type="checkbox" id="isLiability" className="checkbox checkbox-primary" />
                  <span className="text-sm font-medium">Is this Liability?</span>
                </label>
              </div>
              {addFn.noResult || addFn.error ? <p className="text-red-600 text-sm">Terjadi kesalahan. Silakan coba lagi.</p> : null}
              <div className="flex flex-row gap-3 modal-action mt-2">
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => modalRef.current?.close()}
                >
                  Cancel
                </button>
                <button type="submit" disabled={addFn.loading} className="btn bg-blue-900 text-white flex-1">
                  {addFn.loading ? <span className="loading loading-spinner loading-sm"></span> : 'Add Tax'}
                </button>
              </div>
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