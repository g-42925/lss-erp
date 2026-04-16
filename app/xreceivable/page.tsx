"use client"

import Link from "next/link";
import Image from "next/image"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function Receivable() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const payRef = useRef<HTMLDialogElement>(null)
  const historyRef = useRef<HTMLDialogElement>(null)

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')

  const [searchResult, setSearchResult] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])

  const router = useRouter()

  const putFn = useFetch<any, any>({
    url: '/api/web/roles',
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

  async function payInvoice(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedInvoice) return

    putFn.fn('/api/web/receivable', JSON.stringify({ id: selectedInvoice._id, payAmount: Number(payAmount), method: paymentMethod }), () => {
      payRef.current?.close()
      getFn.fn(`/api/web/receivable?id=${masterAccountId}&type=service`, JSON.stringify({}), (result) => {
        setInvoices(result)
      })
    })
  }

  async function revertPayment(history: { date: string, method: string, amount: number }) {
    if (!confirm("Are you sure you want to void this payment? This will deduct the amount from the total paid.")) return;

    putFn.fn('/api/web/receivable', JSON.stringify({
      id: selectedInvoice._id,
      action: 'revert',
      historyDate: history.date,
      historyAmount: history.amount
    }), () => {
      historyRef.current?.close()
      getFn.fn(`/api/web/receivable?id=${masterAccountId}&type=service`, JSON.stringify({}), (result) => {
        setInvoices(result)
      })
    })
  }



  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/receivable?id=${masterAccountId}&type=service`

      const body = JSON.stringify({})

      getFn.fn(url, body, (result) => {
        setInvoices(result)
      })
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Receivables</span>
        <div className="relative bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your receivable</span>
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
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
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
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice Number</th>
                        <th>Sales Order Number</th>
                        <th>Product</th>
                        <th>Customer</th>
                        <th>Value</th>
                        <th>Pay Amount</th>
                        <th>Remain</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          invoices.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.invoiceNumber}</td>
                                <td>{p.order.salesOrderNumber}</td>
                                <td>{p.product?.productName}</td>
                                <td>{p.order.customerName ? p.order.customerName : p.order.customer.bussinessName}</td>
                                <td>{p.value}</td>
                                <td>{p.payAmount}</td>
                                <td>{p.value - p.payAmount}</td>
                                <td>
                                  <div className="flex gap-2">
                                    {
                                      p.value - p.payAmount > 0 && (
                                        <button onClick={() => { setSelectedInvoice(p); setPayAmount(0); payRef.current?.showModal() }} className="btn btn-sm btn-primary">Pay</button>
                                      )
                                    }
                                    <button onClick={() => { setSelectedInvoice(p); historyRef.current?.showModal() }} className="btn btn-sm btn-outline">History</button>
                                  </div>
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
            <Link href="/receivable">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>
        </div>
      </div>

      <dialog ref={payRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Pay Receivable</h3>
          <form onSubmit={payInvoice} className="flex flex-col gap-4">
            <div>
              <label className="label">Amount to Pay</label>
              <input
                type="number"
                required
                min={1}
                max={selectedInvoice ? selectedInvoice.value - selectedInvoice.payAmount : 0}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="input input-bordered w-full"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="select select-bordered w-full">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button type="button" className="btn" onClick={() => payRef.current?.close()}>Cancel</button>
              <button disabled={putFn.loading} type="submit" className="btn btn-primary">
                {putFn.loading ? <span className="loading loading-spinner"></span> : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      <dialog ref={historyRef} className="modal">
        <div className="modal-box max-w-3xl">
          <h3 className="font-bold text-lg mb-4">Payment History ({selectedInvoice?.invoiceNumber})</h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice?.paymentHistory?.length > 0 ? (
                  selectedInvoice.paymentHistory.map((history: { date: string, method: string, amount: number, reverted?: boolean }, index: number) => (
                    <tr key={index} className={history.reverted ? 'opacity-60 text-red-600 line-through' : ''}>
                      <td>{new Date(history.date).toLocaleString('id-ID')} {history.reverted && '(Voided)'}</td>
                      <td>{history.method}</td>
                      <td>{history.amount}</td>
                      <td>
                        {!history.reverted && (
                          <button onClick={() => revertPayment(history)} disabled={putFn.loading} className="btn btn-xs btn-error text-white">Void</button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center">No payment history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <button type="button" className="btn" onClick={() => historyRef.current?.close()}>Close</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  )
}

type Failed = {
  message: string
}