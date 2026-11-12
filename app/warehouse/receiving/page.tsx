
"use client"

import useFetch from "@/hooks/useFetch"
import useAuth from "@/store/auth"
import { usePermission } from "@/hooks/usePermission"
import Link from "next/link"
import React, { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"

type Product = {
  _id?: string
  name?: string
  productName?: string
  unit?: string
  saleUnit?: string
  conversionRatioX?: string
  conversionRatioY?: string
  conversionType?: string
  conversionValue?: number
  haveExpiredDate?: boolean
}

type PurchaseItem = {
  product?: Product
  quantity: number
  receivedQty?: number
}

type Purchase = {
  _id: string
  date: string
  purchaseOrderNumber: string
  quantity: number
  receivedQty?: number
  status: string
  product?: Product
  supplier?: {
    bussinessName?: string
  }
  customSupplier?: string
  items?: PurchaseItem[]
  [key: string]: any
}

type ReceiveForm = {
  _id: string
  productId?: string
  product: string
  supplier: string
  status: string
  receivedQty: string | number
  max: number
  purchaseOrderNumber: string
  saveAs: string
  assetCategoryId: string
  locationId: string
  receivedDate: string
  expiryDate?: string
  batchNumber?: string
  warehouseId?: string
}

const today = () => new Date().toISOString().slice(0, 10)

const getProductName = (product?: Product) =>
  product?.productName || product?.name || "-"

const getUnit = (product?: Product) =>
  product?.conversionRatioX || typeof product?.unit === 'string' ? product?.unit : product?.unit?.symbol || ""

const getSaleUnit = (product?: Product) =>
  product?.conversionRatioY || typeof product?.saleUnit === 'string' ? product?.saleUnit : getUnit(product)

const hasConversion = (product?: Product) =>
  product?.conversionType === "value" && !!product?.conversionValue

const getRemaining = (item: PurchaseItem) =>
  (item.quantity || 0) - (item.receivedQty || 0)

const hasItems = (purchase?: Purchase | null) =>
  Array.isArray(purchase?.items) && purchase.items.length > 0

const isMultiItem = (purchase: Purchase) =>
  hasItems(purchase) && purchase.items!.length > 1

const getItems = (purchase: Purchase): PurchaseItem[] =>
  purchase.items?.length ? purchase.items : [{
    product: purchase.product,
    quantity: purchase.quantity,
    receivedQty: purchase.receivedQty
  }]

export default function Receiving() {
  const loggedIn = useAuth(state => state.loggedIn)
  const isSuperAdmin = useAuth(state => state.isSuperAdmin)
  const masterAccountId = useAuth(state => state.masterAccountId)
  const locationId = useAuth(state => state.locationId)
  const hasHydrated = useAuth(state => state._hasHydrated)
  const userId = useAuth(state => state.userId)

  const { canCreate } = usePermission()

  const [warehouses, setWarehouses] = useState<any[]>([])
  const [assetCategories, setAssetCategories] = useState<any[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [search, setSearch] = useState("")
  const [purchaseType, setPurchaseType] = useState("product")

  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState(0)

  const [selectedPr, setSelectedPr] = useState<Purchase | null>(null)
  const [showItemsModal, setShowItemsModal] = useState(false)

  const editRef = useRef<HTMLDialogElement>(null)

  const editPrForm = useForm<ReceiveForm>()

  const saveAsWatch = editPrForm.watch("saveAs")

  const editFn = useFetch<any, any>({
    url: "/api/web/purchases",
    method: "PUT",
    onError: message => alert(message)
  })

  const getFn = useFetch<any[], any>({
    url: "",
    method: "GET"
  })

  const fetchWarehousesFn = useFetch<any[], any>({
    url: "",
    method: "GET"
  })

  // ============================================================
  // Purchase helpers
  // ============================================================

  const getPurchaseItem = (purchase: Purchase, index: number) =>
    getItems(purchase)[index]

  const getPurchaseRemaining = (purchase: Purchase, index: number) =>
    getRemaining(getPurchaseItem(purchase, index))

  const getTotalQuantity = (purchase: Purchase) =>
    getItems(purchase).reduce((total, item) => total + (item.quantity || 0), 0)

  const getTotalReceived = (purchase: Purchase) =>
    getItems(purchase).reduce((total, item) => total + (item.receivedQty || 0), 0)

  const isCompleted = (purchase: Purchase) =>
    getItems(purchase).every(item => getRemaining(item) <= 0)

  // ============================================================
  // Modal
  // ============================================================

  function openItemsModal(purchase: Purchase) {
    setSelectedPr(purchase)
    setShowItemsModal(true)
  }

  function openReceiveModal(purchase: Purchase, itemIndex = 0) {
    const item = getPurchaseItem(purchase, itemIndex)

    if (!item) return

    const product = item.product
    const remaining = getRemaining(item)

    if (remaining <= 0) return

    setActivePurchase(purchase)
    setSelectedItemIndex(itemIndex)

    editPrForm.reset({
      _id: purchase._id,
      productId: product?._id,
      product: getProductName(product),
      supplier: purchase.supplier?.bussinessName ?? purchase.customSupplier ?? "",
      status: purchase.status,
      receivedQty: "",
      max: remaining,
      purchaseOrderNumber: purchase.purchaseOrderNumber,
      saveAs: "inventory",
      assetCategoryId: "",
      locationId: locationId || "",
      receivedDate: today()
    })

    editRef.current?.showModal()
  }

  function closeItemsModal() {
    setShowItemsModal(false)
  }

  function handleReceiveItem(purchase: Purchase, index: number) {
    closeItemsModal()
    openReceiveModal(purchase, index)
  }

  // ============================================================
  // Receiving
  // ============================================================

  async function editSubmit(data: ReceiveForm) {
    const qty = Number(data.receivedQty)

    if (!Number.isInteger(qty) || qty <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    if (qty > data.max) {
      alert(`Quantity cannot exceed remaining: ${data.max}`)
      return
    }

    const receivedDate = data.receivedDate || today()

    const {
      max,
      product,
      supplier,
      ...rest
    } = data

    const payload = {
      ...rest,
      isOpening: false,
      createdAt: receivedDate,
      outQty: 0,
      receivedDate,
      qty,
      userId,
      ...(locationId ? { locationId } : {}),
      ...(hasItems(activePurchase) ? {
        itemIndex: selectedItemIndex
      } : {})
    }

    await editFn.fn("", JSON.stringify(payload), () => {
      setPurchases(previous =>
        previous.map(purchase => {
          if (purchase._id !== data._id) return purchase

          if (!isMultiItem(purchase)) {
            return {
              ...purchase,
              receivedQty: (purchase.receivedQty || 0) + qty
            }
          }

          const items = getItems(purchase).map((item, index) =>
            index === selectedItemIndex
              ? {
                ...item,
                receivedQty: (item.receivedQty || 0) + qty
              }
              : item
          )

          return {
            ...purchase,
            items,
            receivedQty: items.reduce(
              (total, item) => total + (item.receivedQty || 0),
              0
            )
          }
        })
      )

      editRef.current?.close()
      window.location.href = '/warehouse/receiving'
    })
  }

  // ============================================================
  // Fetch
  // ============================================================

  useEffect(() => {
    if (!hasHydrated) return

    const body = JSON.stringify({})

    const purchaseUrl =
      `/api/web/purchases?id=${masterAccountId}&type=${purchaseType}`

    const warehouseUrl =
      `/api/web/warehouse?id=${masterAccountId}&lId=${locationId}`

    fetch(`/api/web/asset-categories?id=${masterAccountId}`)
      .then(response => response.json())
      .then(result => setAssetCategories(result.result || []))

    fetchWarehousesFn.fn(warehouseUrl, body, setWarehouses)
    getFn.fn(purchaseUrl, body, setPurchases)
  }, [hasHydrated, masterAccountId, locationId, purchaseType])

  // ============================================================
  // Synchronize selected purchase
  // ============================================================

  useEffect(() => {
    if (!selectedPr) return

    const updated = purchases.find(
      purchase => purchase._id === selectedPr._id
    )

    if (updated) setSelectedPr(updated)
  }, [purchases, selectedPr?._id])

  // ============================================================
  // Display data
  // ============================================================

  const displayedPurchases = purchases.filter(purchase => {
    const matchesSearch =
      !search ||
      purchase.purchaseOrderNumber
        ?.toLowerCase()
        .includes(search.toLowerCase())

    return purchase.status !== "void" && matchesSearch
  })

  const canReceive = canCreate("/warehouse/receiving")

  // ============================================================
  // Product cell
  // ============================================================

  function renderProduct(product?: Product) {
    const unit = getUnit(product)
    const saleUnit = getSaleUnit(product)
    const conversion = hasConversion(product)

    return (
      <>
        {getProductName(product)}

        {conversion && (
          <span className="ml-2 text-[9px] font-bold uppercase bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 whitespace-nowrap">
            Conv. Value
          </span>
        )}
      </>
    )
  }

  // ============================================================
  // Purchase row
  // ============================================================

  function renderPurchaseRow(purchase: Purchase) {
    const multi = isMultiItem(purchase)
    const items = getItems(purchase)

    const totalQuantity = getTotalQuantity(purchase)
    const totalReceived = getTotalReceived(purchase)
    const completed = isCompleted(purchase)

    const item = items[0]
    const product = item?.product

    const unit = getUnit(product)
    const saleUnit = getSaleUnit(product)
    const conversion = hasConversion(product)

    const receiveAction = (
      <button
        type="button"
        disabled={
          purchase.status !== "ordered" ||
          completed
        }
        onClick={() => openReceiveModal(purchase)}
        title="Receive"
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
    )

    return (
      <tr
        key={purchase._id}
        className={multi ? "bg-blue-50/40" : ""}
      >
        <td>{new Date(purchase.date).toLocaleString("id-ID")}</td>

        <td>{purchase.purchaseOrderNumber}</td>

        <td className="font-medium">
          {multi ? (
            <button
              type="button"
              onClick={() => openItemsModal(purchase)}
              className="text-blue-700 hover:underline font-medium"
            >
              View Items ({items.length})
            </button>
          ) : (
            renderProduct(product)
          )}
        </td>

        <td>
          {totalQuantity} {!multi && unit}
        </td>

        <td>
          <Link
            href={{
              pathname: "/warehouse/rlog",
              query: {
                so: purchase.purchaseOrderNumber,
                type: purchaseType
              }
            }}
            className="text-blue-700 hover:underline"
          >
            {totalReceived} {!multi && unit}
          </Link>
        </td>

        <td className="text-xs text-slate-500 whitespace-nowrap">
          {!multi && conversion ? (
            <span className="bg-orange-50 text-orange-700 border border-orange-200 rounded px-1.5 py-0.5 font-mono">
              1 {unit} = {product?.conversionValue} {saleUnit}
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </td>

        <td>
          {canReceive && (
            multi ? (
              completed && (
                <span className="text-green-600 text-xs font-medium">
                  Completed
                </span>
              )
            ) : (
              receiveAction
            )
          )}
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Receiving</span>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">

          {/* Toolbar */}
          <div className="flex flex-row flex-wrap gap-4 items-center">

            <div className="tabs tabs-boxed bg-gray-100">
              <button
                type="button"
                className={`tab ${purchaseType === "product" ? "tab-active bg-blue-900 text-white" : ""}`}
                onClick={() => setPurchaseType("product")}
              >
                Products
              </button>

              <button
                type="button"
                className={`tab ${purchaseType === "procurement" ? "tab-active bg-blue-900 text-white" : ""}`}
                onClick={() => setPurchaseType("procurement")}
              >
                Procurement
              </button>
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
                defaultValue={today()}
                type="date"
                className="toolbar-search"
              />

              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                type="search"
                placeholder="Search"
                className="toolbar-search"
              />
            </div>
          </div>

          {/* Purchase table */}
          {getFn.loading ? (
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl" />
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
                    <th>...</th>
                  </tr>
                </thead>

                <tbody>
                  {displayedPurchases.map(renderPurchaseRow)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          Multi-item modal
      ======================================================== */}

      <dialog
        className={`modal text-black ${showItemsModal ? "modal-open" : ""}`}
        onClose={closeItemsModal}
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
              onClick={closeItemsModal}
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
                    {getItems(selectedPr).length}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Quantity</p>
                  <p className="text-xl font-semibold">
                    {getTotalQuantity(selectedPr)}
                  </p>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Total Received</p>
                  <p className="text-xl font-semibold">
                    {getTotalReceived(selectedPr)}
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
                    {getItems(selectedPr).map((item, index) => {
                      const product = item.product
                      const unit = getUnit(product)
                      const saleUnit = getSaleUnit(product)
                      const conversion = hasConversion(product)

                      const remaining = getRemaining(item)
                      const completed = remaining <= 0

                      return (
                        <tr key={`${selectedPr._id}-${index}`}>
                          <td className="text-left font-medium">
                            {renderProduct(product)}
                          </td>

                          <td>
                            {item.quantity} {unit}
                          </td>

                          <td>
                            <Link
                              href={{
                                pathname: "/warehouse/rlog",
                                query: {
                                  so: selectedPr.purchaseOrderNumber,
                                  type: purchaseType
                                }
                              }}
                              className="text-blue-700 hover:underline"
                            >
                              {item.receivedQty || 0} {unit}
                            </Link>
                          </td>

                          <td className={
                            completed
                              ? "text-green-600"
                              : "text-orange-600"
                          }>
                            {remaining} {unit}
                          </td>

                          <td className="text-xs whitespace-nowrap">
                            {conversion
                              ? `1 ${unit} = ${product?.conversionValue} ${saleUnit}`
                              : "—"
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
                            {canReceive && (
                              <button
                                type="button"
                                disabled={
                                  selectedPr.status !== "ordered" ||
                                  completed
                                }
                                onClick={() => handleReceiveItem(selectedPr, index)}
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
              onClick={closeItemsModal}
              className="btn"
            >
              Close
            </button>
          </div>

        </div>

        <div
          className="modal-backdrop"
          onClick={closeItemsModal}
        >
          <button type="button">close</button>
        </div>
      </dialog>

      {/* ========================================================
          Receive modal
      ======================================================== */}

      <dialog
        ref={editRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl">

          <div className="flex flex-col gap-4">

            <div className="flex flex-col gap-0.5">
              <span className="text-2xl font-semibold">
                Receive Items
              </span>

              {activePurchase && isMultiItem(activePurchase) && (
                <span className="text-xs text-blue-600 font-medium">
                  PR multi-item · Menerima item {selectedItemIndex + 1} dari {getItems(activePurchase).length}
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
                  <legend className="fieldset-legend">
                    Remaining (max)
                  </legend>

                  <input
                    className="input w-full bg-gray-100"
                    {...editPrForm.register("max")}
                    type="text"
                    readOnly
                  />
                </fieldset>

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">
                    Qty to Receive
                  </legend>

                  <input
                    className="input w-full"
                    {...editPrForm.register("receivedQty", {
                      required: true,
                      valueAsNumber: true,
                      min: 1,
                      max: editPrForm.getValues("max")
                    })}
                    type="number"
                    min={1}
                    max={editPrForm.getValues("max")}
                    placeholder="e.g. 5"
                  />
                </fieldset>
              </div>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Tanggal Penerimaan
                </legend>

                <input
                  className="input w-full"
                  {...editPrForm.register("receivedDate", {
                    required: true
                  })}
                  type="date"
                />
              </fieldset>

              {purchaseType === "procurement" && (
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

                  {saveAsWatch === "asset" && (
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">
                        Asset Category
                      </legend>

                      <select
                        className="select w-full"
                        {...editPrForm.register("assetCategoryId", {
                          required: saveAsWatch === "asset"
                        })}
                      >
                        <option value="">Select Category</option>

                        {assetCategories.map(category => (
                          <option
                            key={category._id}
                            value={category._id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </fieldset>
                  )}

                </div>
              )}

              {purchaseType === "product" && (
                <>
                  {activePurchase &&
                    !activePurchase.product?.haveExpiredDate &&
                    !getPurchaseItem(activePurchase, selectedItemIndex)
                      ?.product?.haveExpiredDate && (
                      <fieldset className="fieldset">
                        <legend className="fieldset-legend">
                          Expiry date
                        </legend>

                        <input
                          className="input w-full"
                          {...editPrForm.register("expiryDate")}
                          type="date"
                        />
                      </fieldset>
                    )}

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Batch number
                    </legend>

                    <input
                      className="input w-full bg-gray-100"
                      {...editPrForm.register("batchNumber")}
                      type="text"
                      readOnly
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Warehouse
                    </legend>

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
                  {editFn.loading ? "Canceling…" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={editFn.loading}
                  className="p-3 rounded-md text-white bg-blue-900 disabled:opacity-60"
                >
                  {editFn.loading ? "Saving…" : "Confirm Receive"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
