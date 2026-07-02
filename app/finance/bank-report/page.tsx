/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BankReport() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const logsRef = useRef<HTMLDialogElement>(null)

  const [reports, setReports] = useState<any[]>([])
  const [selectedBank, setSelectedBank] = useState<any>(null)
  
  // Date filtering state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const router = useRouter()

  const getFn = useFetch<any[], any>({
    url: `/api/web/finance/reports/bank?id=xxx`,
    method: "GET",
    onError: (m) => alert(m),
  })

  useEffect(() => {
    if (hasHydrated) {
      getFn.fn(`/api/web/finance/reports/bank?id=${masterAccountId}`, "{}", (result: any) => {
        setReports(result)
      })
    }
  }, [masterAccountId, hasHydrated, getFn])

  function fetchData() {
    getFn.fn(`/api/web/finance/reports/bank?id=${masterAccountId}`, "{}", (result: any) => {
      setReports(result)
    })
  }

  function openLogs(bank: any) {
    setSelectedBank(bank)
    logsRef.current?.showModal()
  }

  // Filter functionality for logs
  function getFilteredLogs(logs: any[]) {
    if (!logs) return [];
    let filtered = logs;
    if (startDate) {
        filtered = filtered.filter(l => new Date(l.date) >= new Date(startDate));
    }
    if (endDate) {
        // Add 1 day to end date to include the whole day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        filtered = filtered.filter(l => new Date(l.date) < end);
    }
    return filtered;
  }

  function getFilteredTotals(logs: any[]) {
      const filtered = getFilteredLogs(logs)
      let totalIn = 0;
      let totalOut = 0;
      filtered.forEach(log => {
          if (log.type === 'in') totalIn += log.amount;
          if (log.type === 'out') totalOut += log.amount;
      });
      return { totalIn, totalOut, balance: totalIn - totalOut };
  }

  if (!hasHydrated) return null
  if (!loggedIn) router.push("/login")
  if (!isSuperAdmin) router.push("/dashboard")

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        {/* Header */}
        <div className="flex flex-col">
          <span className="text-2xl font-bold">Bank Report</span>
          <span className="text-sm text-gray-500">Monitor cash flow for your registered bank accounts</span>
        </div>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-4">
          {/* Toolbar */}
          <div className="flex flex-row items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-sm font-semibold">Filter Date:</span>
            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Start Date</label>
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="input input-sm border-gray-300"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">End Date</label>
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="input input-sm border-gray-300"
                />
            </div>
            <button 
                className="btn btn-sm btn-outline mt-5" 
                onClick={() => { setStartDate(""); setEndDate(""); }}
            >
                Clear
            </button>
            <button className="btn btn-sm btn-primary mt-5 ml-auto" onClick={fetchData}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Table */}
          {getFn.loading ? (
            <div className="flex-1 flex justify-center items-center">
              <span className="loading loading-spinner loading-xl" />
            </div>
          ) : getFn.error || getFn.noResult ? (
            <div className="text-red-600 p-4">{getFn.message}</div>
          ) : reports.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-400 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="size-16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-sm">No bank reports available.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-xs uppercase text-gray-500 font-semibold p-4">Bank Details</th>
                    <th className="text-xs uppercase text-gray-500 font-semibold p-4 text-right">Money In (+)</th>
                    <th className="text-xs uppercase text-gray-500 font-semibold p-4 text-right">Money Out (-)</th>
                    <th className="text-xs uppercase text-gray-500 font-semibold p-4 text-right">Net Balance</th>
                    <th className="text-xs uppercase text-gray-500 font-semibold p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, index) => {
                    const totals = getFilteredTotals(r.logs)
                    
                    return (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                        <td className="p-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 text-lg">{r.bankName}</span>
                                <span className="text-sm text-gray-500">{r.accountName} <span className="font-mono text-xs opacity-75">({r.accountNumber})</span></span>
                            </div>
                        </td>
                        <td className="text-right p-4 text-green-600 font-medium">Rp {totals.totalIn.toLocaleString('id-ID')}</td>
                        <td className="text-right p-4 text-red-600 font-medium">Rp {totals.totalOut.toLocaleString('id-ID')}</td>
                        <td className="text-right p-4 font-bold text-lg text-blue-900">Rp {totals.balance.toLocaleString('id-ID')}</td>
                        <td className="p-4 flex justify-center">
                            <button
                            className="btn btn-sm btn-outline bg-white hover:bg-gray-100 hover:text-black"
                            onClick={() => openLogs(r)}
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            View Details
                            </button>
                        </td>
                        </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Logs Modal */}
      <dialog id="modal-logs" ref={logsRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-5xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold">{selectedBank?.bankName} - Transaction Details</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedBank?.accountName} ({selectedBank?.accountNumber})</p>
              {(startDate || endDate) && (
                <p className="text-xs font-semibold text-blue-800 bg-blue-50 inline-block px-2 py-1 rounded mt-2">
                    Filtered: {startDate ? new Date(startDate).toLocaleDateString() : 'Start'} - {endDate ? new Date(endDate).toLocaleDateString() : 'End'}
                </p>
              )}
            </div>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={() => logsRef.current?.close()}>✕</button>
          </div>

          <div className="overflow-x-auto max-h-[60vh] border rounded-lg">
            <table className="table table-pin-rows w-full text-sm">
                <thead className="bg-gray-50 z-10 relative">
                    <tr>
                    <th className="font-semibold text-gray-600">Date</th>
                    <th className="font-semibold text-gray-600">Type</th>
                    <th className="font-semibold text-gray-600">Reference / Source</th>
                    <th className="font-semibold text-gray-600">Detail Method</th>
                    <th className="font-semibold text-gray-600 text-right">Money In</th>
                    <th className="font-semibold text-gray-600 text-right">Money Out</th>
                    </tr>
                </thead>
                <tbody>
                    {selectedBank && getFilteredLogs(selectedBank.logs).length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-500">No transactions found for this period.</td>
                        </tr>
                    ) : selectedBank?.logs && (
                        getFilteredLogs(selectedBank.logs).map((log: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap">{new Date(log.date).toLocaleString('id-ID')}</td>
                                <td>
                                    {log.type === 'in' ? (
                                        <span className="badge badge-success badge-sm text-white font-medium">IN</span>
                                    ) : (
                                        <span className="badge badge-error badge-sm text-white font-medium">OUT</span>
                                    )}
                                </td>
                                <td>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-700">{log.reference}</span>
                                        <span className="text-xs text-gray-500">{log.source}</span>
                                    </div>
                                </td>
                                <td><span className="text-xs font-mono bg-gray-100 p-1 rounded text-gray-600">{log.method}</span></td>
                                <td className="text-right font-medium text-green-600">
                                    {log.type === 'in' ? `+ Rp ${log.amount.toLocaleString('id-ID')}` : '-'}
                                </td>
                                <td className="text-right font-medium text-red-600">
                                    {log.type === 'out' ? `- Rp ${log.amount.toLocaleString('id-ID')}` : '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </>
  )
}
