"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import Sidebar from "@/components/sidebar"

export default function AssetsReport() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("cash")

  const getAssetsFn = useFetch<any, any>({
    url: `/api/web/finance/reports/coa/assets?id=${masterAccountId}`,
    method: "GET",
  })

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      getAssetsFn.fn(`/api/web/finance/reports/coa/assets?id=${masterAccountId}`, "{}", (result) => { })
    }
  }, [hasHydrated, masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push("/login")
  if (!isSuperAdmin) router.push("/dashboard")

  const data = getAssetsFn.result

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const sections = [
    { id: "cash", name: "Cash", icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
    { id: "bank", name: "Bank", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" },
    { id: "inventory", name: "Inventory", icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" },
    { id: "receivable", name: "Receivables", icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-8 flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Assets Report</h1>
            <p className="text-slate-500 mt-1 text-lg">Detailed valuation and logs for all company assets.</p>
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 font-semibold ${activeTab === s.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
                {s.name}
              </button>
            ))}
          </div>
        </header>

        {getAssetsFn.loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-24">
            <span className="loading loading-spinner loading-lg text-blue-600"></span>
            <p className="text-slate-400 mt-4 font-medium">Calculating assets valuation...</p>
          </div>
        ) : getAssetsFn.error ? (
          <div className="alert alert-error shadow-lg rounded-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{getAssetsFn.message}</span>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Overview Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <span className="text-slate-500 font-medium">Cash On Hand</span>
                <span className="text-3xl font-bold text-slate-800">{formatCurrency(data?.cash.total || 0)}</span>
                <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[60%] rounded-full"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <span className="text-slate-500 font-medium">Bank Balance</span>
                <span className="text-3xl font-bold text-slate-800">{formatCurrency(data?.bank.total || 0)}</span>
                <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[45%] rounded-full"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <span className="text-slate-500 font-medium">Inventory Value</span>
                <span className="text-3xl font-bold text-slate-800">{formatCurrency(data?.inventory.total || 0)}</span>
                <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-[80%] rounded-full"></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <span className="text-slate-500 font-medium">Accounts Receivable</span>
                <span className="text-3xl font-bold text-slate-800">{formatCurrency(data?.receivable.total || 0)}</span>
                <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[30%] rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Detailed Sections */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              {activeTab === "cash" && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Cash Receipt Logs</h2>
                    <div className="badge badge-lg bg-blue-100 text-blue-700 border-none font-bold py-4 px-6 rounded-xl">
                      Total: {formatCurrency(data?.cash.total || 0)}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="rounded-l-2xl text-slate-500 font-bold py-4">Date</th>
                          <th className="text-slate-500 font-bold py-4">Invoice #</th>
                          <th className="text-slate-500 font-bold py-4">Sales Order #</th>
                          <th className="rounded-r-2xl text-slate-500 font-bold py-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.cash.logs.map((log: any, i: number) => (
                          <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-4 font-medium text-slate-600">{new Date(log.date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-4"><span className="badge badge-ghost font-mono">{log.invoiceNumber}</span></td>
                            <td className="py-4 font-mono text-slate-500">{log.salesOrderNumber}</td>
                            <td className="py-4 text-right font-bold text-slate-800">{formatCurrency(log.amount)}</td>
                          </tr>
                        ))}
                        {data?.cash.logs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-center py-12 text-slate-400">No cash receipts found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "bank" && (
                <div className="p-8 space-y-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Bank Statement Summary</h2>
                    <div className="badge badge-lg bg-emerald-100 text-emerald-700 border-none font-bold py-4 px-6 rounded-xl">
                      Grand Total: {formatCurrency(data?.bank.total || 0)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8">
                    {data?.bank.accounts.map((account: any, i: number) => (
                      <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/30 p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-10.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5-13.5h16.5M6.75 6.75h.75m-.75 3h.75m3-3h.75m-.75 3h.75m3-3h.75m-.75 3h.75m3-3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18v3c0 .621-.504 1.125-1.125 1.125H4.125C3.504 7.125 3 6.621 3 6V3Z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-slate-800">{account.bankName}</h3>
                              <p className="text-slate-500 font-medium">{account.accountName} • {account.accountNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Account Balance</p>
                            <p className="text-2xl font-black text-emerald-600">{formatCurrency(account.total)}</p>
                          </div>
                        </div>

                        <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
                          <table className="table w-full">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="text-slate-500 font-bold">Date</th>
                                <th className="text-slate-500 font-bold">Ref #</th>
                                <th className="text-slate-500 font-bold text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {account.logs.map((log: any, j: number) => (
                                <tr key={j} className="hover:bg-slate-50 transition-colors">
                                  <td className="text-slate-600">{new Date(log.date).toLocaleDateString("id-ID")}</td>
                                  <td className="font-mono text-slate-500 text-xs">{log.invoiceNumber}</td>
                                  <td className="text-right font-bold text-slate-800">{formatCurrency(log.amount)}</td>
                                </tr>
                              ))}
                              {account.logs.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="text-center py-6 text-slate-400 italic">No transactions for this account.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {data?.bank.accounts.length === 0 && (
                      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                        No bank accounts registered.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "inventory" && (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800">Inventory Valuation</h2>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">The total current market or cost value of all stocked goods based on active product batches.</p>
                  </div>
                  <div className="py-8 px-12 bg-slate-900 text-white rounded-3xl shadow-2xl shadow-orange-200/40">
                    <span className="text-orange-400 font-bold uppercase tracking-widest text-sm">Consolidated Value</span>
                    <h3 className="text-6xl font-black mt-2">{formatCurrency(data?.inventory.total || 0)}</h3>
                  </div>
                  <button className="btn btn-ghost text-slate-400 font-bold" disabled>Detailed View Coming Soon</button>
                </div>
              )}

              {activeTab === "receivable" && (
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Outstanding Receivables</h2>
                    <div className="badge badge-lg bg-amber-100 text-amber-700 border-none font-bold py-4 px-6 rounded-xl">
                      Total Pending: {formatCurrency(data?.receivable.total || 0)}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="rounded-l-2xl text-slate-500 font-bold py-4">Customer</th>
                          <th className="text-slate-500 font-bold py-4">Invoice / SO</th>
                          <th className="text-slate-500 font-bold py-4 text-right">Invoice Value</th>
                          <th className="text-slate-500 font-bold py-4 text-right">Already Paid</th>
                          <th className="rounded-r-2xl text-slate-500 font-bold py-4 text-right text-amber-600">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.receivable.logs.map((log: any, i: number) => (
                          <tr key={i} className="hover:bg-amber-50/20 transition-colors">
                            <td className="py-4">
                              <div className="font-bold text-slate-800">{log.customerName}</div>
                              <div className="text-xs text-slate-400">{new Date(log.date).toLocaleDateString("id-ID")}</div>
                            </td>
                            <td className="py-4">
                              <div className="badge badge-outline border-slate-200 text-xs font-mono">{log.invoiceNumber}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-1">{log.salesOrderNumber}</div>
                            </td>
                            <td className="py-4 text-right text-slate-600">{formatCurrency(log.value)}</td>
                            <td className="py-4 text-right text-emerald-600">{formatCurrency(log.paid)}</td>
                            <td className="py-4 text-right font-black text-amber-600">{formatCurrency(log.remaining)}</td>
                          </tr>
                        ))}
                        {data?.receivable.logs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400">No outstanding receivables found. Great job!</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
