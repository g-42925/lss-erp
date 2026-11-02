
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import Link from "next/link"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useForm, useWatch } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Edit03Icon,
  CheckmarkCircle01Icon,
  MultiplicationSignIcon,
  ArrowLeftRightIcon
} from "@hugeicons/core-free-icons"

export default function PurchasesApproval() {
  const user = useAuth((state) => state.userId)
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const editRef = useRef<HTMLDialogElement>(null)
  const _editRef = useRef<HTMLDialogElement>(null)
  const itemRef = useRef<HTMLDialogElement>(null)

  const [pr, setPr] = useState<any[]>([])
  const [filterType, setFilterType] = useState("product")
  const [searchTerm, setSearchTerm] = useState("")
  const [approvingAll, setApprovingAll] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)

  const editPrForm = useForm()
  const router = useRouter()

  const type = useWatch({
    control: editPrForm.control,
    name: "type"
  })

  const currentStatus = useWatch({
    control: editPrForm.control,
    name: "currentStatus"
  })

  const getFn = useFetch<any[], any>({
    url: "",
    method: "GET",
    onError: (message) => alert(message)
  })

  const editFn = useFetch<any, any>({
    url: "/api/web/purchases",
    method: "PUT",
    onError: (message) => alert(message)
  })

  // Sinkronkan perubahan data ke tabel.
  function updatePurchase(id: string, patch: any) {
    setPr((items) =>
      items.map((item) =>
        item._id === id ? { ...item, ...patch } : item
      )
    )
  }

  // Tampilkan modal detail item.
  function showPurchaseItems(purchase: any) {
    setSelectedPurchase(purchase)
    itemRef.current?.showModal()
  }

  // Data yang ditampilkan mengikuti kata pencarian.
  const displayedPurchases = searchTerm.trim()
    ? pr.filter((purchase) => {
      if (filterType === "service") {
        return purchase.description?.toLowerCase().includes(searchTerm.trim().toLowerCase())
      }

      if (Array.isArray(purchase.items) && purchase.items.length > 0) {
        return purchase.items.some((it: any) =>
          (it.product?.productName || it.product?.name || "")
            .toLowerCase()
            .includes(searchTerm.trim().toLowerCase())
        )
      }

      const name = purchase.product?.productName || purchase.product?.name || ""
      return name.toLowerCase().includes(searchTerm.trim().toLowerCase())
    })
    : pr

  // Ambil data saat kategori atau akun berubah.
  useEffect(() => {
    if (!hasHydrated) return

    setPr([])
    setSearchTerm("")

    const url = `/api/web/purchases?id=${masterAccountId}&type=${filterType}`

    getFn.fn(url, JSON.stringify({}), (result) => {
      setPr(Array.isArray(result) ? result : [])
    })
  }, [hasHydrated, masterAccountId, filterType])

  // Approve semua procurement yang masih requested.
  async function approveAll() {
    if (filterType !== "procurement" || approvingAll) return

    const pending = pr.filter((purchase) => purchase.status === "requested")

    if (!pending.length) {
      alert("Tidak ada permintaan yang perlu disetujui")
      return
    }

    if (!confirm(`Setujui semua ${pending.length} permintaan?`)) return

    setApprovingAll(true)

    try {
      for (const purchase of pending) {
        const payload = JSON.stringify({
          _id: purchase._id,
          action: "approve_pr",
          userId: user
        })

        await editFn.fn("", payload, (result) => {
          updatePurchase(purchase._id, {
            ...(result?._id === purchase._id ? result : {}),
            status: "approved"
          })
        })
      }
    } catch (error) {
      console.error("Gagal menyetujui procurement:", error)
      alert("Terjadi kesalahan saat menyetujui procurement")
    } finally {
      setApprovingAll(false)
    }
  }

  async function editSubmit(data: any) {
    const payload = JSON.stringify(
      data.status === "approved"
        ? {
          ...data,
          approvedBy: user,
          approvedAt: new Date()
        }
        : data
    )

    await editFn.fn("", payload, (result) => {
      updatePurchase(data._id, {
        ...data,
        ...(result?._id === data._id ? result : {})
      })

      editRef.current?.close()
    })
  }

  async function approve(id: string) {
    const payload = JSON.stringify({
      _id: id,
      action: "approve_pr",
      userId: user
    })

    await editFn.fn("", payload, (result) => {
      updatePurchase(id, {
        ...(result?._id === id ? result : {}),
        status: "approved"
      })
    })
  }

  async function reject(id: string) {
    if (!confirm("Yakin ingin menolak permintaan ini?")) return

    const payload = JSON.stringify({
      _id: id,
      action: "reject_pr",
      userId: user
    })

    await editFn.fn("", payload, (result) => {
      updatePurchase(id, {
        ...(result?._id === id ? result : {}),
        status: "rejected"
      })
    })
  }

  async function _edit(id: string) {
    const purchase = pr.find((item) => item._id === id)
    if (!purchase) return

    editPrForm.reset({
      _id: purchase._id,
      quantity: purchase.quantity,
      finalPrice: purchase.finalPrice,
      product:
        filterType === "service"
          ? purchase.description
          : purchase.product?.productName ||
          purchase.product?.name ||
          "Unknown Product",
      currPayAmt: purchase.payAmount,
      payAmount: purchase.payAmount,
      supplierId: purchase.supplierId,
      vendorId: purchase.vendorId,
      type: "payment",
      payDate: new Date().toISOString().split("T")[0]
    })

    _editRef.current?.showModal()
  }

  async function edit(id: string) {
    const purchase = pr.find((item) => item._id === id)
    if (!purchase) return

    const isMultiItem = Array.isArray(purchase.items) && purchase.items.length > 0

    const productLabel = filterType === "service"
      ? purchase.description
      : isMultiItem
        ? purchase.items.map((it: any) =>
          it.product?.productName || it.product?.name || "?"
        ).join(", ")
        : purchase.product?.productName || purchase.product?.name || "Unknown Product"

    editPrForm.reset({
      _id: purchase._id,
      description: purchase.description,
      finalPrice: purchase.finalPrice,
      product: productLabel,
      status: purchase.status,
      currentStatus: purchase.status
    })

    editRef.current?.showModal()
  }

  async function _editSubmit(data: any) {
    const payAmount = Number(data.payAmount)
    const currPayAmt = Number(data.currPayAmt)
    const finalPrice = Number(data.finalPrice)

    if (
      !Number.isFinite(payAmount) ||
      !Number.isFinite(currPayAmt) ||
      !Number.isFinite(finalPrice)
    ) {
      alert("Pay amount tidak valid")
      return
    }

    const isInvalidPayment =
      payAmount > finalPrice || payAmount < currPayAmt

    if (isInvalidPayment && data.type !== "adjustment") {
      alert("Pay amount is invalid")
      return
    }

    const amount =
      data.type === "adjustment"
        ? payAmount
        : payAmount - currPayAmt

    const payload = JSON.stringify({
      ...data,
      status: "___approved",
      purchaseType: filterType,
      newPayAmt: amount,
      userId: user
    })

    await editFn.fn("", payload, (result) => {
      updatePurchase(data._id, {
        ...(result?._id === data._id ? result : {}),
        payAmount:
          result?.payAmount !== undefined
            ? result.payAmount
            : payAmount
      })

      _editRef.current?.close()
    })
  }

  if (!hasHydrated) return null

  if (!loggedIn) {
    router.push("/login")
    return null
  }

  const hasPending = pr.some(
    (purchase) => purchase.status === "requested"
  )

  return (
    <>
      <div className="min-h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="page-title">Purchases Approval</span>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">

          {/* Toolbar */}
          <div className="sticky top-0 z-30 bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "product", label: "Barang" },
                  { value: "service", label: "Jasa" },
                  { value: "procurement", label: "Procurement" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilterType(value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${filterType === value
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <input
                  type="search"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="toolbar-search min-w-0 flex-1 sm:max-w-xs"
                />

                {filterType === "procurement" && (
                  <button
                    type="button"
                    onClick={approveAll}
                    disabled={approvingAll || !hasPending}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={18}
                      color="currentColor"
                    />
                    {approvingAll ? "Approving..." : "Approve All"}
                  </button>
                )}

                <button
                  type="button"
                  className="rounded-full bg-black p-3 text-white"
                >
                  <Link href="">
                    <HugeiconsIcon
                      icon={ArrowLeftRightIcon}
                      size={24}
                      color="currentColor"
                      strokeWidth={1.5}
                    />
                  </Link>
                </button>
              </div>
            </div>
          </div>

          {/* Loading, error, atau tabel */}
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
                    <th>Date</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Pay Amount</th>
                    <th>Supplier/Vendor</th>
                    <th>Received</th>
                    <th>Status</th>
                    {filterType !== "service" && <th>Approval</th>}
                    {filterType !== "service" && <th>Voidment</th>}
                    <th>...</th>
                  </tr>
                </thead>

                <tbody>
                  {displayedPurchases.map((purchase) => {
                    const hasItems =
                      Array.isArray(purchase.items) &&
                      purchase.items.length > 0

                    const isMultiItem = hasItems && purchase.items.length > 1

                    const itemName =
                      filterType === "service"
                        ? purchase.description
                        : hasItems
                          ? purchase.items.length === 1
                            ? purchase.items[0].product?.productName ||
                            purchase.items[0].product?.name ||
                            "-"
                            : `${purchase.items.length} item`
                          : purchase.product?.productName ||
                          purchase.product?.name ||
                          "-"

                    const unit =
                      filterType === "procurement"
                        ? purchase.product?.unit
                        : purchase.product?.conversionRatioX

                    const suppName =
                      filterType === "service"
                        ? purchase.vendor?.name || "-"
                        : filterType === "procurement"
                          ? purchase.customSupplier || "-"
                          : purchase.supplier?.bussinessName ||
                          purchase.customSupplier ||
                          "-"

                    return (
                      <tr
                        key={purchase._id}
                        className={purchase.priceAlert ? "bg-red-50" : ""}
                      >
                        <td>
                          {new Date(purchase.date).toLocaleDateString("id-ID")}
                        </td>

                        {/* Product / Service */}
                        <td>
                          {isMultiItem ? (
                            <button
                              type="button"
                              onClick={() => showPurchaseItems(purchase)}
                              className="font-semibold underline underline-offset-2 hover:text-blue-900"
                            >
                              {itemName}
                            </button>
                          ) : (
                            <span>{itemName}</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td>
                          {filterType === "service"
                            ? "-"
                            : isMultiItem
                              ? (
                                <button
                                  type="button"
                                  className="font-semibold"
                                >
                                  ?
                                </button>
                              )
                              : hasItems
                                ? (() => {
                                  const item = purchase.items[0]
                                  const itemUnit =
                                    filterType === "procurement"
                                      ? item.product?.unit
                                      : item.product?.conversionRatioX

                                  return `${item.quantity}${itemUnit ? ` (${itemUnit})` : ""}`
                                })()
                                : `${purchase.quantity} (${unit || "-"})`}
                        </td>

                        {/* Price */}
                        <td>
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className={
                                purchase.priceAlert
                                  ? "font-bold text-red-700"
                                  : ""
                              }
                            >
                              {(purchase.finalPrice ?? 0).toLocaleString("id-ID")}
                            </span>

                            {purchase.priceAlert && (
                              <span className="text-[10px] text-gray-500 line-through">
                                Sebelumnya:{" "}
                                {(purchase.priceAlert.previousPrice ?? 0).toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>{purchase.payAmount}</td>
                        <td>{suppName}</td>

                        {/* Received */}
                        <td>
                          {filterType === "service"
                            ? "-"
                            : `${purchase.receivedQty || 0} (${unit || "-"})`}
                        </td>

                        <td>{purchase.status}</td>

                        {filterType !== "service" && (
                          <td>
                            <span>
                              {purchase.approvedBy?.name ?? "-"} (
                              {purchase.approvedAt
                                ? new Date(purchase.approvedAt).toLocaleDateString("id-ID")
                                : "-"}
                              )
                            </span>
                          </td>
                        )}

                        {filterType !== "service" && (
                          <td>
                            <span>
                              {purchase.voidedBy?.name ?? "-"} (
                              {purchase.voidedAt
                                ? new Date(purchase.voidedAt).toLocaleDateString("id-ID")
                                : "-"}
                              )
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        <td className="flex flex-row gap-2 justify-center">
                          {purchase.status === "requested" && (
                            <>
                              <button
                                type="button"
                                className="text-green-600"
                                onClick={() => approve(purchase._id)}
                                title="Approve"
                              >
                                <HugeiconsIcon
                                  icon={CheckmarkCircle01Icon}
                                  size={22}
                                  color="currentColor"
                                />
                              </button>

                              <button
                                type="button"
                                className="text-red-600"
                                onClick={() => reject(purchase._id)}
                                title="Reject"
                              >
                                <HugeiconsIcon
                                  icon={MultiplicationSignIcon}
                                  size={22}
                                  color="currentColor"
                                />
                              </button>
                            </>
                          )}

                          {purchase.status !== "ordered" &&
                            purchase.status !== "requested" && (
                              <button
                                type="button"
                                disabled={purchase.status === "void"}
                                onClick={() => edit(purchase._id)}
                              >
                                <HugeiconsIcon
                                  icon={Edit03Icon}
                                  size={22}
                                  color="currentColor"
                                  strokeWidth={1.5}
                                />
                              </button>
                            )}

                          {purchase.status === "xxx" && (
                            <button
                              type="button"
                              onClick={() => _edit(purchase._id)}
                              disabled
                            >
                              <HugeiconsIcon
                                icon={Edit03Icon}
                                size={22}
                                color="currentColor"
                                strokeWidth={1.5}
                              />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {displayedPurchases.length === 0 && (
                    <tr>
                      <td
                        colSpan={filterType === "service" ? 9 : 11}
                        className="py-6 text-gray-500"
                      >
                        Tidak ada data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal detail purchase items */}
      <dialog ref={itemRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="page-title">Purchase Items</span>

              <button
                type="button"
                onClick={() => itemRef.current?.close()}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-gray-500">
              {selectedPurchase?.date
                ? new Date(selectedPurchase.date).toLocaleDateString("id-ID")
                : "-"}
              {" · "}
              {selectedPurchase?.items?.length || 0} items
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="text-left">Product</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-center">Unit</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedPurchase?.items?.map((item: any, index: number) => {
                    const productName =
                      item.product?.productName ||
                      item.product?.name ||
                      "Unknown Product"

                    const itemUnit =
                      filterType === "procurement"
                        ? item.product?.unit
                        : item.product?.conversionRatioX

                    return (
                      <tr key={item._id || index}>
                        <td>{productName}</td>

                        <td className="text-center font-semibold">
                          {Number(item.quantity || 0).toLocaleString("id-ID")}
                        </td>

                        <td className="text-center">
                          {itemUnit || "-"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <th>Total</th>

                    <th className="text-center">
                      {selectedPurchase?.items
                        ?.reduce(
                          (total: number, item: any) =>
                            total + Number(item.quantity || 0),
                          0
                        )
                        .toLocaleString("id-ID") || 0}
                    </th>

                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="modal-action">
              <button
                type="button"
                onClick={() => itemRef.current?.close()}
                className="btn bg-gray-200 text-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Modal edit purchase order */}
      <dialog ref={editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col">
            <span className="page-title">Edit purchase order</span>

            <form
              onSubmit={(event) => {
                void editPrForm.handleSubmit(editSubmit)(event)
              }}
              className="flex flex-col gap-3 pb-4"
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

              {filterType !== "service" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input
                    className="input w-full"
                    {...editPrForm.register("quantity")}
                    type="text"
                    readOnly
                  />
                </fieldset>
              )}

              <fieldset className="fieldset col-span-2">
                <legend className="fieldset-legend">Price (Rp)</legend>
                <input
                  className="input w-full"
                  {...editPrForm.register("finalPrice")}
                  type="text"
                  readOnly
                />
              </fieldset>

              <input
                type="hidden"
                {...editPrForm.register("currentStatus")}
              />

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Status</legend>
                <select
                  className="input w-full"
                  {...editPrForm.register("status")}
                >
                  <option
                    value="requested"
                    disabled={currentStatus === "ordered"}
                  >
                    Pending
                  </option>

                  <option value="approved">Approved</option>

                  <option
                    value="rejected"
                    disabled={currentStatus === "ordered"}
                  >
                    Rejected
                  </option>
                </select>
              </fieldset>

              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => editRef.current?.close()}
                  className="btn p-3 rounded-md mr-2 text-black bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* Modal edit pembayaran */}
      <dialog ref={_editRef} className="modal text-black">
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col">
            <span className="page-title">
              Edit purchase order payment
            </span>

            <form
              onSubmit={(event) => {
                void editPrForm.handleSubmit(_editSubmit)(event)
              }}
              className="flex flex-col gap-3 pb-4"
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

              {filterType !== "service" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Quantity</legend>
                  <input
                    className="input w-full"
                    {...editPrForm.register("quantity")}
                    type="text"
                    readOnly
                  />
                </fieldset>
              )}

              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Tanggal Pembayaran
                </legend>

                <input
                  className="input w-full"
                  {...editPrForm.register("payDate")}
                  type="date"
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Pay amount</legend>

                <input
                  className="input w-full"
                  {...editPrForm.register("payAmount")}
                  type="number"
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Type</legend>

                <select
                  {...editPrForm.register("type")}
                  className="select w-full"
                >
                  <option value="payment">payment</option>
                  <option value="adjustment">adjustment</option>
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Payment Method</legend>

                <select
                  className="select w-full"
                  {...editPrForm.register("paymentMethod")}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="E-Wallet">E-Wallet</option>
                </select>
              </fieldset>

              {type === "adjustment" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Adjust to</legend>

                  <input
                    className="input w-full"
                    {...editPrForm.register("reference")}
                    type="text"
                  />
                </fieldset>
              )}

              {(editFn.noResult || editFn.error) && (
                <label className="input-validator text-red-900">
                  Something went wrong
                </label>
              )}

              <div className="mt-auto ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => _editRef.current?.close()}
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}
