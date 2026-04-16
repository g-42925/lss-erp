"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import Sidebar from "@/components/sidebar"
import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type InvItem = {
  _id: string
  name: string
  unit: string
  category: string
  itemCode: string
}

type InvLog = {
  _id: string
  logNumber: string
  item: InvItem
  qty: number
  unitPrice: number
  totalPrice: number
  note: string
  finance_status: "pending" | "approved" | "rejected"
  received_status: boolean
  created_at: string
  approved_at: string | null
  received_at: string | null
}

const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n)

export default function FinanceInvLogsPage() {
  const loggedIn = useAuth((s) => s.loggedIn)
  const isSuperAdmin = useAuth((s) => s.isSuperAdmin)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()

  const detailRef = useRef<HTMLDialogElement>(null)

  const [logs, setLogs] = useState<InvLog[]>([])
  const [selected, setSelected] = useState<InvLog | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [confirmAction, setConfirmAction] = useState<{ logId: string; action: "approved" | "rejected" } | null>(null)
  const confirmRef = useRef<HTMLDialogElement>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const getLogsFn = useFetch<InvLog[], any>({
    url: `/api/web/inv-logs?id=${masterAccountId}`,
    method: "GET",
    onError: (m) => alert(m),
  })

  const approveFn = useFetch<InvLog, any>({
    url: `/api/web/inv-logs/approve`,
    method: "PUT",
    onError: (m) => alert(m),
  })

  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return
    getLogsFn.fn(`/api/web/inv-logs?id=${masterAccountId}`, {}, (r) => setLogs(r))
  }, [masterAccountId, hasHydrated])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }
  if (!isSuperAdmin) { router.push("/dashboard"); return null }

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayed =
    filter === "all" ? logs : logs.filter((l) => l.finance_status === filter)

  const pendingCount = logs.filter((l) => l.finance_status === "pending").length
  const approvedCount = logs.filter((l) => l.finance_status === "approved").length
  const rejectedCount = logs.filter((l) => l.finance_status === "rejected").length
  const pendingValue = logs
    .filter((l) => l.finance_status === "pending")
    .reduce((s, l) => s + l.totalPrice, 0)

  // ── Actions ───────────────────────────────────────────────────────────────
  function openConfirm(logId: string, action: "approved" | "rejected") {
    setConfirmAction({ logId, action })
    setRejectNote("")
    confirmRef.current?.showModal()
  }

  async function submitAction() {
    if (!confirmAction) return
    setActionLoading(confirmAction.logId + confirmAction.action)

    await approveFn.fn(
      "",
      JSON.stringify({ _id: confirmAction.logId, action: confirmAction.action }) as any,
      (updated) => {
        setLogs((prev) =>
          prev.map((l) =>
            l._id === confirmAction.logId
              ? { ...l, finance_status: updated.finance_status, approved_at: updated.approved_at }
              : l
          )
        )
        // Close detail modal if the approved/rejected log was the selected one
        if (selected?._id === confirmAction.logId) {
          setSelected((prev) =>
            prev ? { ...prev, finance_status: updated.finance_status, approved_at: updated.approved_at } : prev
          )
        }
        confirmRef.current?.close()
        setConfirmAction(null)
      }
    )
    setActionLoading(null)
  }

  function openDetail(log: InvLog) {
    setSelected(log)
    detailRef.current?.showModal()
  }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const statusBadge = (status: InvLog["finance_status"]) => {
    if (status === "pending")
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
          Pending
        </span>
      )
    if (status === "approved")
      return (
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          Approved
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
        Rejected
      </span>
    )
  }

  const filterTab = (label: string, value: typeof filter, count: number, color: string) => (
    <button
      onClick={() => setFilter(value)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === value
        ? `bg-white shadow-sm border ${color} text-slate-800`
        : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
        }`}
    >
      {label}
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === value ? color.replace("border-", "bg-").replace("-300", "-100") : "bg-slate-100 text-slate-400"}`}>
        {count}
      </span>
    </button>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-indigo-600 text-white p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Finance — Inventory Approval</h1>
              <p className="text-slate-500 text-sm">Review and approve procurement log requests for internal inventory</p>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r-2xl" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Awaiting Approval</p>
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-slate-400 mt-1">Requires action</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-400 rounded-r-2xl" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Approved</p>
            <p className="text-3xl font-bold text-emerald-600">{approvedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Ready for receiving</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-400 rounded-r-2xl" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-500">{rejectedCount}</p>
            <p className="text-xs text-slate-400 mt-1">Not approved</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-indigo-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-400 rounded-r-2xl" />
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Pending Value</p>
            <p className="text-lg font-bold text-indigo-600">{IDR(pendingValue)}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting approval</p>
          </div>
        </div>

        {/* Filter tabs + table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            {filterTab("All", "all", logs.length, "border-slate-300")}
            {filterTab("Pending", "pending", pendingCount, "border-amber-300")}
            {filterTab("Approved", "approved", approvedCount, "border-emerald-300")}
            {filterTab("Rejected", "rejected", rejectedCount, "border-red-300")}
          </div>

          {getLogsFn.loading ? (
            <div className="flex justify-center items-center py-24">
              <span className="loading loading-spinner loading-lg text-indigo-500" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 mx-auto mb-3 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <p className="font-medium">No {filter === "all" ? "" : filter} logs found</p>
              <p className="text-xs mt-1 text-slate-300">
                {filter === "pending" ? "All pending requests have been reviewed." : "Nothing to show for this filter."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead className="text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left">Log #</th>
                    <th className="px-6 py-3 text-left">Item</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-left">Note</th>
                    <th className="px-6 py-3 text-left">Requested</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map((log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => openDetail(log)}
                    >
                      <td className="px-6 py-4 font-mono text-slate-400 text-xs">{log.logNumber}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{log.item?.name ?? "—"}</div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {log.item?.unit} · {log.item?.category || "Uncategorized"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">
                        {log.qty}{" "}
                        <span className="font-normal text-slate-400 text-xs">{log.item?.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">{IDR(log.unitPrice)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800">{IDR(log.totalPrice)}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs max-w-[140px] truncate">{log.note || "—"}</td>
                      <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">{statusBadge(log.finance_status)}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {log.finance_status === "pending" ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              id={`btn-fin-approve-${log._id}`}
                              onClick={(e) => { e.stopPropagation(); openConfirm(log._id, "approved") }}
                              disabled={actionLoading !== null}
                              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-emerald-200"
                            >
                              {actionLoading === log._id + "approved"
                                ? <span className="loading loading-spinner loading-xs" />
                                : "Approve"}
                            </button>
                            <button
                              id={`btn-fin-reject-${log._id}`}
                              onClick={(e) => { e.stopPropagation(); openConfirm(log._id, "rejected") }}
                              disabled={actionLoading !== null}
                              className="bg-white hover:bg-red-50 border border-red-200 disabled:opacity-50 active:scale-95 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                            >
                              {actionLoading === log._id + "rejected"
                                ? <span className="loading loading-spinner loading-xs" />
                                : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            {log.approved_at && (
                              <span className="text-slate-300 text-xs">
                                {new Date(log.approved_at).toLocaleDateString("id-ID")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Log Detail Modal ───────────────────────────────────────────────── */}
      <dialog ref={detailRef} id="modal-log-detail" className="modal">
        <div className="modal-box rounded-2xl max-w-lg p-8 shadow-2xl">
          {selected && (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="font-mono text-slate-400 text-xs mb-1">{selected.logNumber}</p>
                  <h2 className="text-xl font-bold text-slate-800">{selected.item?.name}</h2>
                  <p className="text-slate-400 text-sm">{selected.item?.category || "Uncategorized"} · {selected.item?.unit}</p>
                </div>
                {statusBadge(selected.finance_status)}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Quantity</p>
                  <p className="font-bold text-slate-800 text-lg">{selected.qty} <span className="text-slate-400 text-sm font-normal">{selected.item?.unit}</span></p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Unit Price</p>
                  <p className="font-bold text-slate-800 text-lg">{IDR(selected.unitPrice)}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 col-span-2">
                  <p className="text-indigo-400 text-xs mb-1">Total Amount</p>
                  <p className="font-bold text-indigo-700 text-2xl">{IDR(selected.totalPrice)}</p>
                </div>
              </div>

              {selected.note && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-slate-400 text-xs mb-1">Note</p>
                  <p className="text-slate-700 text-sm">{selected.note}</p>
                </div>
              )}

              <div className="text-xs text-slate-400 space-y-1 mb-6">
                <p>Requested: {new Date(selected.created_at).toLocaleString("id-ID")}</p>
                {selected.approved_at && (
                  <p>Reviewed: {new Date(selected.approved_at).toLocaleString("id-ID")}</p>
                )}
              </div>

              {/* Action buttons inside detail modal */}
              {selected.finance_status === "pending" && (
                <div className="flex gap-3">
                  <button
                    id={`btn-detail-approve-${selected._id}`}
                    onClick={() => { detailRef.current?.close(); openConfirm(selected._id, "approved") }}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl py-3 transition-colors shadow-lg shadow-emerald-100"
                  >
                    ✓ Approve
                  </button>
                  <button
                    id={`btn-detail-reject-${selected._id}`}
                    onClick={() => { detailRef.current?.close(); openConfirm(selected._id, "rejected") }}
                    className="flex-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-semibold rounded-xl py-3 transition-colors"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* ── Confirm Action Modal ───────────────────────────────────────────── */}
      <dialog ref={confirmRef} id="modal-confirm-action" className="modal">
        <div className="modal-box rounded-2xl max-w-sm p-8 shadow-2xl text-center">
          {confirmAction?.action === "approved" ? (
            <>
              <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Approval</h3>
              <p className="text-slate-500 text-sm mb-6">
                This will mark the log as <strong className="text-emerald-600">Approved</strong>. The warehouse team will then be able to receive goods and update stock.
              </p>
            </>
          ) : (
            <>
              <div className="bg-red-100 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✕</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Rejection</h3>
              <p className="text-slate-500 text-sm mb-6">
                This will mark the log as <strong className="text-red-500">Rejected</strong>. No stock update will occur.
              </p>
            </>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { confirmRef.current?.close(); setConfirmAction(null) }}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-finance-action"
              onClick={submitAction}
              disabled={actionLoading !== null}
              className={`flex-1 font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-60 text-white shadow-lg ${confirmAction?.action === "approved"
                ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100"
                : "bg-red-500 hover:bg-red-600 shadow-red-100"
                }`}
            >
              {actionLoading !== null
                ? <span className="loading loading-spinner loading-xs" />
                : confirmAction?.action === "approved" ? "Yes, Approve" : "Yes, Reject"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  )
}
