"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"

import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const BANKS = [
  "BCA", "BRI", "BNI", "Mandiri", "CIMB Niaga", "Danamon",
  "Permata", "BTN", "Maybank", "OCBC NISP", "Panin Bank",
  "Bank Syariah Indonesia (BSI)", "Lainnya",
]

export default function BankAccounts() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [accounts, setAccounts] = useState<any[]>([])
  const router = useRouter()

  const newForm = useForm()
  const editForm = useForm()

  const addFn = useFetch<any, any>({
    url: "/api/web/bank-accounts",
    method: "POST",
    onError: (m) => alert(m),
  })

  const putFn = useFetch<any, any>({
    url: "/api/web/bank-accounts",
    method: "PUT",
    onError: (m) => alert(m),
  })

  const getFn = useFetch<any[], any>({
    url: `/api/web/bank-accounts?id=xxx`,
    method: "GET",
    onError: (m) => alert(m),
  })

  const deleteFn = useFetch<any, any>({
    url: `/api/web/bank-accounts?id=xxx`,
    method: "DELETE",
    onError: (m) => alert(m),
  })

  useEffect(() => {
    if (hasHydrated) {
      getFn.fn(`/api/web/bank-accounts?id=${masterAccountId}`, "{}", (result) => {
        setAccounts(result)
      })
    }
  }, [masterAccountId])

  async function submit(data: any) {
    const body = JSON.stringify({ ...data, id: masterAccountId })
    await addFn.fn("", body, (c) => {
      modalRef.current?.close()
      newForm.reset()
      setAccounts([c, ...accounts])
    })
  }

  async function editSubmit(data: any) {
    const body = JSON.stringify({ ...data })
    await putFn.fn("", body, (result) => {
      setAccounts(accounts.map((a) => (a._id === result._id ? result : a)))
      editRef.current?.close()
    })
  }

  async function del(_id: string) {
    if (!confirm("Delete this bank account?")) return
    await deleteFn.fn(`/api/web/bank-accounts?id=${_id}`, "{}", (result) => {
      setAccounts(accounts.filter((a) => a._id !== result))
    })
  }

  function openEdit(item: any) {
    editForm.reset({
      _id: item._id,
      bank: item.bank,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
    })
    editRef.current?.showModal()
  }

  if (!hasHydrated) return null
  if (!loggedIn) router.push("/login")
  if (!isSuperAdmin) router.push("/dashboard")

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        {/* Header */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold">Bank Accounts</span>
          <span className="text-sm text-gray-500">Manage your company bank account numbers</span>
        </div>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-4">
          {/* Toolbar */}
          <div className="flex flex-row items-center gap-2">
            <button
              id="btn-add-bank-account"
              onClick={() => { newForm.reset(); modalRef.current?.showModal() }}
              className="btn ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Account
            </button>
          </div>

          {/* Table */}
          {getFn.loading ? (
            <div className="flex-1 flex justify-center items-center">
              <span className="loading loading-spinner loading-xl" />
            </div>
          ) : getFn.error || getFn.noResult ? (
            <div className="text-red-600 p-4">{getFn.message}</div>
          ) : accounts.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-400 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="size-16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
              <span className="text-sm">No bank accounts yet. Click &ldquo;Add Account&rdquo; to get started.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-xs uppercase text-gray-500">#</th>
                    <th className="text-xs uppercase text-gray-500">Bank</th>
                    <th className="text-xs uppercase text-gray-500">Account Number</th>
                    <th className="text-xs uppercase text-gray-500">In the Name Of</th>
                    <th className="text-xs uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a, index) => (
                    <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                      <td className="text-gray-400 text-sm">{index + 1}</td>
                      <td>
                        <span className="font-semibold text-blue-900">{a.bank}</span>
                      </td>
                      <td>
                        <span className="font-mono tracking-wider">{a.accountNumber}</span>
                      </td>
                      <td>{a.accountName}</td>
                      <td>
                        <div className="flex flex-row gap-2">
                          <button
                            id={`btn-edit-${a._id}`}
                            className="btn btn-sm"
                            onClick={() => openEdit(a)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                            Edit
                          </button>
                          <button
                            id={`btn-delete-${a._id}`}
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => del(a._id)}
                          >
                            Delete
                          </button>
                        </div>
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
      <dialog id="modal-add-bank" ref={modalRef} className="modal text-black">
        <div className="modal-box">
          <h3 className="text-xl font-bold mb-4">Add Bank Account</h3>
          <form onSubmit={newForm.handleSubmit(submit)} className="flex flex-col gap-3">
            {/* Bank selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium">Bank</label>
              <select
                {...newForm.register("bank", { required: true })}
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">— Select bank —</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {newForm.formState.errors.bank && (
                <span className="text-red-500 text-xs">Bank is required</span>
              )}
            </div>

            {/* Account number */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium">Account Number</label>
              <input
                {...newForm.register("accountNumber", { required: true })}
                type="text"
                placeholder="e.g. 1234567890"
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
              />
              {newForm.formState.errors.accountNumber && (
                <span className="text-red-500 text-xs">Account number is required</span>
              )}
            </div>

            {/* Account holder name */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium">In the Name Of</label>
              <input
                {...newForm.register("accountName", { required: true })}
                type="text"
                placeholder="e.g. PT. Lestari Sejati Sejahtera"
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              {newForm.formState.errors.accountName && (
                <span className="text-red-500 text-xs">Account name is required</span>
              )}
            </div>

            {addFn.error && (
              <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
            )}

            <div className="flex flex-row gap-2 justify-end mt-2">
              <form method="dialog">
                <button type="submit" className="btn bg-gray-200 text-gray-700 border-0">
                  Cancel
                </button>
              </form>
              <button
                id="btn-submit-add-bank"
                type="submit"
                className="btn bg-blue-900 text-white border-0 hover:bg-blue-800"
                disabled={addFn.loading}
              >
                {addFn.loading ? <span className="loading loading-spinner loading-sm" /> : "Add Account"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* Edit Modal */}
      <dialog id="modal-edit-bank" ref={editRef} className="modal text-black">
        <div className="modal-box">
          <h3 className="text-xl font-bold mb-4">Edit Bank Account</h3>
          <form onSubmit={editForm.handleSubmit(editSubmit)} className="flex flex-col gap-3">
            <input type="hidden" {...editForm.register("_id")} />

            {/* Bank selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium">Bank</label>
              <select
                {...editForm.register("bank", { required: true })}
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">— Select bank —</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {editForm.formState.errors.bank && (
                <span className="text-red-500 text-xs">Bank is required</span>
              )}
            </div>

            {/* Account number */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium">Account Number</label>
              <input
                {...editForm.register("accountNumber", { required: true })}
                type="text"
                placeholder="e.g. 1234567890"
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
              />
              {editForm.formState.errors.accountNumber && (
                <span className="text-red-500 text-xs">Account number is required</span>
              )}
            </div>

            {/* Account holder name */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600 font-medium">In the Name Of</label>
              <input
                {...editForm.register("accountName", { required: true })}
                type="text"
                placeholder="e.g. PT. Lestari Sejati Sejahtera"
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              {editForm.formState.errors.accountName && (
                <span className="text-red-500 text-xs">Account name is required</span>
              )}
            </div>

            {putFn.error && (
              <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
            )}

            <div className="flex flex-row gap-2 justify-end mt-2">
              <form method="dialog">
                <button type="submit" className="btn bg-gray-200 text-gray-700 border-0">
                  Cancel
                </button>
              </form>
              <button
                id="btn-submit-edit-bank"
                type="submit"
                className="btn bg-blue-900 text-white border-0 hover:bg-blue-800"
                disabled={putFn.loading}
              >
                {putFn.loading ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  )
}
