
"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import useFetch from "@/hooks/useFetch"
import useAuth from "@/store/auth"
import Link from "next/link"
import { usePermission } from "@/hooks/usePermission"

import React, { useRef, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

export default function Receiving() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const locationId = useAuth((state) => state.locationId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const userId = useAuth((state) => state.userId)
  const { canCreate } = usePermission()

  const [warehouses, setWarehouses] = useState<any[]>([])
  const [assetCategories, setAssetCategories] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [disabled, setDisabled] = useState<boolean>(false)
  const [expiredFieldHide, setExpiredFieldHide] = useState<boolean>(false)
  const [purchaseType, setPurchaseType] = useState<string>("product")
  const [activeProduct, setActiveProduct] = useState<any>(null)

  // Receiving state
  const [activePr, setActivePr] = useState<any>(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0)

  // Multi-item modal
  const [selectedPr, setSelectedPr] = useState<any>(null)
  const [showItemsModal, setShowItemsModal] = useState(false)

  const editRef = useRef<HTMLDialogElement>(null)

  const editPrForm = useForm()
  const receivedQtyWatch = editPrForm.watch("receivedQty")
  const saveAsWatch = editPrForm.watch("saveAs")

  const router = useRouter()

  const fetchWarehousesFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const getFn = useFetch<any[], any>({
    url: '',
    method: 'GET'
  })

  const editFn = useFetch<any, any>({
    url: `/api/web/purchases`,
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  // ============================================================
  // Helpers
  // ============================================================

  function search(v: string) {
    if (v.length > 0) {
      const result = purchases.filter(
        (r) => r.purchaseOrderNumber === v
      )

      setSearchResult(result.length > 0 ? [...result] : [])
    } else {
      setSearchResult([])
    }
  }

  function getItemRemaining(pr: any, itemIndex: number): number {
    const isMultiItem = Array.isArray(pr.items) && pr.items.length > 0

    if (!isMultiItem) {
      return pr.quantity - (pr.receivedQty || 0)
    }

    const item = pr.items[itemIndex]

    if (!item) return 0

    return (item.quantity || 0) - (item.receivedQty || 0)
  }

  function isMultiItem(pr: any) {
    return Array.isArray(pr?.items) && pr.items.length > 0
  }

  function openItemsModal(pr: any) {
    setSelectedPr(pr)
    setShowItemsModal(true)
  }

  // ============================================================
  // Receiving submit
  // ============================================================

  async function editSubmit(data: any) {
    const {
      max,
      product,
      supplier,
      finalPrice,
      locationId: _loc,
      ...rest
    } = data

    const qty = parseInt(data.receivedQty)

    if (!qty || qty <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    if (qty > max) {
      alert(`Quantity cannot exceed remaining: ${max}`)
      return
    }

    const receivedDate =
      data.receivedDate || new Date().toISOString().slice(0, 10)

    const additional = {
      isOpening: false,
      createdAt: receivedDate,
      outQty: 0,
      receivedDate,
    }

    const multi = isMultiItem(activePr)

    const batch = JSON.stringify({
      ...rest,
      ...additional,
      qty,
      userId,
      ...(locationId ? { locationId } : {}),
      ...(multi ? { itemIndex: selectedItemIndex } : {}),
    })

    await editFn.fn('', batch, () => {
      setPurchases(prev =>
        prev.map(p => {
          if (p._id !== data._id) return p

          if (!multi) {
            return {
              ...p,
              receivedQty: (p.receivedQty || 0) + qty
            }
          }

          const newItems = p.items.map((it: any, idx: number) =>
            idx === selectedItemIndex
              ? {
                ...it,
                receivedQty: (it.receivedQty || 0) + qty
              }
              : it
          )

          const totalReceived = newItems.reduce(
            (s: number, it: any) => s + (it.receivedQty || 0),
            0
          )

          return {
            ...p,
            items: newItems,
            receivedQty: totalReceived
          }
        })
      )

      editRef.current?.close()
    })
  }

  // ============================================================
  // Single-item receiving
  // ============================================================

  async function edit(_id: string) {
    const filter = purchases.find(p => p._id === _id)

    if (!filter) return

    setActivePr(filter)
    setSelectedItemIndex(0)

    if (!isMultiItem(filter)) {
      if (
        purchaseType === 'product' &&
        filter.product &&
        !filter.product.haveExpiredDate
      ) {
        setExpiredFieldHide(true)
      } else {
        setExpiredFieldHide(false)
      }

      const remaining =
        filter.quantity - (filter.receivedQty || 0)

      setActiveProduct(filter.product ?? null)

      editPrForm.reset({
        ...filter,
        productId: filter.product?._id,
        product: filter.product?.productName || filter.product?.name || '',
        supplier: filter.supplier?.bussinessName ?? filter.customSupplier,
        status: filter.status,
        receivedQty: '',
        max: remaining,
        purchaseOrderNumber: filter.purchaseOrderNumber,
        saveAs: "inventory",
        assetCategoryId: "",
        locationId: locationId,
        receivedDate: new Date().toISOString().slice(0, 10),
      })
    } else {
      openMultiItemReceive(filter, 0)
      return
    }

    setDisabled(filter.status !== 'ordered')

    editRef.current?.showModal()
  }

  // ============================================================
  // Multi-item receiving
  // ============================================================

  function openMultiItemReceive(pr: any, itemIndex: number) {
    const item = pr.items[itemIndex]
    const product = item?.product

    if (!item) return

    setActivePr(pr)
    setSelectedItemIndex(itemIndex)

    if (
      purchaseType === 'product' &&
      product &&
      !product.haveExpiredDate
    ) {
      setExpiredFieldHide(true)
    } else {
      setExpiredFieldHide(false)
    }

    const remaining = getItemRemaining(pr, itemIndex)

    setActiveProduct(product ?? null)

    editPrForm.reset({
      _id: pr._id,
      productId: product?._id,
      product: product?.productName || product?.name || '',
      supplier: pr.supplier?.bussinessName ?? pr.customSupplier ?? '',
      status: pr.status,
      receivedQty: '',
      max: remaining,
      purchaseOrderNumber: pr.purchaseOrderNumber,
      saveAs: "inventory",
      assetCategoryId: "",
      locationId: locationId,
      receivedDate: new Date().toISOString().slice(0, 10),
    })

    editRef.current?.showModal()
  }

  function handleReceiveItem(pr: any, index: number) {
    setShowItemsModal(false)
    openMultiItemReceive(pr, index)
  }

  // ============================================================
  // Synchronize selected PR with purchases
  // ============================================================

  useEffect(() => {
    if (!selectedPr) return

    const updated = purchases.find(
      p => p._id === selectedPr._id
    )

    if (updated) {
      setSelectedPr(updated)
    }
  }, [purchases])

  // ============================================================
  // Fetch data
  // ============================================================

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/purchases?id=${masterAccountId}&type=${purchaseType}`
      const url3 = `/api/web/warehouse?id=${masterAccountId}&lId=${locationId}`

      const body = JSON.stringify({})

      fetch('/api/web/asset-categories?id=' + masterAccountId)
        .then(r => r.json())
        .then(j => setAssetCategories(j.result || []))

      fetchWarehousesFn.fn(url3, body, (result) => {
        setWarehouses(result)
      })

      getFn.fn(url, body, (result) => {
        setPurchases(result)
      })
    }
  }, [masterAccountId, locationId, purchaseType, hasHydrated])

  // ============================================================
  // Render purchase row
  // ============================================================

  function renderPurchaseRow(p: any, index: number) {
    const multi = isMultiItem(p)

    if (multi) {
      const totalQty = p.items.reduce(
        (s: number, it: any) => s + (it.quantity || 0), 0
      )

      const totalReceived = p.items.reduce(
        (s: number, it: any) => s + (it.receivedQty || 0), 0
      )

      const completed = p.items.every(
        (it: any) => (it.quantity || 0) - (it.receivedQty || 0) <= 0
      )

      return (
        <tr key={p._id} className="bg-blue-50/40">
          <td>{new Date(p.date).toLocaleString('id-ID')}</td>

          <td>{p.purchaseOrderNumber}</td>

          <td>
            <button
              type="button"
              onClick={() => openItemsModal(p)}
              className="text-blue-700 hover:underline font-medium"
            >
              View Items ({p.items.length})
            </button>
          </td>

          <td>{totalQty}</td>

          <td>
            <Link
              href={{
                pathname: '/warehouse/rlog',
                query: {
                  so: p.purchaseOrderNumber,
                  type: purchaseType
                }
              }}
              className="text-blue-700 hover:underline"
            >
              {totalReceived}
            </Link>
          </td>

          <td className="text-slate-300">—</td>

          <td>
            {completed && (
              <span className="text-green-600 text-xs font-medium">
                Completed
              </span>
            )}
          </td>
        </tr>
      )
    }

    const pUnit = p.product?.conversionRatioX || p.product?.unit || ''
    const sUnit = p.product?.conversionRatioY || p.product?.saleUnit || pUnit
    const isCV =
      p.product?.conversionType === 'value' &&
      p.product?.conversionValue

    return (
      <tr key={p._id}>
        <td>{new Date(p.date).toLocaleString('id-ID')}</td>

        <td>{p.purchaseOrderNumber}</td>

        <td className="font-medium">
          {p.product?.productName || p.product?.name || '-'}
          {isCV && (
            <span className="ml-2 text-[9px] font-bold uppercase bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 whitespace-nowrap">
              Conv. Value
            </span>
          )}
        </td>

        <td>{p.quantity} {pUnit}</td>

        <td>
          <Link
            href={{
              pathname: '/warehouse/rlog',
              query: {
                so: p.purchaseOrderNumber,
                type: purchaseType
              }
            }}
            className="text-blue-700 hover:underline"
          >
            {p.receivedQty || 0} {pUnit}
          </Link>
        </td>

        <td className="text-xs text-slate-500 whitespace-nowrap">
          {isCV
            ? (
              <span className="bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5 font-mono">
                1 {pUnit} = {p.product.conversionValue} {sUnit}
              </span>
            )
            : <span className="text-slate-300">—</span>
          }
        </td>

        <td>
          {canCreate("/warehouse/receiving") && (
            <button
              disabled={p.status !== 'ordered'}
              onClick={() => edit(p._id)}
              className="disabled:opacity-30 hover:opacity-70 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6"
              >
                <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
              </svg>
            </button>
          )}
        </td>
      </tr>
    )
  }

  // ============================================================
  // Displayed purchases
  // ============================================================

  const displayedPurchases = (
    searchResult.length > 0
      ? searchResult
      : purchases
  ).filter(p => p.status !== 'void')

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Receiving</span>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">

          {/* Toolbar */}
          <div className="flex flex-row flex-wrap gap-4 items-center">
            <div className="tabs tabs-boxed bg-gray-100">
              <a
                className={`tab ${purchaseType === 'product' ? 'tab-active bg-blue-900 text-white' : ''}`}
                onClick={() => setPurchaseType('product')}
              >
                Products
              </a>

              <a
                className={`tab ${purchaseType === 'procurement' ? 'tab-active bg-blue-900 text-white' : ''}`}
                onClick={() => setPurchaseType('procurement')}
              >
                Procurement
              </a>
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

            <div className="ml-auto flex flex-row gap-3">
              <input
                defaultValue={new Date().toISOString().split("T")[0]}
                onChange={() => alert('ok')}
                type="date"
                className="toolbar-search"
              />

              <input
                onKeyUp={(e) => search((e.target as HTMLInputElement).value)}
                type="search"
                placeholder="Search"
                className="toolbar-search"
              />
            </div>
          </div>

          {/* Purchase table */}
          {getFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
          ) : getFn.error || getFn.noResult ? (
            <div>
              <p>{getFn.message}</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="table text-center">
                <thead>
                  <tr>
                    <th>Purchase Date</th>
                    <th>Purchase Order Number</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Received</th>
                    <th>Conversion</th>
                    <th>...</th>
                  </tr>
                </thead>

                <tbody>
                  {displayedPurchases.map((p, index) =>
                    renderPurchaseRow(p, index)
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          Modal Multi Item
      ======================================================== */}

      <dialog
        className={`modal text-black ${showItemsModal ? 'modal-open' : ''}`}
        onClose={() => setShowItemsModal(false)}
      >
        <div className="modal-box w-11/12 max-w-5xl">

          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="text-xl font-semibold">
                Purchase Items
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {selectedPr?.purchaseOrderNumber}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowItemsModal(false)}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>

          {selectedPr && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Items</p>
                  <p className="text-xl font-semibold">
                    {selectedPr.items.length}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Quantity</p>
                  <p className="text-xl font-semibold">
                    {selectedPr.items.reduce(
                      (s: number, it: any) => s + (it.quantity || 0), 0
                    )}
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Received</p>
                  <p className="text-xl font-semibold">
                    {selectedPr.items.reduce(
                      (s: number, it: any) => s + (it.receivedQty || 0), 0
                    )}
                  </p>
                </div>

              </div>

              <div className="overflow-x-auto">
                <table className="table table-sm text-center">
                  <thead>
                    <tr>
                      <th className="text-left">Product</th>
                      <th>Quantity</th>
                      <th>Received</th>
                      <th>Remaining</th>
                      <th>Conversion</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedPr.items.map((it: any, idx: number) => {
                      const prod = it.product

                      const pUnit =
                        prod?.conversionRatioX || prod?.unit || ''

                      const sUnit =
                        prod?.conversionRatioY || prod?.saleUnit || pUnit

                      const isCV =
                        prod?.conversionType === 'value' &&
                        prod?.conversionValue

                      const remaining =
                        getItemRemaining(selectedPr, idx)

                      const completed = remaining <= 0

                      return (
                        <tr key={`${selectedPr._id}-${idx}`}>
                          <td className="text-left font-medium">
                            {prod?.productName || prod?.name || '-'}

                            {isCV && (
                              <span className="ml-2 text-[9px] font-bold uppercase bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                                Conv. Value
                              </span>
                            )}
                          </td>

                          <td>
                            {it.quantity} {pUnit}
                          </td>

                          <td>
                            <Link
                              href={{
                                pathname: '/warehouse/rlog',
                                query: {
                                  so: selectedPr.purchaseOrderNumber,
                                  type: purchaseType
                                }
                              }}
                              className="text-blue-700 hover:underline"
                            >
                              {it.receivedQty || 0} {pUnit}
                            </Link>
                          </td>

                          <td className={
                            completed
                              ? 'text-green-600'
                              : 'text-orange-600'
                          }>
                            {remaining} {pUnit}
                          </td>

                          <td className="text-xs whitespace-nowrap">
                            {isCV
                              ? `1 ${pUnit} = ${prod.conversionValue} ${sUnit}`
                              : '—'
                            }
                          </td>

                          <td>
                            {completed ? (
                              <span className="badge badge-success badge-sm">
                                Completed
                              </span>
                            ) : (
                              <span className="badge badge-warning badge-sm">
                                Pending
                              </span>
                            )}
                          </td>

                          <td>
                            {canCreate("/warehouse/receiving") && (
                              <button
                                type="button"
                                disabled={
                                  selectedPr.status !== 'ordered' ||
                                  completed
                                }
                                onClick={() =>
                                  handleReceiveItem(selectedPr, idx)
                                }
                                className="btn btn-xs btn-primary disabled:opacity-30"
                              >
                                Receive
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="modal-action">
            <button
              type="button"
              onClick={() => setShowItemsModal(false)}
              className="btn"
            >
              Close
            </button>
          </div>

        </div>

        <div
          className="modal-backdrop"
          onClick={() => setShowItemsModal(false)}
        >
          <button type="button">close</button>
        </div>
      </dialog>

      {/* ========================================================
          Modal Receive
      ======================================================== */}

      <dialog
        id="my_modal_2"
        ref={editRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl">

          <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold">
                Receive Items
              </span>

              {activePr && isMultiItem(activePr) && (
                <span className="text-xs text-blue-600 font-medium">
                  PR multi-item · Menerima item {selectedItemIndex + 1} dari {activePr.items.length}
                </span>
              )}
            </div>

            <form
              onSubmit={editPrForm.handleSubmit(editSubmit)}
              className="flex flex-col gap-3"
            >

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Product</legend>
                <input
                  className="input w-full"
                  {...editPrForm.register("product")}
                  type="text"
                  readOnly
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Supplier</legend>
                <input
                  className="input w-full"
                  {...editPrForm.register("supplier")}
                  type="text"
                  readOnly
                />
              </fieldset>

              <div className="flex flex-row gap-3">
                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Remaining (max)</legend>
                  <input
                    className="input w-full bg-gray-100"
                    {...editPrForm.register("max")}
                    type="text"
                    readOnly
                  />
                </fieldset>

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">Qty to Receive</legend>
                  <input
                    className="input w-full"
                    {...editPrForm.register("receivedQty", {
                      required: true,
                      min: 1
                    })}
                    type="number"
                    min={1}
                    max={editPrForm.getValues("max")}
                    placeholder="e.g. 5"
                  />
                </fieldset>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Tanggal Penerimaan</legend>
                <input
                  className="input w-full"
                  {...editPrForm.register("receivedDate", {
                    required: true
                  })}
                  type="date"
                />
              </fieldset>

              {purchaseType === 'procurement' && (
                <div className="flex flex-col gap-3 border p-4 rounded-md mt-2">

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Save As</legend>
                    <select
                      className="select w-full"
                      {...editPrForm.register("saveAs")}
                    >
                      <option value="inventory">Inventory Item</option>
                      <option value="asset">Company Asset</option>
                    </select>
                  </fieldset>

                  {saveAsWatch === 'asset' && (
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Asset Category</legend>
                      <select
                        className="select w-full"
                        {...editPrForm.register("assetCategoryId", {
                          required: saveAsWatch === 'asset'
                        })}
                      >
                        <option value="">Select Category</option>

                        {assetCategories.map(c => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  )}

                </div>
              )}

              {purchaseType === 'product' && !expiredFieldHide && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Expiry date</legend>
                  <input
                    className="input w-full"
                    {...editPrForm.register("expiryDate")}
                    type="date"
                  />
                </fieldset>
              )}

              {purchaseType === 'product' && (
                <>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Batch number</legend>
                    <input
                      className="input w-full bg-gray-100"
                      {...editPrForm.register("batchNumber")}
                      type="text"
                      readOnly
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Warehouse</legend>
                    <select
                      {...editPrForm.register("warehouseId", {
                        required: true
                      })}
                      className="select w-full"
                    >
                      <option value="">Select Warehouse</option>

                      {warehouses.map(warehouse => (
                        <option
                          value={warehouse._id}
                          key={warehouse._id}
                        >
                          {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </fieldset>
                </>
              )}

              <input
                type="hidden"
                {...editPrForm.register("locationId")}
              />

              {editFn.error && (
                <p className="text-red-600 text-sm">
                  {editFn.message}
                </p>
              )}

              <div className="flex flex-row gap-2 justify-end mt-2">
                <button
                  type="button"
                  className="p-3 rounded-md text-gray-700 bg-gray-200"
                  onClick={() => editRef.current?.close()}
                >
                  {editFn.loading ? 'Canceling…' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={editFn.loading}
                  className="p-3 rounded-md text-white bg-blue-900 disabled:opacity-60"
                >
                  {editFn.loading ? 'Saving…' : 'Confirm Receive'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

type Failed = {
  message: string
}
