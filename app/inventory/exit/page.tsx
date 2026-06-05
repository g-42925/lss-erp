"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form";

export default function ExitItem() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const hasHydrated = useAuth((s) => s._hasHydrated);
  const masterAccountId = useAuth((state) => state.masterAccountId);

  const modalRef = useRef<HTMLDialogElement>(null);
  const form = useForm();

  // Fetches
  const fetchLogsFn = useFetch<any, any>({
    url: '/api/web/exit',
    method: 'GET',
    onError: (m) => console.log('Error fetching exit logs', m)
  });

  const fetchLocationsFn = useFetch<any[], any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET'
  });

  const fetchProductsFn = useFetch<any[], any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  });

  const addExitFn = useFetch<any, any>({
    url: '/api/web/exit',
    method: 'POST'
  });

  function loadLogs() {
    fetchLogsFn.fn('', '', (r: any) => {
      setLogs(r || []);
    });
  }

  useEffect(() => {
    if (hasHydrated) {
      loadLogs();
      const locUrl = `/api/web/location?id=${masterAccountId}`
      const pUrl = `/api/web/products?id=${masterAccountId}&type=all`
      fetchLocationsFn.fn(locUrl, '', (r: any) => setLocations(r));
      fetchProductsFn.fn(pUrl, '', (r: any) => setProducts(r));
      setMounted(true);
    }
  }, [hasHydrated, masterAccountId]);

  function toggleAdd() {
    form.reset();
    setSelectedProductId("");
    setSelectedLocationId("");
    modalRef.current?.showModal();
  }

  function handleAddSubmit(data: any) {
    if (!selectedLocationId || !selectedProductId) {
      alert("Please select location and product.");
      return;
    }

    const payload = JSON.stringify({
      locationId: selectedLocationId,
      productId: selectedProductId,
      qty: data.qty,
      reason: data.reason,
      note: data.note || ""
    });

    addExitFn.fn('', payload, (result) => {
      loadLogs();
      modalRef.current?.close();
    });
  }

  if (!mounted) return null;

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Exit Items <span className="text-sm leading-loose">Manage damaged or expired stock</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">Exit Log History</span>
            <button onClick={toggleAdd} className="btn ml-auto bg-blue-900 text-white hover:bg-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Exit Item
            </button>
          </div>
          
          {fetchLogsFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
          ) : (
            <div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Location</th>
                    <th>Qty</th>
                    <th>Reason</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={index}>
                      <td>{new Date(log.date).toLocaleString('id-ID')}</td>
                      <td>{log.product?.productName}</td>
                      <td>{log.location?.name}</td>
                      <td className="text-red-600 font-bold">-{log.qty}</td>
                      <td>
                        <div className="badge badge-error gap-2 text-white p-3">
                          {log.reason}
                        </div>
                      </td>
                      <td>{log.note || '-'}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4">No exit items recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <dialog ref={modalRef} className="modal">
        <form onSubmit={form.handleSubmit(handleAddSubmit)} className="modal-box flex flex-col gap-4 text-black">
          <h3 className="text-lg font-bold">Add Exit Item</h3>
          
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-sm">Location</label>
            <select 
              className="select select-bordered w-full"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              required
            >
              <option value="" disabled>Select Location</option>
              {locations.map((loc, i) => (
                <option key={i} value={loc._id}>{loc.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-sm">Product</label>
            <select 
              className="select select-bordered w-full"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
            >
              <option value="" disabled>Select Product</option>
              {products.map((prod, i) => (
                <option key={i} value={prod._id}>{prod.productName}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-row gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-semibold text-sm">Reason</label>
              <select {...form.register('reason', { required: true })} className="select select-bordered w-full" defaultValue="BROKEN">
                <option value="BROKEN">Broken</option>
                <option value="EXPIRED">Expired</option>
                <option value="LOST">Lost</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-semibold text-sm">Quantity</label>
              <input 
                {...form.register('qty', { required: true, min: 1 })}
                type="number" 
                className="input input-bordered w-full" 
                placeholder="Exited Quantity" 
                min="1"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-semibold text-sm">Note (Optional)</label>
            <input 
              {...form.register('note')}
              type="text" 
              className="input input-bordered w-full" 
              placeholder="Additional information" 
            />
          </div>

          {addExitFn.error && (
            <p className="text-red-500 text-sm mt-1">{addExitFn.message}</p>
          )}

          <div className="modal-action">
            <button type="button" className="btn" onClick={() => modalRef.current?.close()}>Cancel</button>
            <button type="submit" className="btn bg-blue-900 text-white hover:bg-blue-800">
              {addExitFn.loading ? <span className="loading loading-spinner"></span> : "Confirm Exit"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
