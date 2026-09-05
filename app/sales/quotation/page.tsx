"use client"
import { useEffect, useState, Suspense } from 'react'
import useAuth from "@/store/auth"
import Link from "next/link";
import { HugeiconsIcon } from '@hugeicons/react'
import { AddCircleHalfDotIcon, Edit03Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import Swal from "sweetalert2";

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
                <td>{new Date(quo.date).toLocaleDateString()}</td>
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
    </div>
  )
}
