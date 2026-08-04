/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react';
import { LocationAdd01Icon } from '@hugeicons/core-free-icons';

export default function Packaging() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [packagings, setPackagings] = useState<any[]>([])

  const newPackagingForm = useForm()
  const router = useRouter()

  const addFn = useFetch<any, any>({
    url: '/api/web/packaging',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const getFn = useFetch<any[], any>({
    url: `/api/web/packaging?id=xxx`,
    method: 'GET'
  })

  async function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
    })

    await addFn.fn('', body, (packaging) => {
      const modal = document.getElementById('my_modal_1') as HTMLDialogElement;
      if (modal) modal.close();

      setPackagings(
        [
          ...packagings,
          packaging
        ]
      )

      newPackagingForm.reset()
    })
  }

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      const url = `/api/web/packaging?id=${masterAccountId}`
      const body = JSON.stringify({})

      getFn.fn(url, body, (result) => {
        setPackagings(result)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterAccountId, hasHydrated])

  function addPackaging() {
    const modal = document.getElementById('my_modal_1') as HTMLDialogElement;
    if (modal) modal.showModal();
  }

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Packaging <span className="text-sm leading-loose">Manage packaging types</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All packagings</span>
            <button onClick={addPackaging} className="ml-auto">
              <HugeiconsIcon
                icon={LocationAdd01Icon}
                size={24}
                color="currentColor"
                strokeWidth={1.5}
              />
            </button>
          </div>
          {
            getFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getFn.error || getFn.noResult || !packagings
                ?
                <div>
                  <p>{getFn.message || "Failed to load"}</p>
                </div>
                :
                <div>
                  <table className="table">
                    <thead className="text-black">
                      <tr>
                        <th>Name</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        packagings.map((packaging, index) => {
                          return (
                            <tr key={index}>
                              <td>{packaging.name}</td>
                              <td>{packaging.qty}</td>
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

      <dialog id="my_modal_1" className="modal text-black">
        <div className="modal-box bg-white">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Add Packaging</span>
            <form onSubmit={newPackagingForm.handleSubmit(submit)} className="relative flex flex-col gap-3">
              <input {...newPackagingForm.register("name", { required: true })} type="text" placeholder="Packaging name" className="mb-3 w-full p-3 rounded-md border-1 border-black bg-white" />
              <input {...newPackagingForm.register("mainUnit", { required: true })} type="text" placeholder="Main unit" className="mb-3 w-full p-3 rounded-md border-1 border-black bg-white" />
              <input {...newPackagingForm.register("qty", { valueAsNumber: true, required: true })} type="number" placeholder="Quantity (e.g. 12)" className="mb-3 w-full p-3 rounded-md border-1 border-black bg-white" />
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900">something went wrong</label> : <></>}
              <div className="flex flex-row gap-3 mt-4 justify-end">
                <button type="button" onClick={() => (document.getElementById('my_modal_1') as HTMLDialogElement)?.close()} className="btn p-3 rounded-md text-white bg-gray-400 border-none">
                  Cancel
                </button>
                <button type="submit" disabled={addFn.loading} className={`btn p-3 rounded-md text-white bg-blue-900 border-none ${addFn.loading ? 'opacity-50' : ''}`}>
                  {addFn.loading ? 'Adding...' : 'Add'}
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
