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

  const getFn = useFetch<InvUsage[], any>({
    url: `/api/web/inv-usage?id=${masterAccountId}`,
    method: "GET",
    onError: (m) => alert(m),
  })

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      getFn.fn(`/api/web/inv-usage?id=${masterAccountId}`, {}, (result) => {
        setUsageHistory(result)
      })
    }
  }, [masterAccountId])


  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  const filtered = search.trim()
    ? usageHistory.filter((u) =>
      u.itemId?.name.toLowerCase().includes(search.toLowerCase()) ||
      u.itemId?.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      u.note?.toLowerCase().includes(search.toLowerCase())
    )
    : usageHistory

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inventory Usage</h1>
          <p className="text-slate-500 text-sm mt-1">History of consumed internal items.</p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-slate-600 font-medium text-sm">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
          <input
            type="search"
            placeholder="Search number, item, note…"
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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 mx-auto mb-3 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m2.25-10.5a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 7.5v10.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25V7.5z" />
            </svg>
            <p className="font-medium">{getFn.message || "No usage history found"}</p>
            <p className="text-xs mt-1 text-slate-300">Start using items from the Inventory Items page.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No records match your search.</td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(u.used_at).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{u.itemId?.name}</div>
                        <div className="text-[10px] text-slate-400">{u.itemId?.itemCode} • {u.itemId?.category}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-xs">
                          {u.qty} {u.itemId?.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={u.note}>
                        {u.note || <span className="text-slate-300">—</span>}
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
  )
}
