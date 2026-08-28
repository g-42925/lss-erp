"use client"
import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useFetch from '@/hooks/useFetch'


import useAuth from '@/store/auth'

export default function CoaPage() {
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [openModal, setOpenModal] = useState(false)
  
  const [accountCode, setAccountCode] = useState("")
  const [accountName, setAccountName] = useState("")
  const [category, setCategory] = useState("Asset")
  
  const getCoaFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => alert(m)
  })

  const addCoaFn = useFetch<any, any>({
    url: '/api/web/finance/accounting/coa',
    method: 'POST',
    onError: (m) => alert(m)
  })

  useEffect(() => {
    if (masterAccountId && hasHydrated) {
      getCoaFn.fn(`/api/web/finance/accounting/coa?id=${masterAccountId}`, null, (res: any) => {})
    }
  }, [masterAccountId, hasHydrated])

  function submitCoa(e: React.FormEvent) {
    e.preventDefault()
    const payload = JSON.stringify({
      id: masterAccountId,
      accountCode: accountCode,
      accountName: accountName,
      category: category
    })
    
    addCoaFn.fn('', payload, (res: any) => {
      setOpenModal(false)
      getCoaFn.reset(res)
      setAccountCode("")
      setAccountName("")
      setCategory("Asset")
    })
  }

  const categoryColors: Record<string, string> = {
    'Asset': 'bg-blue-100 text-blue-700 border-blue-200',
    'Liability': 'bg-red-100 text-red-700 border-red-200',
    'Equity': 'bg-purple-100 text-purple-700 border-purple-200',
    'Revenue': 'bg-green-100 text-green-700 border-green-200',
    'Expense': 'bg-orange-100 text-orange-700 border-orange-200',
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Chart of Accounts</h1>
            <p className="text-blue-200 mt-1 font-medium">Kelola master data akun (Buku Besar)</p>
          </div>
          <button 
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 bg-white text-indigo-900 px-5 py-2.5 rounded-full font-bold shadow-[0_8px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Account
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
        {getCoaFn.loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg text-indigo-600"></span>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Account Code</th>
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Account Name</th>
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {getCoaFn.result?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-10 text-gray-500 font-medium">
                        Belum ada data Chart of Accounts.
                      </td>
                    </tr>
                  ) : (
                    getCoaFn.result?.map((coa, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{coa.accountCode}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 font-medium">{coa.accountName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${categoryColors[coa.category] || 'bg-gray-100 text-gray-700'}`}>
                            {coa.category}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6">
              <h3 className="text-xl font-bold text-white">Create New COA</h3>
              <p className="text-indigo-100 text-sm mt-1">Tambahkan akun buku besar baru</p>
            </div>
            
            <form onSubmit={submitCoa} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Account Code</label>
                <input 
                  type="text" 
                  value={accountCode}
                  onChange={e => setAccountCode(e.target.value)}
                  placeholder="e.g., 100-01" 
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Account Name</label>
                <input 
                  type="text" 
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="e.g., Kas Kecil" 
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Category</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>

              <div className="flex flex-row justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setOpenModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addCoaFn.loading}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {addCoaFn.loading ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
