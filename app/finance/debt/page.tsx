/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function Debt() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const payRef = useRef<HTMLDialogElement>(null)
  const logsRef = useRef<HTMLDialogElement>(null)
  const editLogRef = useRef<HTMLDialogElement>(null)

  const [debts, SetDebts] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [editingLog, setEditingLog] = useState<any>(null)
  const [editApprovalCode, setEditApprovalCode] = useState("")
  const [editAmount, setEditAmount] = useState<number>(0)
  const [editDate, setEditDate] = useState("")
  const [editPaymentMethod, setEditPaymentMethod] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)

  const payForm = useForm()
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
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  })

  const getLogsFn = useFetch<any[], any>({
    url: `/api/web/log/purchase`,
    method: 'GET'
  })

  async function openPay(debt: any) {
    console.log(debt)
    const todayStr = new Date().toISOString().split('T')[0]
    payForm.reset({
      _id: debt._id,
      productName: debt.product.productName,
      currPayAmt: debt.payAmount,
      finalPrice: debt.finalPrice,
      payAmount: 0,
      paymentMethod: "Cash",
      payDate: todayStr,
      to: debt.supplier.name
    })
    payRef.current?.showModal()
  }

  async function paySubmit(data: any) {
    const newPayAmt = parseInt(data.payAmount)
    if (newPayAmt <= 0) return alert("Amount must be greater than 0")
    const payload = JSON.stringify({
      _id: data._id,
      type: "payment",
      newPayAmt: newPayAmt,
      payAmount: parseInt(data.currPayAmt) + newPayAmt,
      status: '___approved',
      reference: null,
      paymentMethod: data.paymentMethod,
      date: data.payDate ? new Date(data.payDate).toISOString() : new Date().toISOString(),
      userId: userId,
      to: data.to
    })

    await putFn.fn('', payload, (result) => {
      const target = debts.find((d) => d._id === result._id)
      if (target) target.payAmount = result.payAmount
      payRef.current?.close()
      SetDebts([...debts])
    })
  }

  async function viewLogs(debt: any) {
    //setLogsLoading(true)
    setLogs([])
    logsRef.current?.showModal()
    getLogsFn.fn(`/api/web/log/purchase?purchaseId=${debt._id}`, "{}", (res) => {
      setLogs(res)
      //setLogsLoading(false)
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
      }
      else {
        window.location.href = '/finance/debt'
      }
    }
    catch (e: any) {
      alert(e.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/debt?id=${masterAccountId}&type=product`
      const bankUrl = `/api/web/bank-accounts?id=${masterAccountId}`
      bankAccountFn.fn(bankUrl, "{}", () => { })
      getFn.fn(url, "{}", (result) => {
        SetDebts(result)
      })
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Debts</span>
        <div className="relative bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your debt</span>
            <button disabled onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>

          {
            getFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getFn.error || getFn.noResult
                ?
                <div>
                  <p>{getFn.message}</p>
                </div>
                :
                <div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Supplier</th>
                        <th>Price</th>
                        <th>Pay Amount</th>
                        <th>Remain</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        debts.map((p, index) => {
                          return (
                            <tr key={index}>
                              <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                              <td>{p.product.productName}</td>
                              <td>{p.supplier?.bussinessName || p.vendor?.vendorName || '-'}</td>
                              <td>{p.finalPrice?.toLocaleString('id-ID')}</td>
                              <td>{p.payAmount?.toLocaleString('id-ID')}</td>
                              <td>{(p.finalPrice - p.payAmount)?.toLocaleString('id-ID')}</td>
                              <td className="flex flex-row gap-3">
                                <button className="btn btn-sm btn-primary" onClick={() => openPay(p)}>
                                  Pay
                                </button>
                                <button className="btn btn-sm btn-secondary" onClick={() => viewLogs(p)}>
                                  Logs
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      }
                    </tbody>
                  </table>
                </div>
          }
          <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
            <Link href="/xdebt">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>
        </div>

        {/* ─── Pay Modal ─── */}
        <dialog id="pay_modal" ref={payRef} className="modal text-black">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add Payment</h3>
            <form onSubmit={payForm.handleSubmit(paySubmit)} className="flex flex-col gap-3 mt-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <input className="input w-full" {...payForm.register("productName")} type="text" readOnly />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Remaining Debt</legend>
                <input className="input w-full" value={(parseInt(payForm.watch("finalPrice") || 0) - parseInt(payForm.watch("currPayAmt") || 0)).toLocaleString('id-ID')} type="text" readOnly />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Pembayaran</legend>
                <input className="input w-full" {...payForm.register("payDate")} type="date" required />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay Amount</legend>
                <input className="input w-full" {...payForm.register("payAmount")} type="number" required />
                <input className="input w-full" {...payForm.register("to")} type="hidden" required />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Payment Method</legend>
                <select className="select w-full" {...payForm.register("paymentMethod")}>
                  <option value="Cash">Cash</option>
                  {
                    bankAccountFn.result?.map((bank) => (
                      <option key={bank._id} value={`transfer from ${bank.bank}`}>transfer from {bank.bank} ({bank.accountName})</option>
                    ))
                  }
                </select>
              </fieldset>
              {putFn.noResult || putFn.error ? <label className="input-validator text-red-900">something went wrong</label> : <></>}
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => payRef.current?.close()}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={putFn.loading}>Save Payment</button>
              </div>
            </form>
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
              <p>No payment logs found.</p>
            ) : (
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
                        <button
                          className="btn btn-xs btn-warning"
                          onClick={() => openEditLog(L)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </dialog>

        {/* ─── Edit Log Modal (requires approval code) ─── */}
        <dialog id="edit_log_modal" ref={editLogRef} className="modal text-black">
          <div className="modal-box">
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
                    {
                      bankAccountFn.result?.map((bank: any) => (
                        <option key={bank._id} value={`transfer from ${bank.bank}`}>
                          transfer from {bank.bank} ({bank.accountName})
                        </option>
                      ))
                    }
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