"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"

import { useForm, UseFormReturn } from "react-hook-form"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

type TaxItem = {
  _id: string
  name: string
  value: number
  isPPh?: boolean
  isLiability?: boolean
}

type TaxFormData = {
  _id?: string
  name: string
  value: number
  isPPh: boolean
  isLiability: boolean
}

export default function Taxes() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const [tax, setTax] = useState<TaxItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const newTaxForm = useForm<TaxFormData>()
  const editTaxForm = useForm<TaxFormData>()
  const router = useRouter()

  const putFn = useFetch<TaxItem, string>({
    url: "/api/web/tax",
    method: "PUT",
    onError: (m) => alert(m),
  })

  const addFn = useFetch<TaxItem, string>({
    url: "/api/web/tax",
    method: "POST",
    onError: (m) => alert(m),
  })

  const getFn = useFetch<TaxItem[], string>({
    url: "",
    method: "GET",
    onError: (m) => alert(m),
  })

  const deleteFn = useFetch<string, string>({
    url: "",
    method: "DELETE",
    onError: (m) => alert(m),
  })

  const displayedTaxes = useMemo(() => {
    if (!searchQuery.trim()) return tax
    return tax.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [tax, searchQuery])

  async function submit(data: TaxFormData) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
    })

    await addFn.fn("", body, (c) => {
      setIsAddOpen(false)
      newTaxForm.reset()
      setTax((prev) => [...prev, c])
    })
  }

  async function editSubmit(data: TaxFormData) {
    const body = JSON.stringify(data)

    await putFn.fn("", body, (result) => {
      setTax((prev) =>
        prev.map((item) => (item._id === result._id ? result : item))
      )
      setIsEditOpen(false)
    })
  }

  async function del(_id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus pajak ini?")) return

    const url = `/api/web/tax?id=${_id}`
    const body = JSON.stringify({})

    await deleteFn.fn(url, body, (result) => {
      setTax((prev) => prev.filter((c) => c._id !== result))
    })
  }

  function edit(_id: string) {
    const target = tax.find((c) => c._id === _id)
    if (!target) return

    editTaxForm.reset({
      _id: target._id,
      name: target.name,
      value: target.value,
      isPPh: target.isPPh || false,
      isLiability: target.isLiability || false,
    })

    setIsEditOpen(true)
  }

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      const url = `/api/web/tax?id=${masterAccountId}`
      const body = JSON.stringify({})

      getFn.fn(url, body, (result) => {
        setTax(result)
      })
    }
  }, [hasHydrated, masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) {
    router.push("/login")
    return null
  }

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Tax</h1>
          <span className="text-sm text-gray-500">Manage your tax</span>
        </div>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6 rounded-b-md shadow-sm">
          <div className="flex flex-row justify-between items-center gap-4">
            <input
              type="text"
              placeholder="Search tax..."
              className="input input-bordered w-full max-w-xs bg-white text-black border-gray-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              onClick={() => {
                newTaxForm.reset()
                setIsAddOpen(true)
              }}
              className="btn bg-blue-900 hover:bg-blue-800 text-white border-none flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Tax
            </button>
          </div>

          {getFn.loading ? (
            <div className="flex-1 flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg text-blue-900"></span>
            </div>
          ) : getFn.error || getFn.noResult ? (
            <div className="py-6 text-center text-red-600">
              <p>{getFn.message || "Gagal memuat data pajak."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="table w-full">
                <thead>
                  <tr className="text-black border-b border-gray-200">
                    <th>Name</th>
                    <th>Value (%)</th>
                    <th>Type</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTaxes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-gray-500">
                        Tidak ada data pajak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    displayedTaxes.map((u) => (
                      <tr key={u._id} className="border-b border-gray-100">
                        <td className="font-medium">{u.name}</td>
                        <td>{u.value}%</td>
                        <td>
                          {u.isPPh ? (
                            <span className="badge badge-primary text-white">
                              PPh
                            </span>
                          ) : (
                            <span className="badge badge-ghost text-black bg-gray-200">
                              Non-PPh
                            </span>
                          )}
                        </td>
                        <td className="flex justify-end gap-2">
                          <button
                            className="btn btn-sm btn-outline border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black"
                            onClick={() => edit(u._id)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="size-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                              />
                            </svg>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-error text-white"
                            onClick={() => del(u._id)}
                          >
                            Delete
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

      {/* Custom Modal Add Tax */}
      {isAddOpen && (
        <TaxModal
          title="Add Tax"
          form={newTaxForm}
          onSubmit={submit}
          onClose={() => setIsAddOpen(false)}
          loading={addFn.loading}
          hasError={Boolean(addFn.noResult || addFn.error)}
          submitLabel="Add Tax"
        />
      )}

      {/* Custom Modal Edit Tax */}
      {isEditOpen && (
        <TaxModal
          title="Edit Tax"
          form={editTaxForm}
          onSubmit={editSubmit}
          onClose={() => setIsEditOpen(false)}
          loading={putFn.loading}
          hasError={Boolean(putFn.noResult || putFn.error)}
          submitLabel="Save Changes"
          isEdit
        />
      )}
    </>
  )
}

// Sub-Komponen Reusable Modal (Tanpa DaisyUI dialog native)
type TaxModalProps = {
  title: string
  form: UseFormReturn<TaxFormData>
  onSubmit: (data: TaxFormData) => void
  onClose: () => void
  loading: boolean
  hasError: boolean
  submitLabel: string
  isEdit?: boolean
}

function TaxModal({
  title,
  form,
  onSubmit,
  onClose,
  loading,
  hasError,
  submitLabel,
  isEdit = false,
}: TaxModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-black relative">
        <h3 className="font-bold text-lg mb-4 text-black">{title}</h3>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {isEdit && <input type="hidden" {...form.register("_id")} />}

          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text font-semibold text-black">Tax Name</span>
            </label>
            <input
              {...form.register("name", { required: true })}
              type="text"
              placeholder="e.g. PPN 11%"
              className="input input-bordered w-full bg-white border-gray-300 text-black"
            />
          </div>

          <div className="form-control w-full">
            <label className="label py-1">
              <span className="label-text font-semibold text-black">Value (%)</span>
            </label>
            <input
              {...form.register("value", {
                valueAsNumber: true,
                required: true,
              })}
              type="number"
              step="0.01"
              placeholder="e.g. 11"
              className="input input-bordered w-full bg-white border-gray-300 text-black"
            />
          </div>

          <div className="flex flex-col gap-3 mt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...form.register("isPPh")}
                type="checkbox"
                className="checkbox checkbox-primary bg-white border-gray-300"
              />
              <span className="text-sm font-medium text-black">Is this PPh?</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...form.register("isLiability")}
                type="checkbox"
                className="checkbox checkbox-primary bg-white border-gray-300"
              />
              <span className="text-sm font-medium text-black">Is this Liability?</span>
            </label>
          </div>

          {hasError && (
            <span className="text-xs text-red-600">
              Terjadi kesalahan. Silakan coba lagi.
            </span>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-ghost text-black"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn bg-blue-900 hover:bg-blue-800 text-white border-none"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}