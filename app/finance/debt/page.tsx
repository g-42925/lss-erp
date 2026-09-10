/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { NumericFormat } from "react-number-format";



type FilterType = 'barang' | 'jasa' | 'vendor'

export default function Debt() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const payRef = useRef<HTMLDialogElement>(null)
  const logsRef = useRef<HTMLDialogElement>(null)
  const editLogRef = useRef<HTMLDialogElement>(null)

  const [filterType, setFilterType] = useState<FilterType>('barang')
  const [debts, setDebts] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [editApprovalCode, setEditApprovalCode] = useState("")
  const [editAmount, setEditAmount] = useState<number>(0)
  const [editDate, setEditDate] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [payFormData, setPayFormData] = useState({
    payAmount: 0,
    paymentMethod: 'Cash',
    payDate: new Date().toISOString().split('T')[0]
  })

  const router = useRouter()

  const bankAccountFn = useFetch<any[], any>({
    url: `/api/web/bank-accounts?id=${masterAccountId}`,
    method: 'GET'
  })

  const putFn = useFetch<any, any>({
    url: '/api/web/purchases',
    method: 'PUT'
  })

  const getFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const getLogsFn = useFetch<any[], any>({
    url: `/api/web/log/purchase`,
    method: 'GET'
  })

  function fetchDebts(type: FilterType) {
    const url = `/api/web/debt?id=${masterAccountId}&filterType=${type}`
    getFn.fn(url, "{}", (result) => {
      setDebts(result ?? [])
    })
  }

  function handleFilterChange(type: FilterType) {
    setFilterType(type)
    setDebts([])
    fetchDebts(type)
  }

  // ─── Open Pay Modal ──────────────────────────────────────────────────────────
  function openPay(debt: any) {
    setSelectedDebt(debt)
    setPayFormData({
      payAmount: 0,
      paymentMethod: 'Cash',
      payDate: new Date().toISOString().split('T')[0]
    })
    payRef.current?.showModal()
  }

  // ─── Pay: barang or jasa (via Purchase) ─────────────────────────────────────
  async function payPurchase() {
    if (!selectedDebt) return
    const { payAmount, paymentMethod, payDate } = payFormData
    const newPayAmt = Number(payAmount)
    if (newPayAmt <= 0) return alert("Amount harus lebih dari 0")

    const remaining = selectedDebt.finalPrice - selectedDebt.payAmount
    if (newPayAmt > remaining) return alert("Jumlah bayar melebihi sisa hutang")

    const payload = JSON.stringify({
      _id: selectedDebt._id,
      type: "payment",
      newPayAmt,
      payAmount: selectedDebt.payAmount + newPayAmt,
      status: '___approved',
      reference: null,
      purchaseType: selectedDebt.purchaseType,
      paymentMethod,
      date: payDate ? new Date(payDate).toISOString() : new Date().toISOString(),
      userId,
      to: selectedDebt.supplier?.bussinessName || selectedDebt.vendor?.name || ''
    })

    setPaySubmitting(true)
    await putFn.fn('', payload, (result) => {
      setDebts(prev => {
        const updated = [...prev]
        const idx = updated.findIndex(d => d._id === selectedDebt._id)
        if (idx >= 0) updated[idx].payAmount = selectedDebt.payAmount + newPayAmt
        return updated.filter(d => d.finalPrice > d.payAmount)
      })
      payRef.current?.close()
    })
    setPaySubmitting(false)
  }

  // ─── Pay: vendor (via Invoice) ────────────────────────────────────────────────
  async function payVendorDebt() {
    if (!selectedDebt) return
    const { payAmount, paymentMethod, payDate } = payFormData
    const newPayAmt = Number(payAmount)
    if (newPayAmt <= 0) return alert("Amount harus lebih dari 0")

    const remaining = selectedDebt.totalVendorAmount - (selectedDebt.vendorPaid ?? 0)
    if (newPayAmt > remaining) return alert("Jumlah bayar melebihi sisa hutang vendor")

    setPaySubmitting(true)
    try {
      const res = await fetch('/api/web/debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedDebt._id,
          payAmount: newPayAmt,
          paymentMethod,
          payDate,
          userId
        })
      })
      const json = await res.json()
      if (json.error) return alert(json.message)

      setDebts(prev => {
        const updated = [...prev]
        const idx = updated.findIndex(d => d._id === selectedDebt._id)
        if (idx >= 0) {
          updated[idx].vendorPaid = (updated[idx].vendorPaid ?? 0) + newPayAmt
          updated[idx].remaining = updated[idx].totalVendorAmount - updated[idx].vendorPaid
        }
        return updated.filter(d => d.totalVendorAmount > (d.vendorPaid ?? 0))
      })
      payRef.current?.close()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPaySubmitting(false)
    }
  }

  async function handlePay() {
    if (filterType === 'vendor') {
      await payVendorDebt()
    } else {
      await payPurchase()
    }
  }

  async function viewLogs(debt: any) {
    setLogs([])
    logsRef.current?.showModal()
    setLogsLoading(true)
    getLogsFn.fn(`/api/web/log/purchase?purchaseId=${debt._id}`, "{}", (res) => {
      setLogs(res)
      setLogsLoading(false)
    })
  }

  function openEditLog(log: any) {
    setEditingLog(log)
    setEditAmount(Math.abs(log.amount))
    setEditDate(log.date ? new Date(log.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    setEditPaymentMethod(log.paymentMethod || "Cash")
    setEditApprovalCode("")
    editLogRef.current?.showModal()
  }

  async function submitEditLog() {
    if (!editingLog) return
    if (!editApprovalCode) return alert("Kode approval wajib diisi")
    if (editAmount <= 0) return alert("Amount harus lebih dari 0")
    setEditSubmitting(true)
    try {
      const res = await fetch('/api/web/log/purchase', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: editingLog._id,
          approvalCode: editApprovalCode,
          userId,
          newAmount: editAmount,
          newDate: editDate,
          newPaymentMethod: editPaymentMethod,
        }),
      })
      const response = await res.json()
      if (response.error) {
        alert('something went wrong')
      } else {
        editLogRef.current?.close()
        fetchDebts(filterType)
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  useEffect(() => {
    if (hasHydrated) {
      const bankUrl = `/api/web/bank-accounts?id=${masterAccountId}`
      bankAccountFn.fn(bankUrl, "{}", () => { })
      fetchDebts('barang')
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  const remaining = (debt: any) => {
    if (filterType === 'vendor') return (debt.totalVendorAmount ?? 0) - (debt.vendorPaid ?? 0)
    return (debt.finalPrice ?? 0) - (debt.payAmount ?? 0)
  }

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'barang', label: '📦 Hutang Barang' },
    { key: 'jasa', label: '🔧 Hutang Jasa' },
    { key: 'vendor', label: '🤝 Hutang Vendor' },
  ]

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Debts</span>
        <div className="relative bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">

          {/* Filter Tabs */}
          <div className="flex flex-row gap-2 flex-wrap">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${filterType === tab.key
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm text-gray-500">
            {filterType === 'barang' && 'Hutang yang timbul dari purchase produk/barang yang belum lunas.'}
            {filterType === 'jasa' && 'Hutang yang timbul dari purchase jasa (renovasi, kelistrikan, dll) yang belum lunas.'}
            {filterType === 'vendor' && 'Hutang kepada vendor berdasarkan setiap invoice dari service order yang ditangani vendor eksternal.'}
          </p>

          {/* Table */}
          {
            getFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getFn.error
                ?
                <div>
                  <p>{getFn.message}</p>
                </div>
                :
                debts.length === 0
                  ?
                  <div className="flex-1 flex flex-col justify-center items-center text-gray-400 gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="text-sm">Tidak ada hutang</span>
                  </div>
                  :
                  <div className="overflow-x-auto w-full">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          {filterType === 'barang' && <th>Produk</th>}
                          {filterType === 'jasa' && <th>Deskripsi</th>}
                          {filterType === 'vendor' && <th>No. Invoice</th>}
                          {filterType === 'vendor' && <th>Sales Order</th>}
                          <th>
                            {filterType === 'barang' ? 'Supplier/Vendor' : 'Vendor'}
                          </th>
                          <th>Total</th>
                          <th>Sudah Dibayar</th>
                          <th>Sisa</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debts.map((d, index) => (
                          <tr key={index}>
                            <td>{new Date(d.date).toLocaleDateString('id-ID')}</td>
                            {filterType === 'barang' && <td>{d.product?.productName ?? '-'}</td>}
                            {filterType === 'jasa' && <td>{d.description ?? '-'}</td>}
                            {filterType === 'vendor' && <td>{d.invoiceNumber}</td>}
                            {filterType === 'vendor' && <td>{d.salesOrderNumber ?? '-'}</td>}
                            <td>
                              {filterType === 'vendor'
                                ? d.vendor?.name ?? '-'
                                : d.supplier?.bussinessName ?? d.vendor?.name ?? '-'}
                            </td>
                            <td>
                              {(filterType === 'vendor'
                                ? d.serviceOrder.vendorPrice
                                : d.finalPrice)?.toLocaleString('id-ID')}
                            </td>
                            <td>
                              {(filterType === 'vendor'
                                ? (d.vendorPaid ?? 0)
                                : d.payAmount)?.toLocaleString('id-ID')}
                            </td>
                            <td className="font-semibold text-red-700">
                              {remaining(d)?.toLocaleString('id-ID')}
                            </td>
                            <td className="flex flex-row gap-2">
                              <button className="btn btn-sm btn-primary" onClick={() => openPay(d)}>
                                Bayar
                              </button>
                              {filterType !== 'vendor' && (
                                <button className="btn btn-sm btn-secondary" onClick={() => viewLogs(d)}>
                                  Logs
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
          }
        </div>

        {/* ─── Pay Modal ─── */}
        <dialog id="pay_modal" ref={payRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {filterType === 'vendor' ? 'Bayar Hutang Vendor' : 'Tambah Pembayaran'}
            </h3>
            <div className="flex flex-col gap-3">
              {selectedDebt && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                  {filterType === 'barang' && <div><b>Produk:</b> {selectedDebt.product?.productName}</div>}
                  {filterType === 'jasa' && <div><b>Deskripsi:</b> {selectedDebt.description}</div>}
                  {filterType === 'vendor' && <div><b>Invoice:</b> {selectedDebt.invoiceNumber}</div>}
                  <div><b>Vendor/Supplier:</b> {filterType === 'vendor' ? (selectedDebt.vendor?.name ?? '-') : (selectedDebt.supplier?.bussinessName ?? selectedDebt.vendor?.name ?? '-')}</div>
                  <div><b>Sisa Hutang:</b> <span className="text-red-700 font-semibold">{remaining(selectedDebt)?.toLocaleString('id-ID')}</span></div>
                </div>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Pembayaran</legend>
                <input
                  className="input w-full"
                  type="date"
                  value={payFormData.payDate}
                  onChange={e => setPayFormData(p => ({ ...p, payDate: e.target.value }))}
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Jumlah Bayar</legend>
                <input
                  className="input w-full"
                  type="number"
                  min="1"
                  value={payFormData.payAmount || ''}
                  onChange={e => setPayFormData(p => ({ ...p, payAmount: Number(e.target.value) }))}
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Metode Pembayaran</legend>
                <select
                  className="select w-full"
                  value={payFormData.paymentMethod}
                  onChange={e => setPayFormData(p => ({ ...p, paymentMethod: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  {bankAccountFn.result?.map((bank: any) => (
                    <option key={bank._id} value={`transfer from ${bank.bank}`}>
                      transfer from {bank.bank} ({bank.accountName})
                    </option>
                  ))}
                </select>
              </fieldset>

              <div className="modal-action">
                <button type="button" className="btn" onClick={() => payRef.current?.close()}>Batal</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={paySubmitting}
                  onClick={handlePay}
                >
                  {paySubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Simpan Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </dialog>

        {/* ─── Logs Modal ─── */}
        <dialog id="logs_modal" ref={logsRef} className="modal text-black">
          <div className="modal-box max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Payment Logs</h3>
              <button className="btn btn-sm btn-circle" onClick={() => logsRef.current?.close()}>✕</button>
            </div>
            {logsLoading ? (
              <div className="flex flex-col justify-center items-center p-6"><span className="loading loading-spinner"></span></div>
            ) : logs.length === 0 ? (
              <p>Belum ada log pembayaran.</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>No.</th>
                      <th>Amount</th>
                      <th>Metode</th>
                      <th>Diinput Oleh</th>
                      <th>Diedit Pada</th>
                      <th>Diedit Oleh</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((L, i) => (
                      <tr key={i}>
                        <td>{new Date(L.date).toLocaleDateString('id-ID')}</td>
                        <td>{L.paymentNumber}</td>
                        <td>{Math.abs(L.amount).toLocaleString('id-ID')}</td>
                        <td>{L.paymentMethod || '-'}</td>
                        <td>{L.createdBy?.name || '-'}</td>
                        <td>{L.editedAt ? new Date(L.editedAt).toLocaleString('id-ID') : '-'}</td>
                        <td>{L.editedBy?.name || '-'}</td>
                        <td>
                          <button className="btn btn-xs btn-warning" onClick={() => openEditLog(L)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </dialog>

        {/* ─── Edit Log Modal ─── */}
        <dialog id="edit_log_modal" ref={editLogRef} className="modal text-black">
          <div className="modal-box w-11/12 max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Edit Payment Log</h3>
              <button className="btn btn-sm btn-circle" onClick={() => editLogRef.current?.close()}>✕</button>
            </div>
            {editingLog && (
              <div className="flex flex-col gap-3">
                <div className="bg-yellow-50 border border-yellow-300 rounded-md p-3 text-sm text-yellow-800">
                  ⚠️ Perubahan ini memerlukan kode approval dari supervisor.
                </div>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">No. Pembayaran</legend>
                  <input className="input w-full bg-gray-100" value={editingLog.paymentNumber} type="text" readOnly />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Tanggal Pembayaran</legend>
                  <input
                    className="input w-full"
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Amount</legend>
                  <input
                    className="input w-full"
                    type="number"
                    value={editAmount}
                    onChange={e => setEditAmount(Number(e.target.value))}
                    required
                  />
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Metode Pembayaran</legend>
                  <select
                    className="select w-full"
                    value={editPaymentMethod}
                    onChange={e => setEditPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    {bankAccountFn.result?.map((bank: any) => (
                      <option key={bank._id} value={`transfer from ${bank.bank}`}>
                        transfer from {bank.bank} ({bank.accountName})
                      </option>
                    ))}
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Kode Approval Supervisor</legend>
                  <input
                    className="input w-full"
                    type="password"
                    placeholder="Masukkan kode approval"
                    value={editApprovalCode}
                    onChange={e => setEditApprovalCode(e.target.value)}
                    required
                  />
                </fieldset>

                <div className="modal-action">
                  <button type="button" className="btn" onClick={() => editLogRef.current?.close()}>Batal</button>
                  <button type="button" className="btn btn-warning" disabled={editSubmitting} onClick={submitEditLog}>
                    {editSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Simpan Perubahan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </dialog>

      </div>
    </>
  )
}