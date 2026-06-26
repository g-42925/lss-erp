"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import { useRef, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from 'next/navigation';

export default function Rlog() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [searchResult, setSearchResult] = useState<any[]>([])
  const [log, setLog] = useState<any[]>([])

  const editRef = useRef<HTMLDialogElement>(null)
  const editPrForm = useForm()

  const searchParams = useSearchParams();
  const so = searchParams.get('so');

  const fetchBatchesFn = useFetch<any[], any>({
    url: `/api/web/rlog?so=xxx`,
    method: 'GET'
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/rlog`,
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const refreshLogs = () => {
    const url = `/api/web/rlog?so=${so}`
    fetchBatchesFn.fn(url, JSON.stringify({}), (result) => {
      setLog(result)
    })
  }

  useEffect(() => {
    if (hasHydrated) {
      refreshLogs()
    }
  }, [hasHydrated, masterAccountId, so])

  function search(v: string) {
    if (v.length > 0) {
      const result = log.filter((r) => {
        return r.product?.productName?.toLowerCase().includes(v.toLowerCase()) ||
          r.purchaseOrderNumber?.toLowerCase().includes(v.toLowerCase())
      })
      setSearchResult(result)
    }
    else {
      setSearchResult([])
    }
  }

  function edit(batchId: string) {
    const filter = log.find((p) => p._id === batchId)
    if (filter) {
      editPrForm.reset({
        _id: filter._id,
        productName: filter.product?.productName || '-',
        qty: filter.qty,
        expiryDate: filter.expiryDate ? new Date(filter.expiryDate).toISOString().split('T')[0] : '',
        approvalCode: ''
      })
      editRef.current?.showModal()
    }
  }

  async function editSubmit(data: any) {
    const { _id, qty, expiryDate, approvalCode } = data
    if (!qty || isNaN(parseInt(qty))) {
      alert("Invalid quantity")
      return;
    }
    await editFn.fn('', JSON.stringify({ _id, qty: parseInt(qty), expiryDate, approvalCode, editingUserId: userId }), () => {
      editRef.current?.close()
      refreshLogs()
    })
  }

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Receiving Log</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
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
            <input onKeyUp={(e) => search((e.target as HTMLInputElement).value)} type="search" placeholder="Search product or PO..." className="ml-auto border-1 border-black rounded-md p-3" />
          </div>
          {
            fetchBatchesFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              fetchBatchesFn.error || fetchBatchesFn.noResult || log.length === 0
                ?
                <div>
                  <p>{fetchBatchesFn.message || "No logs found."}</p>
                </div>
                :
                <div>
                  <table className="table text-center w-full">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Received By</th>
                        <th>Edited By</th>
                        <th>Edited At</th>
                        <th>Approved By</th>
                        <th>PO Number</th>
                        <th>Product</th>
                        <th>Supplier</th>
                        <th>Location</th>
                        <th>Quantity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        (searchResult.length > 0 ? searchResult : log).map((p, index) => {
                          return (
                            <tr key={index}>
                              <td>{new Date(p.createdAt).toLocaleString('id-ID')}</td>
                              <td>{p.user?.name || '-'}</td>
                              <td>{p.editor?.name || '-'}</td>
                              <td>{p.editedAt ? new Date(p.editedAt).toLocaleString('id-ID') : '-'}</td>
                              <td>{p.approver?.name || '-'}</td>
                              <td>{p.purchaseOrderNumber || '-'}</td>
                              <td>{p.product?.productName || '-'}</td>
                              <td>{p.supplier?.bussinessName || '-'}</td>
                              <td>{p.location?.name || '-'}</td>
                              <td>{p.qty} ({p.product?.purchaseUnit || '-'})</td>
                              <td>
                                <button onClick={() => edit(p._id)} className="btn btn-sm btn-outline">
                                  Edit
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
        </div>
      </div>

      <dialog id="edit_log_modal" ref={editRef} className="modal text-black">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Edit Receiving Log</h3>
          <form onSubmit={editPrForm.handleSubmit(editSubmit)} className="flex flex-col gap-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Product</legend>
              <input className="input w-full bg-gray-100" {...editPrForm.register("productName")} type="text" readOnly />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Quantity</legend>
              <input
                className="input w-full"
                {...editPrForm.register("qty", { required: true })}
                type="number"
                min={1}
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Expiry Date</legend>
              <input
                className="input w-full"
                {...editPrForm.register("expiryDate")}
                type="date"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Approval Code</legend>
              <input
                className="input w-full"
                {...editPrForm.register("approvalCode", { required: true })}
                type="password"
                placeholder="Enter Manager/Admin Approval Code"
              />
            </fieldset>

            {editFn.error && <p className="text-red-500 text-sm mt-2">{editFn.message}</p>}

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => editRef.current?.close()}>Cancel</button>
              <button type="submit" disabled={editFn.loading} className="btn btn-primary">{editFn.loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}