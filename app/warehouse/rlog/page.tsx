"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth"
import { useRef, useState, useEffect, Suspense } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from 'next/navigation';

export default function Rlog() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RlogContent />
    </Suspense>
  )
}

function RlogContent() {
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const userId = useAuth((state) => state.userId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [searchResult, setSearchResult] = useState<any[]>([])
  const [log, setLog] = useState<any[]>([])
  const [logType, setLogType] = useState<'product' | 'procurement'>('product')

  const editRef = useRef<HTMLDialogElement>(null)
  const editPrForm = useForm()

  const searchParams = useSearchParams();
  const so = searchParams.get('so');
  const typeParam = searchParams.get('type') as 'product' | 'procurement' | null;

  const fetchLogsFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/rlog`,
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const refreshLogs = (type: string) => {
    const url = `/api/web/rlog?so=${so}&type=${type}`
    fetchLogsFn.fn(url, JSON.stringify({}), (result) => {
      setLog(result)
    })
  }

  useEffect(() => {
    if (hasHydrated) {
      const t = typeParam || 'product'
      setLogType(t as 'product' | 'procurement')
      refreshLogs(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, masterAccountId, so, typeParam])

  function search(v: string) {
    if (v.length > 0) {
      const result = log.filter((r) => {
        if (logType === 'procurement') {
          return r.item?.name?.toLowerCase().includes(v.toLowerCase()) ||
            r.purchaseOrderNumber?.toLowerCase().includes(v.toLowerCase())
        }
        return r.product?.productName?.toLowerCase().includes(v.toLowerCase()) ||
          r.purchaseOrderNumber?.toLowerCase().includes(v.toLowerCase())
      })
      setSearchResult(result)
    }
    else {
      setSearchResult([])
    }
  }

  function edit(id: string) {
    const filter = log.find((p) => p._id === id)
    if (!filter) return

    if (logType === 'procurement') {
      editPrForm.reset({
        _id: filter._id,
        itemName: filter.item?.name || '-',
        qty: filter.qty,
        receivedDate: filter.receivedDate
          ? new Date(filter.receivedDate).toISOString().split('T')[0]
          : '',
        approvalCode: '',
        type: 'procurement'
      })
    } else {
      editPrForm.reset({
        _id: filter._id,
        productName: filter.product?.productName || '-',
        qty: filter.qty,
        expiryDate: filter.expiryDate ? new Date(filter.expiryDate).toISOString().split('T')[0] : '',
        approvalCode: '',
        type: 'product'
      })
    }
    editRef.current?.showModal()
  }

  async function editSubmit(data: any) {
    const { _id, qty, expiryDate, receivedDate, approvalCode, type: submitType } = data
    if (!qty || isNaN(parseInt(qty))) {
      alert("Invalid quantity")
      return;
    }
    const payload: any = {
      _id,
      qty: parseInt(qty),
      approvalCode,
      editingUserId: userId,
      type: submitType
    }
    if (submitType === 'procurement') {
      payload.receivedDate = receivedDate
    } else {
      payload.expiryDate = expiryDate
    }
    await editFn.fn('', JSON.stringify(payload), () => {
      editRef.current?.close()
      refreshLogs(logType)
    })
  }

  const displayList = searchResult.length > 0 ? searchResult : log

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Receiving Log</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
            {/* Type tabs */}
            <div className="tabs tabs-boxed bg-gray-100">
              <a
                className={`tab ${logType === 'product' ? 'tab-active bg-blue-900 text-white' : ''}`}
                onClick={() => { setLogType('product'); setLog([]); setSearchResult([]); refreshLogs('product') }}
              >Products</a>
              <a
                className={`tab ${logType === 'procurement' ? 'tab-active bg-blue-900 text-white' : ''}`}
                onClick={() => { setLogType('procurement'); setLog([]); setSearchResult([]); refreshLogs('procurement') }}
              >Procurement</a>
            </div>
            <div className="flex flex-row gap-2 items-center">
              Show
              <select className="select w-16">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <input onKeyUp={(e) => search((e.target as HTMLInputElement).value)} type="search" placeholder="Search item or PO..." className="toolbar-search" />
          </div>
          {
            fetchLogsFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              fetchLogsFn.error || fetchLogsFn.noResult || log.length === 0
                ?
                <div>
                  <p>{fetchLogsFn.message || "No logs found."}</p>
                </div>
                :
                <div>
                  <div className="overflow-x-auto w-full">
                    {logType === 'procurement' ? (
                      /* ── Procurement table ── */
                      <table className="table text-center w-full">
                        <thead>
                          <tr>
                            <th>Tanggal Terima</th>
                            <th>Diterima Oleh</th>
                            <th>Diedit Oleh</th>
                            <th>Diedit Pada</th>
                            <th>Disetujui Oleh</th>
                            <th>PO Number</th>
                            <th>Item</th>
                            <th>Simpan Sebagai</th>
                            <th>Jumlah</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            displayList.map((p, index) => (
                              <tr key={index}>
                                <td>{p.receivedDate ? new Date(p.receivedDate).toLocaleDateString('id-ID') : '-'}</td>
                                <td>{p.user?.name || '-'}</td>
                                <td>{p.editor?.name || '-'}</td>
                                <td>{p.editedAt ? new Date(p.editedAt).toLocaleString('id-ID') : '-'}</td>
                                <td>{p.approver?.name || '-'}</td>
                                <td>{p.purchaseOrderNumber || '-'}</td>
                                <td>{p.item?.name || '-'}</td>
                                <td>
                                  <span className={`badge ${p.saveAs === 'asset' ? 'badge-warning' : 'badge-success'}`}>
                                    {p.saveAs === 'asset' ? 'Aset' : 'Inventori'}
                                  </span>
                                </td>
                                <td>{p.qty} ({p.item?.unit || '-'})</td>
                                <td>
                                  <button onClick={() => edit(p._id)} className="btn btn-sm btn-outline">
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    ) : (
                      /* ── Product batch table ── */
                      <table className="table text-center w-full">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Received By</th>
                            <th>Edited By</th>
                            <th>Edited At</th>
                            <th>Approved By</th>
                            <th>PO Number</th>
                            <th>Status</th>
                            <th>Product</th>
                            <th>Supplier</th>
                            <th>Location</th>
                            <th>Quantity</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            displayList.map((p, index) => (
                              <tr key={index}>
                                <td>{new Date(p.createdAt).toLocaleString('id-ID')}</td>
                                <td>{p.user?.name || '-'}</td>
                                <td>{p.editor?.name || '-'}</td>
                                <td>{p.editedAt ? new Date(p.editedAt).toLocaleString('id-ID') : '-'}</td>
                                <td>{p.approver?.name || '-'}</td>
                                <td>{p.purchaseOrderNumber || '-'}</td>
                                <td>
                                  <span className={`badge ${p.status === 'QUARANTINE' ? 'badge-warning' : p.status === 'ACTIVE' ? 'badge-success' : 'badge-error'}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td>{p.product?.productName || '-'}</td>
                                <td>{p.supplier?.bussinessName || '-'}</td>
                                <td>{p.location?.name || '-'}</td>
                                <td>{p.qty} ({p.product?.purchaseUnit || '-'})</td>
                                <td>
                                  {p.status === 'QUARANTINE' ? (
                                    <button onClick={() => edit(p._id)} className="btn btn-sm btn-outline">
                                      Edit
                                    </button>
                                  ) : (
                                    <button disabled className="btn btn-sm btn-outline" title="Cannot edit after QC">
                                      Edit
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
          }
        </div>
      </div>

      <dialog id="edit_log_modal" ref={editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Edit Receiving Log</h3>
          <form onSubmit={editPrForm.handleSubmit(editSubmit)} className="flex flex-col gap-3">
            <input type="hidden" {...editPrForm.register("type")} />
            <input type="hidden" {...editPrForm.register("_id")} />

            {/* Product name / item name (read only) */}
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                {logType === 'procurement' ? 'Item' : 'Product'}
              </legend>
              <input
                className="input w-full bg-gray-100"
                {...editPrForm.register(logType === 'procurement' ? "itemName" : "productName")}
                type="text"
                readOnly
              />
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

            {/* Conditional: date for procurement, expiry for product */}
            {logType === 'procurement' ? (
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Penerimaan</legend>
                <input
                  className="input w-full"
                  {...editPrForm.register("receivedDate")}
                  type="date"
                />
              </fieldset>
            ) : (
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Expiry Date</legend>
                <input
                  className="input w-full"
                  {...editPrForm.register("expiryDate")}
                  type="date"
                />
              </fieldset>
            )}

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
              <button type="submit" disabled={editFn.loading} className="btn btn-primary">
                {editFn.loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}