"use client"
import React, { useState, useEffect } from 'react'
import useFetch from '@/hooks/useFetch'


import useAuth from '@/store/auth'

export default function JournalPage() {
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  
  const [openModal, setOpenModal] = useState(false)
  
  const [date, setDate] = useState("")
  const [description, setDescription] = useState("")
  const [lines, setLines] = useState([{ accountId: "", debit: 0, credit: 0, description: "" }])
  
  const getJournalFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => alert(m)
  })

  const getCoaFn = useFetch<any[], any>({
    url: '',
    method: 'GET',
    onError: (m) => alert(m)
  })

  const addJournalFn = useFetch<any, any>({
    url: '/api/web/finance/accounting/journal',
    method: 'POST',
    onError: (m) => alert(m)
  })

  useEffect(() => {
    if (masterAccountId && hasHydrated) {
      getJournalFn.fn(`/api/web/finance/accounting/journal?id=${masterAccountId}`, null, (res: any) => {})
      getCoaFn.fn(`/api/web/finance/accounting/coa?id=${masterAccountId}`, null, (res: any) => {})
    }
  }, [masterAccountId, hasHydrated])

  const addLine = () => {
    setLines([...lines, { accountId: "", debit: 0, credit: 0, description: "" }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      const newLines = [...lines]
      newLines.splice(index, 1)
      setLines(newLines)
    }
  }

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    
    // Auto zero-out the other side if one is filled (convenience)
    if (field === 'debit' && value > 0) newLines[index].credit = 0
    if (field === 'credit' && value > 0) newLines[index].debit = 0
    
    setLines(newLines)
  }

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  function submitJournal(e: React.FormEvent) {
    e.preventDefault()
    
    if (!isBalanced) {
      alert("Journal entry must be balanced (Total Debit = Total Credit)")
      return
    }

    if (lines.some(l => !l.accountId)) {
      alert("Please select an account for all lines")
      return
    }

    const payload = JSON.stringify({
      id: masterAccountId,
      userId: userId,
      date: date,
      description: description,
      lines: JSON.stringify(lines)
    })
    
    addJournalFn.fn('', payload, (res: any) => {
      setOpenModal(false)
      getJournalFn.reset(res)
      // Reset form
      setDate("")
      setDescription("")
      setLines([{ accountId: "", debit: 0, credit: 0, description: "" }])
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-32 h-32 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">General Journal</h1>
            <p className="text-emerald-100 mt-1 font-medium">Rekapitulasi Jurnal Akuntansi Umum</p>
          </div>
          <button 
            onClick={() => setOpenModal(true)}
            className="flex items-center gap-2 bg-white text-teal-900 px-5 py-2.5 rounded-full font-bold shadow-[0_8px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Journal Entry
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
        {getJournalFn.loading ? (
          <div className="flex justify-center items-center py-20">
            <span className="loading loading-spinner loading-lg text-teal-600"></span>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Date</th>
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Journal No</th>
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Description</th>
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Total Amount</th>
                    <th className="py-4 px-6 font-bold text-gray-600 text-sm uppercase tracking-wider">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {getJournalFn.result?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-500 font-medium">
                        Belum ada entri Jurnal Akuntansi.
                      </td>
                    </tr>
                  ) : (
                    getJournalFn.result?.map((journal, idx) => {
                      const totalAmount = journal.lines?.reduce((sum: number, l: any) => sum + (l.debit || 0), 0) || 0
                      
                      return (
                        <tr key={idx} className="hover:bg-teal-50/30 transition-colors group">
                          <td className="py-4 px-6">
                            <span className="text-gray-700 font-medium">{new Date(journal.date).toLocaleDateString('id-ID')}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-teal-700">{journal.journalNumber}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-gray-800 font-medium line-clamp-1">{journal.description}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-gray-900">Rp {totalAmount.toLocaleString('id-ID')}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 border shadow-sm">
                              {journal.createdBy?.name || 'System'}
                            </span>
                          </td>
                        </tr>
                      )
                    })
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 flex-shrink-0">
              <h3 className="text-xl font-bold text-white">Create Journal Entry</h3>
              <p className="text-teal-100 text-sm mt-1">Buat catatan jurnal manual</p>
            </div>
            
            <form onSubmit={submitJournal} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">Date</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700">Description</label>
                    <input 
                      type="text" 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g., Penyesuaian persediaan akhir bulan"
                      className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between items-end mb-3">
                    <h4 className="font-bold text-gray-800">Journal Lines</h4>
                    <button 
                      type="button" 
                      onClick={addLine}
                      className="flex items-center gap-1 text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors border border-teal-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Add Line
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase">Account</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase">Description</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase w-32">Debit</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-600 uppercase w-32">Credit</th>
                          <th className="py-3 px-4 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map((line, idx) => (
                          <tr key={idx} className="group hover:bg-gray-50 transition-colors">
                            <td className="p-2">
                              <select 
                                value={line.accountId}
                                onChange={e => updateLine(idx, 'accountId', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                                required
                              >
                                <option value="">Select Account...</option>
                                {getCoaFn.result?.map((coa) => (
                                  <option key={coa._id} value={coa._id}>
                                    {coa.accountCode} - {coa.accountName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input 
                                type="text"
                                value={line.description}
                                onChange={e => updateLine(idx, 'description', e.target.value)}
                                placeholder="Line description"
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="number"
                                min="0"
                                value={line.debit || ''}
                                onChange={e => updateLine(idx, 'debit', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-right font-medium"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="number"
                                min="0"
                                value={line.credit || ''}
                                onChange={e => updateLine(idx, 'credit', Number(e.target.value))}
                                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-right font-medium"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button 
                                type="button"
                                onClick={() => removeLine(idx)}
                                disabled={lines.length === 1}
                                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-red-50"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 text-right font-bold text-gray-700">Totals:</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {totalDebit.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {totalCredit.toLocaleString('id-ID')}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  
                  {!isBalanced && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex justify-between items-center">
                      <span>Out of Balance!</span>
                      <span>Difference: {Math.abs(totalDebit - totalCredit).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {isBalanced && totalDebit > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold flex justify-between items-center">
                      <span>Balanced</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                </div>

              </div>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-row justify-end gap-3 flex-shrink-0 rounded-b-3xl">
                <button 
                  type="button" 
                  onClick={() => setOpenModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addJournalFn.loading || !isBalanced || totalDebit === 0}
                  className="px-6 py-3 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-[0_4px_10px_rgba(13,148,136,0.3)] hover:shadow-[0_6px_15px_rgba(13,148,136,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addJournalFn.loading ? 'Saving...' : 'Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
