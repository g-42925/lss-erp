"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useForm } from "react-hook-form"

import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

type InvItem = {
  _id: string
  itemCode: string
  name: string
  unit: string
  category: string
  currentStock: number
  createdAt: string
}

export default function InvItemsPage() {
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const router = useRouter()

  const addRef = useRef<HTMLDialogElement>(null)
  const [items, setItems] = useState<InvItem[]>([])
  const [search, setSearch] = useState("")

  const addForm = useForm<{ name: string; unit: string; category: string }>()
  const useFormRef = useForm<{ qty: number; note: string }>()

  const useModalRef = useRef<HTMLDialogElement>(null)
  const [selectedItem, setSelectedItem] = useState<InvItem | null>(null)


  // ── Fetch ─────────────────────────────────────────────────────────────────
  const getFn = useFetch<InvItem[], any>({
    url: `/api/web/inv-items?id=${masterAccountId}`,
    method: "GET",
    onError: (m) => alert(m),
  })

  const postFn = useFetch<InvItem, any>({
    url: `/api/web/inv-items`,
    method: "POST",
    onError: (m) => alert(m),
  })

  const useFn = useFetch<any, any>({
    url: `/api/web/inv-usage`,
    method: "POST",
    onError: (m) => alert(m),
  })


  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      getFn.fn(`/api/web/inv-items?id=${masterAccountId}`, {}, (result) => {
        setItems(result)
      })
    }
  }, [masterAccountId])


  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? items.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase()) ||
      i.itemCode.toLowerCase().includes(search.toLowerCase())
    )
    : items

  async function handleAdd(data: { name: string; unit: string; category: string }) {
    await postFn.fn(
      "",
      JSON.stringify({ id: masterAccountId, ...data }) as any,
      (result) => {
        setItems((prev) => [result, ...prev])
        addForm.reset()
        addRef.current?.close()
      }
    )
  }

  async function handleUse(data: { qty: number; note: string }) {
    if (!selectedItem) return
    await useFn.fn(
      "",
      JSON.stringify({ id: masterAccountId, itemId: selectedItem._id, ...data }) as any,
      (result) => {
        // Update local stock
        setItems((prev) =>
          prev.map((i) =>
            i._id === selectedItem._id ? { ...i, currentStock: i.currentStock - data.qty } : i
          )
        )
        useFormRef.reset()
        useModalRef.current?.close()
        setSelectedItem(null)
      }
    )
  }


  const stockBadgeClass = (stock: number) =>
    stock === 0
      ? "badge badge-error badge-sm text-white"
      : stock <= 5
        ? "badge badge-warning badge-sm"
        : "badge badge-success badge-sm text-white"

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inventory Items</h1>
            <p className="text-slate-500 text-sm mt-1">Internal-use item master — office supplies, maintenance goods, etc.</p>
          </div>
          <button
            id="btn-add-item"
            onClick={() => addRef.current?.showModal()}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 active:scale-95 transition-all text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Item
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Total Items</p>
            <p className="text-3xl font-bold text-slate-800">{items.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Out of Stock</p>
            <p className="text-3xl font-bold text-red-500">{items.filter((i) => i.currentStock === 0).length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Low Stock (≤5)</p>
            <p className="text-3xl font-bold text-amber-500">{items.filter((i) => i.currentStock > 0 && i.currentStock <= 5).length}</p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <span className="text-slate-600 font-medium text-sm">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
            <input
              type="search"
              placeholder="Search name, category, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-black border border-slate-200 rounded-xl px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {getFn.loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="loading loading-spinner loading-lg text-blue-600" />
            </div>
          ) : getFn.error || getFn.noResult ? (
            <div className="text-center py-16 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 mx-auto mb-3 text-slate-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <p className="font-medium">{getFn.message || "No items found"}</p>
              <p className="text-xs mt-1 text-slate-300">Add your first inventory item using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Code</th>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-left">Unit</th>
                    <th className="px-6 py-3 text-center">Current Stock</th>
                    <th className="px-6 py-3 text-left">Added</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No items match your search.</td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-400 text-xs">{item.itemCode}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-6 py-4">
                          {item.category ? (
                            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{item.category}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{item.unit}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`${stockBadgeClass(item.currentStock)} font-bold text-sm px-3 py-1 rounded-full`}>
                            {item.currentStock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {new Date(item.createdAt).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            id={`btn-use-${item.itemCode}`}
                            onClick={() => { setSelectedItem(item); useModalRef.current?.showModal() }}
                            disabled={item.currentStock === 0}
                            className="bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 font-semibold text-xs px-3 py-1.5 rounded-lg transition-all"
                          >
                            Use Item
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Item Modal ─────────────────────────────────────────────────── */}
      <dialog ref={addRef} id="modal-add-item" className="modal">
        <div className="modal-box rounded-2xl max-w-md p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Add New Item</h2>
              <p className="text-slate-400 text-xs">Initial stock will be 0. Use Procurement Logs to add stock.</p>
            </div>
          </div>

          <form onSubmit={addForm.handleSubmit(handleAdd)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Item Name <span className="text-red-500">*</span></label>
              <input
                id="input-item-name"
                {...addForm.register("name", { required: true })}
                className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. A4 Paper, Marker Pen, Cleaning Fluid"
              />
              {addForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">Name is required.</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Unit <span className="text-red-500">*</span></label>
              <input
                id="input-item-unit"
                {...addForm.register("unit", { required: true })}
                className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. pcs, box, liter, rim"
              />
              {addForm.formState.errors.unit && <p className="text-red-500 text-xs mt-1">Unit is required.</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Category <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                id="input-item-category"
                {...addForm.register("category")}
                className="text-black w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="e.g. Office Supplies, Maintenance, Cleaning"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { addRef.current?.close(); addForm.reset() }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                id="btn-submit-add-item"
                type="submit"
                disabled={postFn.loading}
                className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-blue-200"
              >
                {postFn.loading ? <span className="loading loading-spinner loading-xs" /> : "Save Item"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* ── Use Item Modal ─────────────────────────────────────────────────── */}
      <dialog ref={useModalRef} id="modal-use-item" className="modal">
        <div className="modal-box rounded-2xl max-w-md p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6.75 6.75h2.25v2.25H6.75V6.75zm3 0h2.25v2.25h-2.25V6.75zm3 0h2.25v2.25h-2.25V6.75zm-6 3h2.25v2.25H6.75v-2.25zm3 0h2.25v2.25h-2.25v-2.25zm3 0h2.25v2.25h-2.25v-2.25zm-6 3h2.25v2.25H6.75v-2.25zm3 0h2.25v2.25h-2.25v-2.25z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Use Item</h2>
              <p className="text-slate-400 text-xs">Decrement stock for {selectedItem?.name}.</p>
            </div>
          </div>

          <form onSubmit={useFormRef.handleSubmit(handleUse)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">
                Quantity to Use <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-slate-400">Available: {selectedItem?.currentStock} {selectedItem?.unit}</span>
              </label>
              <input
                id="input-use-qty"
                type="number"
                {...useFormRef.register("qty", {
                  required: true,
                  min: 1,
                  max: selectedItem?.currentStock
                })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-black text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="How many items are being used?"
              />
              {useFormRef.formState.errors.qty && (
                <p className="text-red-500 text-xs mt-1">
                  {useFormRef.formState.errors.qty.type === "max" ? "Cannot use more than available stock." : "Quantity is required (min 1)."}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Note / Reason <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                id="input-use-note"
                {...useFormRef.register("note")}
                className="w-full text-black border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 h-24 resize-none"
                placeholder="What is this item being used for?"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { useModalRef.current?.close(); useFormRef.reset(); setSelectedItem(null) }}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-xl py-2.5 hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                id="btn-submit-use-item"
                type="submit"
                disabled={useFn.loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 transition-colors text-sm shadow-lg shadow-amber-200"
              >
                {useFn.loading ? <span className="loading loading-spinner loading-xs" /> : "Confirm Usage"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button onClick={() => setSelectedItem(null)}>close</button></form>
      </dialog>
    </>
  )
}

