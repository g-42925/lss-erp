"use client"
import { useEffect, useState, Suspense } from 'react'
import useAuth from "@/store/auth"
import Link from "next/link";
import { HugeiconsIcon } from '@hugeicons/react'
import { AddCircleHalfDotIcon, Edit03Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import Swal from "sweetalert2";
import { formatDate } from "@/lib/utils";

export default function QuotationList() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuotationListContent />
    </Suspense>
  )
}

function QuotationListContent() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Copy Modal States
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copyTargetQuo, setCopyTargetQuo] = useState<any>(null)
  const [copyCustomer, setCopyCustomer] = useState('')
  const [copyPriceOptions, setCopyPriceOptions] = useState<any[]>([])
  const [copying, setCopying] = useState(false)

  useEffect(() => {
    if (loggedIn && hasHydrated && masterAccountId) {
      fetchQuotations()
    }
  }, [loggedIn, hasHydrated, masterAccountId])

  const fetchQuotations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/web/quotations?id=${masterAccountId}`)
      const data = await res.json()
      if (!data.error) {
        setQuotations(data.result || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!'
    })

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/web/quotations/${id}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!data.error) {
          Swal.fire('Deleted!', 'Your quotation has been deleted.', 'success')
          fetchQuotations()
        } else {
          Swal.fire('Error!', data.message, 'error')
        }
      } catch (e) {
        Swal.fire('Error!', 'Something went wrong', 'error')
      }
    }
  }

  const openCopyModal = (quo: any) => {
    setCopyTargetQuo(quo)
    setCopyCustomer('')
    setCopyPriceOptions(quo.priceOptions?.length ? JSON.parse(JSON.stringify(quo.priceOptions)) : [{ qty: 1, frequency: 'Month', price: 0 }])
    setCopyModalOpen(true)
  }

  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!copyCustomer) {
      Swal.fire('Error', 'Nama Customer harus diisi', 'error')
      return
    }

    setCopying(true)
    try {
      const payload = {
        masterAccountId,
        customCustomer: { name: copyCustomer, address: '' },
        productId: copyTargetQuo.productId?._id || copyTargetQuo.productId,
        specifications: copyTargetQuo.specifications,
        priceOptions: copyPriceOptions,
        programs: copyTargetQuo.programs,
        note: copyTargetQuo.note,
        introduction: copyTargetQuo.introduction,
        disclaimers: copyTargetQuo.disclaimers,
      }

      const res = await fetch('/api/web/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!data.error) {
        Swal.fire('Success!', 'Quotation berhasil disalin.', 'success')
        setCopyModalOpen(false)
        fetchQuotations()
      } else {
        Swal.fire('Error!', data.message, 'error')
      }
    } catch (err) {
      Swal.fire('Error!', 'Something went wrong', 'error')
    } finally {
      setCopying(false)
    }
  }

  const addCopyPriceOption = () => {
    setCopyPriceOptions([...copyPriceOptions, { qty: 1, frequency: 'Month', price: 0 }])
  }
  const updateCopyPriceOption = (index: number, field: string, val: any) => {
    const newOpts = [...copyPriceOptions]
    newOpts[index][field] = val
    setCopyPriceOptions(newOpts)
  }
  const removeCopyPriceOption = (index: number) => {
    const newOpts = [...copyPriceOptions]
    newOpts.splice(index, 1)
    setCopyPriceOptions(newOpts)
  }

  if (!hasHydrated || loading) {
    return <div className="p-8 text-center"><span className="loading loading-spinner loading-lg"></span></div>
  }

  return (
    <div className="p-8 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Quotations</h1>
        <Link href="/sales/quotation/create" className="btn btn-primary">
          <HugeiconsIcon icon={AddCircleHalfDotIcon} />
          Create Quotation
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Quotation No</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quo) => (
              <tr key={quo._id}>
                <td>{formatDate(quo.date)}</td>
                <td>{quo.quotationNumber}</td>
                <td>
                  {quo.customerId ? quo.customerId.name || quo.customerId.bussinessName : quo.customCustomer?.name || '-'}
                </td>
                <td>{quo.productId?.productName || '-'}</td>
                <td>
                  <span className={`badge ${quo.status === 'draft' ? 'badge-neutral' : quo.status === 'accepted' ? 'badge-success' : 'badge-info'}`}>
                    {quo.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => openCopyModal(quo)} className="btn btn-sm btn-outline btn-secondary">
                      Salin
                    </button>
                    <Link href={`/sales/quotation/edit/${quo._id}`} className="btn btn-sm btn-outline btn-warning">
                      <HugeiconsIcon icon={Edit03Icon} size={16} /> Edit
                    </Link>
                    <Link href={`/sales/quotation/print/${quo._id}`} className="btn btn-sm btn-outline btn-info">
                      Print/Preview
                    </Link>
                    <button onClick={() => handleDelete(quo._id)} className="btn btn-sm btn-outline btn-error">
                      <HugeiconsIcon icon={Delete01Icon} size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">No quotations found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {copyModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">Salin Quotation</h3>
            <form onSubmit={handleCopySubmit} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Nama Customer Baru</span></label>
                <input type="text" className="input input-bordered" required value={copyCustomer} onChange={e => setCopyCustomer(e.target.value)} />
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Opsi Harga</span>
                  <button type="button" onClick={addCopyPriceOption} className="btn btn-sm btn-primary">Add Price Option</button>
                </div>
                {copyPriceOptions.map((opt, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr_1fr_auto] gap-2 items-center mb-2">
                    <input type="number" placeholder="Qty" className="input input-bordered w-full" required value={opt.qty} onChange={e => updateCopyPriceOption(i, 'qty', parseInt(e.target.value) || 0)} />
                    <select className="select select-bordered w-full" value={opt.frequency} onChange={e => updateCopyPriceOption(i, 'frequency', e.target.value)}>
                      <option value="Once">Once</option>
                      <option value="Week">Week</option>
                      <option value="Month">Month</option>
                      <option value="Year">Year</option>
                    </select>
                    <input type="number" placeholder="Price" className="input input-bordered w-full" required value={opt.price} onChange={e => updateCopyPriceOption(i, 'price', parseFloat(e.target.value) || 0)} />
                    <button type="button" onClick={() => removeCopyPriceOption(i)} className="btn btn-error btn-square btn-sm text-white">X</button>
                  </div>
                ))}
              </div>

              <div className="modal-action">
                <button type="button" className="btn" onClick={() => setCopyModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={copying} className="btn btn-success text-white">
                  {copying ? 'Menyalin...' : 'Salin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
