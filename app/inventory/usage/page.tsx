
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type InvUsage = {
  _id: string
  usageNumber: string
  itemId: {
    _id: string
    name: string
    itemCode: string
    unit: string
    category: string
  }
  qty: number
  note: string
  usage_at: string
}

export default function InvUsagePage() {
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()

  const [usageHistory, setUsageHistory] = useState<InvUsage[]>([])
  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState<InvUsage | null>(null)
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")

  const getFn = useFetch<InvUsage[], any>({
    url: `/api/web/inv-usage?id=${masterAccountId}`,
    method: "GET",
    onError: (m) => alert(m),
  })

  const updateFn = useFetch<any, any>({
    url: `/api/web/inv-usage?id=${masterAccountId}`,
    method: "PUT",
    onError: (m) => alert(m),
  })

  const fetchUsage = () => {
    if (!masterAccountId) return

    getFn.fn(
      `/api/web/inv-usage?id=${masterAccountId}`,
      {},
      (result) => setUsageHistory(result)
    )
  }

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      fetchUsage()
    }
  }, [masterAccountId, hasHydrated])

  const openEdit = (usage: InvUsage) => {
    setEditing(usage)
    setQty(String(usage.qty))
    setNote(usage.note || "")

    document.getElementById("edit_usage_modal")?.showModal()
  }

  const closeEdit = () => {
    document.getElementById("edit_usage_modal")?.close()
    setEditing(null)
    setQty("")
    setNote("")
  }

  const handleUpdate = () => {
    if (!editing) return

    if (!qty || Number(qty) <= 0) {
      alert("Quantity must be greater than zero")
      return
    }

    updateFn.fn(
      `/api/web/inv-usage?id=${masterAccountId}`,
      JSON.stringify({
        _id: editing._id,
        qty: Number(qty),
        note,
      }),
      () => {
        closeEdit()
        fetchUsage()
      }
    )
  }

  if (!hasHydrated) return null

  if (!loggedIn) {
    router.push("/login")
    return null
  }

  const filtered = search.trim()
    ? usageHistory.filter((u) =>
      u.itemId?.name.toLowerCase().includes(search.toLowerCase()) ||
      u.itemId?.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      u.note?.toLowerCase().includes(search.toLowerCase()) ||
      u.usageNumber?.toLowerCase().includes(search.toLowerCase())
    )
    : usageHistory

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Inventory Usage
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            History of consumed internal items.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-slate-600 font-medium text-sm">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>

          <input
            type="search"
            placeholder="Search number, item, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-black border border-slate-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>

        {getFn.loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg text-amber-600" />
          </div>
        ) : getFn.error || usageHistory.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-12 mx-auto mb-3 text-slate-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.375M9 18h3.375m2.25-10.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7.5v10.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25V7.5z"
              />
            </svg>

            <p className="font-medium">
              {getFn.message || "No usage history found"}
            </p>

            <p className="text-xs mt-1 text-slate-300">
              Start using items from the Inventory Items page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Item</th>
                  <th className="px-6 py-3 text-center">Qty</th>
                  <th className="px-6 py-3 text-left">Note</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400">
                      No records match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(u.usage_at).toLocaleString("id-ID")}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">
                          {u.itemId?.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {u.itemId?.itemCode} • {u.itemId?.category}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-xs">
                          {u.qty} {u.itemId?.unit}
                        </span>
                      </td>

                      <td
                        className="px-6 py-4 text-slate-500 max-w-xs truncate"
                        title={u.note}
                      >
                        {u.note || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openEdit(u)}
                          className="btn btn-sm btn-outline btn-warning"
                        >
                          Edit
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

      {/* Edit Modal */}
      <dialog id="edit_usage_modal" className="modal">
        <div className="modal-box bg-white max-w-lg">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-xl text-slate-800">
                Edit Inventory Usage
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Update usage information.
              </p>
            </div>

            <button
              onClick={closeEdit}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>

          {editing && (
            <div className="space-y-4">

              {/* Item Information */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">
                  Inventory Item
                </p>

                <p className="font-semibold text-slate-800">
                  {editing.itemId?.name}
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  {editing.itemId?.itemCode} • {editing.itemId?.category}
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  Usage Number: {editing.usageNumber}
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label className="label">
                  <span className="label-text text-slate-700 font-medium">
                    Quantity
                  </span>
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="input input-bordered w-full text-black"
                  placeholder="Enter quantity"
                />

                <p className="text-xs text-slate-400 mt-1">
                  Unit: {editing.itemId?.unit}
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="label">
                  <span className="label-text text-slate-700 font-medium">
                    Note
                  </span>
                </label>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="textarea textarea-bordered w-full text-black"
                  rows={3}
                  placeholder="Enter usage note..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="btn btn-ghost"
                  disabled={updateFn.loading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  className="btn btn-warning"
                  disabled={updateFn.loading}
                >
                  {updateFn.loading ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={closeEdit}>close</button>
        </form>
      </dialog>
    </div>
  )
}
