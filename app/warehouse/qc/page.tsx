"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth";
import { useEffect, useState } from "react";
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, MultiplicationSignIcon } from '@hugeicons/core-free-icons';

export default function QualityControl() {
  const loggedIn = useAuth((state) => state.loggedIn);
  const userId = useAuth((state) => state.userId);
  const hasHydrated = useAuth((s) => s._hasHydrated);

  const [batches, setBatches] = useState<any[]>([]);

  const getFn = useFetch<any[], any>({
    url: '/api/web/qc',
    method: 'GET'
  });

  const editFn = useFetch<any, any>({
    url: `/api/web/qc`,
    method: 'PUT',
    onError: (m) => {
      alert(m);
    }
  });

  useEffect(() => {
    if (hasHydrated && loggedIn) {
      getFn.fn('/api/web/qc?status=QUARANTINE', JSON.stringify({}), (result) => {
        setBatches(result);
      });
    }
  }, [hasHydrated, loggedIn]);

  async function approve(_id: string) {
    if (!confirm("Approve this batch and move to active stock?")) return;
    const payload = JSON.stringify({
      _id,
      action: 'approve',
      userId
    });
    await editFn.fn('', payload, () => {
      setBatches(prev => prev.filter(b => b._id !== _id));
    });
  }

  async function reject(_id: string) {
    if (!confirm("Reject this batch?")) return;
    const payload = JSON.stringify({
      _id,
      action: 'reject',
      userId
    });
    await editFn.fn('', payload, () => {
      setBatches(prev => prev.filter(b => b._id !== _id));
    });
  }

  if (!hasHydrated) return null;
  if (!loggedIn) {
    if (typeof window !== "undefined") window.location.href = '/login';
    return null;
  }

  return (
    <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
      <span className="page-title">Quality Control (QC)</span>
      <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
        <div className="flex flex-col sm:flex-row gap-2 justify-between">
          <p className="text-gray-600">Approve or reject items received in quarantine.</p>
        </div>
        {
          getFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
          ) : getFn.error || getFn.noResult ? (
            <div>
              <p>{getFn.message || "No quarantine batches found."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="table text-center">
                <thead>
                  <tr>
                    <th>Date Received</th>
                    <th>Batch Number</th>
                    <th>Product</th>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Quantity (Total Units)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    batches.map((b) => (
                      <tr key={b._id}>
                        <td>{new Date(b.createdAt).toLocaleDateString('id-ID')}</td>
                        <td>{b.batchNumber}</td>
                        <td>{b.product?.productName || '-'}</td>
                        <td>{b.purchaseOrderNumber || '-'}</td>
                        <td>{b.supplier?.bussinessName || '-'}</td>
                        <td>{b.qty} ({b.accumulative})</td>
                        <td className="flex justify-center gap-2">
                          <button className="text-green-600" onClick={() => approve(b._id)} title="Approve">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={22} color="currentColor" />
                          </button>
                          <button className="text-red-600" onClick={() => reject(b._id)} title="Reject">
                            <HugeiconsIcon icon={MultiplicationSignIcon} size={22} color="currentColor" />
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}
