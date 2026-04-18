"use client"

import Link from "next/link";
import Image from "next/image"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function XDebt() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const payRef = useRef<HTMLDialogElement>(null)
  const logsRef = useRef<HTMLDialogElement>(null)

  const [debts, SetDebts] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const newRoleForm = useForm()
  const editRoleForm = useForm()
  const payForm = useForm()
  const router = useRouter()

  const putFn = useFetch<any, any>({
    url: '/api/web/purchases',
    method: 'PUT'
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/roles',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const getFn = useFetch<any[], any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  })

  const deleteFn = useFetch<any[], any>({
    url: `/api/web/roles?id=xxx`,
    method: 'DELETE',
    onError: (m) => {
      alert(m)
    }
  })


  async function search(v: string) {

  }

  const getLogsFn = useFetch<any[], any>({
    url: `/api/web/log/purchase`,
    method: 'GET'
  })

  async function openPay(debt: any) {
    payForm.reset({
      _id: debt._id,
      description: debt.description,
      currPayAmt: debt.payAmount,
      finalPrice: debt.finalPrice,
      payAmount: 0,
      paymentMethod: "Cash"
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
       paymentMethod: data.paymentMethod
     })
     
     await putFn.fn('', payload, (result) => {
       const target = debts.find((d) => d._id === result._id)
       if(target) target.payAmount = result.payAmount
       payRef.current?.close()
       SetDebts([...debts])
     })
  }

  async function viewLogs(debtId: string) {
     setLogsLoading(true)
     setLogs([])
     logsRef.current?.showModal()
     getLogsFn.fn(`/api/web/log/purchase?purchaseId=${debtId}`, "{}", (res) => {
        setLogs(res)
        setLogsLoading(false)
     })
  }



  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/debt?id=${masterAccountId}&type=payment`

      const body = JSON.stringify({})

      getFn.fn(url, body, (result) => {
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
          <div className="flex flex-row">
            <div className="flex flex-row gap-2 items-center">
              Show
              <select className="select w-16">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
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
                        <th>Description</th>
                        <th>Vendor</th>
                        <th>Price</th>
                        <th>Pay Amount</th>
                        <th>Remain</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          debts.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.description}</td>
                                <td>{p.vendor.name}</td>
                                <td>{p.finalPrice}</td>
                                <td>{p.payAmount}</td>
                                <td>{p.finalPrice - p.payAmount}</td>
                                <td className="flex flex-row gap-3">
                                  <button className="btn btn-sm btn-primary" onClick={() => openPay(p)}>
                                    Pay
                                  </button>
                                  <button className="btn btn-sm btn-secondary" onClick={() => viewLogs(p._id)}>
                                    Logs
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((role, index) => {
                            return (
                              <tr key={index}>
                                <td>{role.name}</td>
                                <td className="flex flex-row gap-3">
                                  <button className="btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button className="btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                    Delete
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
            <Link href="/debt">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>
        </div>
        <dialog id="pay_modal" ref={payRef} className="modal text-black">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add Payment</h3>
            <form onSubmit={payForm.handleSubmit(paySubmit)} className="flex flex-col gap-3 mt-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Description</legend>
                <input className="input w-full" {...payForm.register("description")} type="text" readOnly />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Remaining Debt</legend>
                <input className="input w-full" value={parseInt(payForm.watch("finalPrice") || 0) - parseInt(payForm.watch("currPayAmt") || 0)} type="text" readOnly />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay Amount</legend>
                <input className="input w-full" {...payForm.register("payAmount")} type="number" required />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Payment Method</legend>
                <select className="select w-full" {...payForm.register("paymentMethod")}>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="E-Wallet">E-Wallet</option>
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

        <dialog id="logs_modal" ref={logsRef} className="modal text-black">
          <div className="modal-box">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Payment Logs</h3>
              <button className="btn btn-sm btn-circle" onClick={() => logsRef.current?.close()}>✕</button>
            </div>
            {logsLoading ? (
              <div className="flex flex-col justify-center items-center p-6"><span className="loading loading-spinner"></span></div>
            ) : logs.length === 0 ? (
              <p>No payment logs found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Number</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Init</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((L, i) => (
                    <tr key={i}>
                      <td>{new Date(L.date).toLocaleString('id-ID')}</td>
                      <td>{L.paymentNumber}</td>
                      <td>{L.amount}</td>
                      <td>{L.paymentMethod || '-'}</td>
                      <td>{L.initial ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </dialog>
      </div>
    </>
  )
}

type Failed = {
  message: string
}