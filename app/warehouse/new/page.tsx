"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'

export default function WarehouseNew() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const locationId = useAuth((state) => state.locationId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [warehouses, setWarehouses] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])

  const newWarehouseForm = useForm()
  const editWarehouseForm = useForm()
  const router = useRouter()

  const getWarehousesFn = useFetch<any[], any>({
    url: `/api/web/warehouse?id=xxx`,
    method: 'GET'
  })

  const getLocationsFn = useFetch<any[], any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET'
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/warehouse',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const putFn = useFetch<any, any>({
    url: '/api/web/warehouse',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const deleteFn = useFetch<any, any>({
    url: '/api/web/warehouse?id=xxx',
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

    await addFn.fn('', body, (newWarehouse) => {
      modalRef.current?.close()
      setWarehouses([...warehouses, newWarehouse])
      newWarehouseForm.reset()
      // Refresh to get populated location
      fetchWarehouses()
    })
  }

  async function editSubmit(data: any) {
    const body = JSON.stringify(data)

    await putFn.fn('', body, (result) => {
      setWarehouses(warehouses.map(w => w._id === result._id ? result : w))
      editRef.current?.close()
    })
  }

  async function del(_id: string) {
    if (!confirm("Are you sure you want to delete this warehouse?")) return

    const url = `/api/web/warehouse?id=${_id}`
    await deleteFn.fn(url, JSON.stringify({}), (result) => {
      setWarehouses(warehouses.filter((w) => w._id !== result))
    })
  }

  async function edit(warehouse: any) {
    editWarehouseForm.reset({
      _id: warehouse._id,
      name: warehouse.name,
      code: warehouse.code,
      locationId: warehouse.locationId?._id || warehouse.locationId,
    })
    editRef.current?.showModal()
  }

  const fetchWarehouses = () => {
    const url = `/api/web/warehouse?id=${masterAccountId}`
    getWarehousesFn.fn(url, JSON.stringify({}), (result) => {
      setWarehouses(result)
    })
  }

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      fetchWarehouses()

      const locUrl = `/api/web/location?id=${masterAccountId}`
      getLocationsFn.fn(locUrl, JSON.stringify({}), (result) => {
        setLocations(result)
      })
    }
  }, [masterAccountId, hasHydrated])

  async function search(v: string) {
    if (v.length > 0) {
      const result = warehouses.filter((w) =>
        w.name.toLowerCase().includes(v.toLowerCase()) ||
        w.code.toLowerCase().includes(v.toLowerCase())
      )
      setSearchResult(result)
    }
    else {
      setSearchResult([])
    }
  }

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  //if (!isSuperAdmin) router.push('/dashboard')

  const displayList = searchResult.length > 0 || (searchResult.length === 0 && (document.querySelector('input[type="search"]') as HTMLInputElement)?.value !== '')
    ? searchResult
    : warehouses

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <div className="flex flex-row items-center gap-2">
          <span className="text-2xl font-bold">Warehouses</span>
          <span className="text-sm text-gray-500 mt-2">Manage your warehouse locations</span>
        </div>

        <div className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-6 gap-6 rounded-lg">
          <div className="flex flex-row items-center border-b pb-4">
            <span className="text-lg font-semibold text-gray-700">All Warehouses</span>
            <button onClick={() => modalRef.current?.showModal()} className="btn btn-primary ml-auto flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Warehouse
            </button>
          </div>

          <div className="flex flex-row gap-4 items-center">
            <div className="flex flex-row gap-2 items-center">
              <span className="text-sm text-gray-500">Show</span>
              <select className="select select-bordered select-sm w-20">
                <option>20</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>
            <div className="relative ml-auto w-64">
              <input
                onKeyUp={(e) => search((e.target as HTMLInputElement).value)}
                type="search"
                placeholder="Search warehouse..."
                className="input input-bordered w-full pr-10"
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
          </div>

          {getWarehousesFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center py-20">
              <span className="loading loading-spinner loading-xl text-blue-900"></span>
              <span className="mt-4 text-gray-500 font-medium">Loading warehouses...</span>
            </div>
          ) : getWarehousesFn.error || warehouses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-gray-300 mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1M5.25 10.75l7.5-2.727m7.5 2.727-4.5-1.636M12.75 10.75l4.5-1.136" />
              </svg>
              <p className="text-gray-500 font-medium">{getWarehousesFn.message || "No warehouses found. Click 'Add Warehouse' to create one."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full shadow-sm rounded-lg overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="py-4">Warehouse Name</th>
                    <th>Code</th>
                    <th>Location</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((warehouse, index) => (
                    <tr key={index} className="hover:bg-blue-50 transition-colors">
                      <td className="font-semibold text-gray-800">{warehouse.name}</td>
                      <td><span className="badge badge-ghost font-mono">{warehouse.code}</span></td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium">{warehouse.locationId?.name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="flex flex-row justify-end gap-2">
                        <button className="btn btn-sm btn-ghost text-blue-600 hover:bg-blue-100" onClick={() => edit(warehouse)}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-ghost text-red-600 hover:bg-red-100" onClick={() => del(warehouse._id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <dialog ref={modalRef} className="modal text-black">
        <div className="modal-box max-w-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-2xl font-bold">Add New Warehouse</h3>
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost">✕</button>
              </form>
            </div>

            <form onSubmit={newWarehouseForm.handleSubmit(submit)} className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-semibold">Warehouse Name</legend>
                  <input
                    {...newWarehouseForm.register("name", { required: true })}
                    type="text"
                    placeholder="Main Warehouse"
                    className="input input-bordered w-full"
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-semibold">Warehouse Code</legend>
                  <input
                    {...newWarehouseForm.register("code", { required: true })}
                    type="text"
                    placeholder="WH-001"
                    className="input input-bordered w-full"
                  />
                </fieldset>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend font-semibold">Location</legend>
                <select {...newWarehouseForm.register("locationId", { required: true })} className="select select-bordered w-full">
                  {locations.map((loc) => (
                    <option disabled={loc._id != locationId} key={loc._id} value={loc._id}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
                <div className="fieldset-label text-xs mt-1">Assign this warehouse to a broad geographic location</div>
              </fieldset>

              {(addFn.error || addFn.noResult) && (
                <div className="alert alert-error text-sm py-2">
                  <span>{addFn.message || "Something went wrong. Please try again."}</span>
                </div>
              )}

              <div className="modal-action mt-6 border-t pt-4">
                <form method="dialog">
                  <button className="btn btn-ghost px-6 mr-2">Cancel</button>
                </form>
                <button
                  type="submit"
                  className="btn btn-primary px-10"
                  disabled={addFn.loading}
                >
                  {addFn.loading ? <span className="loading loading-spinner"></span> : "Save Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* Edit Modal */}
      <dialog ref={editRef} className="modal text-black">
        <div className="modal-box max-w-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-2xl font-bold">Edit Warehouse</h3>
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost">✕</button>
              </form>
            </div>

            <form onSubmit={editWarehouseForm.handleSubmit(editSubmit)} className="flex flex-col gap-4 mt-2">
              <input {...editWarehouseForm.register('_id')} type="hidden" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-semibold">Warehouse Name</legend>
                  <input
                    {...editWarehouseForm.register("name", { required: true })}
                    type="text"
                    className="input input-bordered w-full"
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend font-semibold">Warehouse Code</legend>
                  <input
                    {...editWarehouseForm.register("code", { required: true })}
                    type="text"
                    className="input input-bordered w-full"
                  />
                </fieldset>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend font-semibold">Location</legend>
                <select {...editWarehouseForm.register("locationId", { required: true })} className="select select-bordered w-full">
                  {locations.map((loc) => (
                    <option disabled={loc._id != locationId} key={loc._id} value={loc._id}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
              </fieldset>

              {(putFn.error) && (
                <div className="alert alert-error text-sm py-2">
                  <span>An error occurred while updating the warehouse.</span>
                </div>
              )}

              <div className="modal-action mt-6 border-t pt-4">
                <form method="dialog">
                  <button className="btn btn-ghost px-6 mr-2">Cancel</button>
                </form>
                <button
                  type="submit"
                  className="btn btn-primary px-10"
                  disabled={putFn.loading}
                >
                  {putFn.loading ? <span className="loading loading-spinner"></span> : "Update"}
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
