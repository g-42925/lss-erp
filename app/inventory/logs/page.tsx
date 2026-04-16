"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import Sidebar from "@/components/sidebar"
import { useForm } from "react-hook-form"
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

type CreateLogForm = {
  itemId: string
  qty: number
  unitPrice: number
  note: string
}

const IDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

export default function InvLogsPage() {
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()

  const createRef = useRef<HTMLDialogElement>(null)
  const [logs, setLogs] = useState<InvLog[]>([])
  const [items, setItems] = useState<InvItem[]>([])
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null) // tracks which log _id is in flight

  const createForm = useForm<CreateLogForm>()

  // ── Fetch hooks ───────────────────────────────────────────────────────────
  const getLogsFn = useFetch<InvLog[], any>({
    url: `/api/web/inv-logs?id=${masterAccountId}`,
    method: "GET",
    onError: (m) => alert(m),
  })

  const getItemsFn = useFetch<InvItem[], any>({
    url: `/api/web/inv-items?id=${masterAccountId}`,
    method: "GET",
    onError: (m) => alert(m),
  })

  const postFn = useFetch<InvLog, any>({
    url: `/api/web/inv-logs`,
    method: "POST",
    onError: (m) => alert(m),
  })

  const approveFn = useFetch<InvLog, any>({
    url: `/api/web/inv-logs/approve`,
    method: "PUT",
    onError: (m) => alert(m),
  })

  const receiveFn = useFetch<InvLog, any>({
    url: `/api/web/inv-logs/receive`,
    method: "PUT",
    onError: (m) => alert(m),
  })

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydrated || !masterAccountId) return
    getLogsFn.fn(`/api/web/inv-logs?id=${masterAccountId}`, {}, (r) => setLogs(r))
    getItemsFn.fn(`/api/web/inv-items?id=${masterAccountId}`, {}, (r) => setItems(r))
  }, [masterAccountId, hasHydrated])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ── Derived state ─────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? logs.filter((l) =>
      l.logNumber?.toLowerCase().includes(search.toLowerCase()) ||
      l.item?.name?.toLowerCase().includes(search.toLowerCase())
    )
    : logs

  const pendingCount = logs.filter((l) => l.finance_status === "pending").length
  const totalValue = logs.reduce((acc, l) => acc + (l.finance_status !== "rejected" ? l.totalPrice : 0), 0)
  const receivedCount = logs.filter((l) => l.received_status).length

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleCreate(data: CreateLogForm) {
    await postFn.fn(
      "",
      JSON.stringify({ id: masterAccountId, ...data }) as any,
      (result) => {
        setLogs((prev) => [result, ...prev])
        createForm.reset()
        createRef.current?.close()
      }
    )
  }

  async function handleFinanceAction(logId: string, action: "approved" | "rejected") {
    setActionLoading(logId + action)
    await approveFn.fn(
      "",
      JSON.stringify({ _id: logId, action }) as any,
      (updated) => {
        setLogs((prev) =>
          prev.map((l) => (l._id === logId ? { ...l, finance_status: updated.finance_status, approved_at: updated.approved_at } : l))
        )
      }
    )
    setActionLoading(null)
  }

  async function handleReceive(logId: string) {
    setActionLoading(logId + "receive")
    await receiveFn.fn(
      "",
      JSON.stringify({ _id: logId }) as any,
      (updated) => {
        setLogs((prev) =>
          prev.map((l) =>
            l._id === logId ? { ...l, received_status: true, received_at: updated.received_at } : l
          )
        )
      }
    )
    setActionLoading(null)
  }

  // ── Badge helpers ─────────────────────────────────────────────────────────
  const statusBadge = (status: InvLog["finance_status"]) => {
    if (status === "pending")
      return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">⏳ Pending</span>
    if (status === "approved")
      return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">✅ Approved</span>
    return <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200">❌ Rejected</span>
  }

  const receivedBadge = (log: InvLog) => {
    if (log.received_status)
      return <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">📦 Received</span>
    if (log.finance_status === "approved")
      return <span className="text-slate-400 text-xs">Awaiting receipt</span>
    return <span className="text-slate-300 text-xs">—</span>
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Procurement Logs</h1>
            <p className="text-slate-500 text-sm mt-1">Track stock procurement → finance approval → goods receiving</p>
          </div>
          <button
            id="btn-create-log"
            onClick={() => createRef.current?.showModal()}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Log
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Total Logs</p>
            <p className="text-3xl font-bold text-slate-800">{logs.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Pending Approval</p>
            <p className="text-3xl font-bold text-amber-500">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Goods Received</p>
            <p className="text-3xl font-bold text-emerald-600">{receivedCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Total Value</p>
            <p className="text-xl font-bold text-slate-800">{IDR(totalValue)}</p>
          </div>
        </div>

        {/* Flow guide */}
        <div className="bg-white rounded-2xl px-6 py-4 mb-6 border border-slate-100 shadow-sm flex items-center gap-3 flex-wrap text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Workflow:</span>
          <span className="bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-full font-medium">1. Create Log (Pending)</span>
          <span className="text-slate-300">→</span>
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-medium">2. Finance Approves</span>
          <span className="text-slate-300">→</span>
          <span className="bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full font-medium">3. Receive Goods (Stock Updated)</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <span className="text-slate-600 font-medium text-sm">{filtered.length} log{filtered.length !== 1 ? "s" : ""}</span>
            <input
              type="search"
              placeholder="Search log number or item…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-black border border-slate-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {getLogsFn.loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="loading loading-spinner loading-lg text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Log #</th>
                    <th className="px-6 py-3 text-left">Item</th>
                    <th className="px-6 py-3 text-center">Qty</th>
                    <th className="px-6 py-3 text-right">Unit Price</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-center">Finance</th>
                    <th className="px-6 py-3 text-center">Receipt</th>
                    <th className="px-6 py-3 text-left">Note</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-10 mx-auto mb-3 text-slate-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        No procurement logs yet. Create one using the button above.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-400 text-xs whitespace-nowrap">{log.logNumber}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{log.item?.name ?? "—"}</div>
                          <div className="text-slate-400 text-xs mt-0.5">{log.item?.unit} · {log.item?.category || "Uncategorized"}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {log.qty} <span className="font-normal text-slate-400 text-xs">{log.item?.unit}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">{IDR(log.unitPrice)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">{IDR(log.totalPrice)}</td>
                        <td className="px-6 py-4 text-center">{statusBadge(log.finance_status)}</td>
                        <td className="px-6 py-4 text-center">{receivedBadge(log)}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs max-w-[140px] truncate">{log.note || "—"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-center">
                            {/* Finance approve / reject — only if pending */}
                            {log.finance_status === "pending" && (
                              <>
                                <button
                                  id={`btn-approve-${log._id}`}
                                  onClick={() => handleFinanceAction(log._id, "approved")}
                                  disabled={actionLoading !== null}
                                  title="Approve"
                                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  {actionLoading === log._id + "approved" ? <span className="loading loading-spinner loading-xs" /> : "Approve"}
                                </button>
                                <button
                                  id={`btn-reject-${log._id}`}
                                  onClick={() => handleFinanceAction(log._id, "rejected")}
                                  disabled={actionLoading !== null}
                                  title="Reject"
                                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  {actionLoading === log._id + "rejected" ? <span className="loading loading-spinner loading-xs" /> : "Reject"}
                                </button>
                              </>
                            )}

                            {/* Receive goods — only if approved and not yet received */}
                            {log.finance_status === "approved" && !log.received_status && (
                              <button
                                id={`btn-receive-${log._id}`}
                                onClick={() => handleReceive(log._id)}
                                disabled={actionLoading !== null}
                                title="Receive Goods"
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                              >
                                {actionLoading === log._id + "receive"
                                  ? <span className="loading loading-spinner loading-xs" />
                                  : <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
                                    </svg>
                                    Receive
                                  </>
                                }
                              </button>
                            )}

                            {/* Completed state */}
                            {log.received_status && (
                              <span className="text-slate-300 text-xs">Done</span>
                            )}
                            {log.finance_status === "rejected" && (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
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

      {/* ── Create Log Modal ───────────────────────────────────────────────── */}
      <dialog ref={createRef} id="modal-create-log" className="modal">
        <div className="modal-box rounded-2xl max-w-md p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">New Procurement Log</h2>
              <p className="text-slate-400 text-xs">Created as <strong>Pending</strong> — finance approval required.</p>
            </div>
          </div>

          <form onSubmit={createForm.handleSubmit(handleCreate)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Item <span className="text-red-500">*</span></label>
              <select
                id="select-log-item"
                {...createForm.register("itemId", { required: true })}
                className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="">— Select item —</option>
                {items.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
              </select>
              {createForm.formState.errors.itemId && <p className="text-red-500 text-xs mt-1">Item is required.</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Qty <span className="text-red-500">*</span></label>
                <input
                  id="input-log-qty"
                  type="number"
                  min="1"
                  {...createForm.register("qty", { required: true, min: 1, valueAsNumber: true })}
                  className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="0"
                />
                {createForm.formState.errors.qty && <p className="text-red-500 text-xs mt-1">Min 1</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Unit Price <span className="text-red-500">*</span></label>
                <input
                  id="input-log-unit-price"
                  type="number"
                  min="0"
                  {...createForm.register("unitPrice", { required: true, min: 0, valueAsNumber: true })}
                  className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="0"
                />
                {createForm.formState.errors.unitPrice && <p className="text-red-500 text-xs mt-1">Required</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Note <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                id="input-log-note"
                {...createForm.register("note")}
                rows={2}
                className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                placeholder="Purpose, supplier name, etc."
              />
            </div>

            {postFn.error && (
              <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">{postFn.message}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { createRef.current?.close(); createForm.reset() }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                id="btn-submit-log"
                type="submit"
                disabled={postFn.loading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-blue-200"
              >
                {postFn.loading ? <span className="loading loading-spinner loading-xs" /> : "Create Log"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  )
}
