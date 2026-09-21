/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
"use client"

import Link from "next/link"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import withAuth from "@/hofs/withAuth"
import { Controller, useForm } from "react-hook-form"
import { NumericFormat } from "react-number-format"
import { useRef, useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CoinsDollarIcon,
  Edit03Icon,
  Cancel02Icon,
  CheckmarkCircle01Icon,
  MultiplicationSignIcon,
  BadgePercentIcon,
} from "@hugeicons/core-free-icons"

function Purchases() {
  const user = useAuth((state) => state.userId)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const orderRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)
  const taxRef = useRef<HTMLDialogElement>(null)

  const [filterType, setFilterType] = useState<string>("product")
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [pr, setPr] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [taxes, setTaxes] = useState<any[]>([])
  const [selectedPrForTax, setSelectedPrForTax] = useState<any>(null)

  const bankAccount = useFetch<any[], any>({
    url: "",
    method: "GET",
    onError: (message) => alert(message),
  })

  const getProductsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getSuppliersFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getItemsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getVendorsFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getTaxesFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const getFn = useFetch<any[], any>({
    url: "",
    method: "GET",
  })

  const addFn = useFetch<any, any>({
    url: "/api/web/purchases",
    method: "POST",
    onError: (message) => alert(message),
  })

  const editFn = useFetch<any, any>({
    url: "/api/web/purchases",
    method: "PUT",
    onError: (message) => alert(message),
  })

  const editForm = useForm()
  const orderForm = useForm()

  const newPrForm = useForm({
    defaultValues: {
      finalPrice: "",
      description: "",
      quantity: "",
      vendorId: "",
      productId: "",
    },
  })

  const taxForm = useForm()

  const watchPayAmount = orderForm.watch("payAmount")
  const watchTaxFormTaxIds = taxForm.watch("taxIds") || []

  function getPurchaseName(purchase: any) {
    return (
      purchase.description ||
      purchase.product?.productName ||
      purchase.product?.name ||
      "-"
    )
  }

  function getSupplierVendorName(purchase: any) {
    if (filterType === "service") {
      return purchase.vendor?.name || "-"
    }

    if (filterType === "procurement") {
      return purchase.customSupplier || "-"
    }

    return (
      purchase?.supplier?.bussinessName ||
      purchase?.customSupplier ||
      "-"
    )
  }

  function getUnit(purchase: any) {
    if (filterType === "procurement") {
      return purchase.product?.unit || "-"
    }

    return purchase.product?.conversionRatioX || "-"
  }

  function getGrossPrice(purchase: any) {
    return (
      parseFloat(
        purchase?.grossFinalPrice ||
        purchase?.finalPrice ||
        0
      ) || 0
    )
  }

  function calculateTaxes(
    grossPrice: number,
    taxIds: string[]
  ) {
    let netPrice = grossPrice
    let totalDeduction = 0
    let totalAddition = 0

    const appliedTaxes = taxIds
      .map((taxId) => {
        const tax = taxes.find((item) => item._id === taxId)

        if (!tax) return null

        const amount = Math.round(
          (tax.value / 100) * grossPrice
        )

        const isPPh = Boolean(tax.isPPh)

        if (isPPh) {
          netPrice -= amount
          totalDeduction += amount
        } else {
          netPrice += amount
          totalAddition += amount
        }

        return {
          taxId: tax._id,
          name: tax.name,
          rate: tax.value,
          isPPh,
          amount,
          type: isPPh ? "deduction" : "addition",
        }
      })
      .filter(Boolean)

    return {
      netPrice,
      totalDeduction,
      totalAddition,
      appliedTaxes,
    }
  }

  function getTaxPreview() {
    if (!selectedPrForTax) return null

    const grossPrice = getGrossPrice(selectedPrForTax)

    return calculateTaxes(
      grossPrice,
      watchTaxFormTaxIds
    )
  }

  async function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      status: "requested",
      id: masterAccountId,
      date: new Date(),
      purchaseType: filterType,
      createdBy: user,
    })

    addFn.fn("", body, (result) => {
      if (
        filterType === "service" &&
        data.vendorId &&
        vendors.length > 0
      ) {
        result.vendor = vendors.find(
          (vendor) => vendor._id === data.vendorId
        )
      }

      setPr((current) => [...current, result])
      modalRef.current?.close()
      newPrForm.reset()
    })
  }

  function search(value: string) {
    if (!value.length) {
      setSearchResult([])
      return
    }

    const keyword = value.toLowerCase()

    const result = pr.filter((purchase) => {
      const name =
        filterType === "service"
          ? purchase.description
          : purchase.product?.productName ||
          purchase.product?.name ||
          ""

      const poNumber =
        purchase.purchaseOrderNumber || ""

      return (
        name.toLowerCase().includes(keyword) ||
        poNumber.toLowerCase().includes(keyword)
      )
    })

    setSearchResult(result)
  }

  async function editSubmit(data: any) {
    const target = pr.find(
      (purchase) => purchase._id === data._id
    )

    if (!target) return

    const payload = JSON.stringify({
      ...data,
      action:
        filterType === "service"
          ? undefined
          : "edit_pr",
      status: "requested",
    })

    await editFn.fn("", payload, (result) => {
      if (filterType === "product") {
        window.location.reload()
        return
      }

      if (filterType === "procurement") {
        const product = items.find(
          (item) => item._id === data.productId
        )

        target.product = product
        target.quantity = result.quantity
        target.finalPrice = result.finalPrice

        setPr([...pr])
        editRef.current?.close()
        return
      }

      if (filterType === "service") {
        target.description = data.description
        target.finalPrice = data.finalPrice
        target.vendorId = data.vendorId
        target.vendor =
          vendors.find(
            (vendor) => vendor._id === data.vendorId
          ) || target.vendor

        setPr([...pr])
        editRef.current?.close()
      }
    })
  }

  function openApplyTax(purchase: any) {
    setSelectedPrForTax(purchase)

    const appliedTaxIds =
      purchase.appliedTaxes?.map(
        (tax: any) => tax.taxId
      ) || []

    taxForm.reset({
      taxIds: appliedTaxIds,
    })

    taxRef.current?.showModal()
  }

  async function applyTaxSubmit(data: any) {
    if (!selectedPrForTax) return

    const grossPrice = getGrossPrice(
      selectedPrForTax
    )

    const taxIds = data.taxIds || []

    const {
      netPrice,
      totalDeduction,
      totalAddition,
      appliedTaxes,
    } = calculateTaxes(grossPrice, taxIds)

    const confirmed = confirm(
      `Apply ${appliedTaxes.length} tax(es)?\n` +
      `Total Potongan: Rp ${totalDeduction.toLocaleString("id-ID")}\n` +
      `Total Tambahan: Rp ${totalAddition.toLocaleString("id-ID")}\n` +
      `Final price akan menjadi Rp ${netPrice.toLocaleString("id-ID")}.`
    )

    if (!confirmed) return

    const payload = JSON.stringify({
      _id: selectedPrForTax._id,
      action: "apply_pph_tax",
      appliedTaxes,
      grossFinalPrice: grossPrice,
      finalPrice: netPrice,
      userId: user,
    })

    await editFn.fn("", payload, () => {
      setPr((current) =>
        current.map((purchase) => {
          if (
            purchase._id !==
            selectedPrForTax._id
          ) {
            return purchase
          }

          return {
            ...purchase,
            finalPrice: netPrice,
            grossFinalPrice: grossPrice,
            appliedTaxes,

            // Hapus format tax lama
            pphTaxName: undefined,
            pphTaxRate: undefined,
            pphDeduction: undefined,
          }
        })
      )

      taxRef.current?.close()
      setSelectedPrForTax(null)
      taxForm.reset({ taxIds: [] })
    })
  }

  async function orderSubmit(data: any) {
    const finalPrice =
      parseFloat(data.finalPrice) || 0

    const payAmount =
      parseFloat(data.payAmount) || 0

    const shippingCost =
      parseFloat(data.shippingCost) || 0

    const taxAmount =
      parseFloat(data.taxAmount) || 0

    const netFinalPrice = finalPrice

    const totalLandedCost =
      netFinalPrice +
      shippingCost +
      taxAmount

    if (filterType === "product") {
      if (finalPrice <= 0) {
        alert("Price harus lebih dari 0")
        return
      }
    } else if (watchPayAmount === "") {
      alert("Please enter pay amount")
      orderForm.setValue("payAmount", 0)
      return
    }

    if (payAmount > totalLandedCost) {
      alert(
        `Pay amount (${payAmount.toLocaleString()}) ` +
        `tidak boleh melebihi total landed cost ` +
        `(${totalLandedCost.toLocaleString()})`
      )
      return
    }

    const payload = JSON.stringify({
      ...data,
      finalPrice,
      grossFinalPrice: undefined,
      appliedTaxes: [],
      shippingCost,
      taxAmount,
      payAmount,
      action: "convert_to_po",
      status:
        filterType === "product"
          ? undefined
          : "_approved",
      purchaseType: filterType,
      userId: user,
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  function openOrder(id: string) {
    const purchase = pr.find(
      (item) => item._id === id
    )

    if (!purchase) return

    if (filterType === "product") {
      orderForm.reset({
        _id: purchase._id,
        quantity: purchase.quantity,
        finalPrice: purchase.finalPrice,
        product:
          purchase.product?.productName,
        productId:
          purchase.product?._id,
        supplierId:
          suppliers[0]?._id ?? "",
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: "Cash",
      })
    }

    if (filterType === "procurement") {
      orderForm.reset({
        _id: purchase._id,
        quantity: purchase.quantity,
        finalPrice: purchase.finalPrice,
        product:
          purchase.product?.name,
        customSupplier:
          purchase.customSupplier,
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: "Cash",
      })
    }

    if (filterType === "service") {
      orderForm.reset({
        _id: purchase._id,
        description:
          purchase.description,
        finalPrice: purchase.finalPrice,
        status: purchase.status,
        shippingCost: 0,
        taxAmount: 0,
        payAmount: 0,
        paymentMethod: "Cash",
        pphTaxId: "",
        vendorId: purchase.vendorId,
      })
    }

    orderRef.current?.showModal()
  }

  function openEdit(id: string) {
    const purchase = pr.find(
      (item) => item._id === id
    )

    if (!purchase) return

    if (filterType === "product") {
      editForm.reset({
        _id: purchase._id,
        quantity: purchase.quantity,
        finalPrice: purchase.finalPrice,
        productId:
          purchase.product?._id,
      })
    }

    if (filterType === "procurement") {
      editForm.reset({
        _id: purchase._id,
        productId:
          purchase.product?._id,
        quantity: purchase.quantity,
        finalPrice: purchase.finalPrice,
        customSupplier:
          purchase.customSupplier,
      })
    }

    if (filterType === "service") {
      editForm.reset({
        _id: purchase._id,
        description:
          purchase.description,
        finalPrice: purchase.finalPrice,
        vendorId: purchase.vendorId,
      })
    }

    editRef.current?.showModal()
  }

  async function approve(id: string) {
    const payload = JSON.stringify({
      _id: id,
      action: "approve_pr",
      userId: user,
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  async function reject(id: string) {
    if (
      !confirm(
        "Are you sure you want to reject this requisition?"
      )
    ) {
      return
    }

    const payload = JSON.stringify({
      _id: id,
      action: "reject_pr",
      userId: user,
    })

    await editFn.fn("", payload, () => {
      window.location.reload()
    })
  }

  function makeVoid(purchase: any) {
    const approvalCode = prompt(
      "Enter approval code to void"
    )

    if (!approvalCode) {
      if (approvalCode === "") {
        alert("Please enter approval code")
      }

      return
    }

    const payload = JSON.stringify({
      _id: purchase._id,
      status: "void",
      approvalCode,
      voidedBy: user,
      voidedAt: new Date(),
    })

    editFn.fn("", payload, (result) => {
      if (result === null) return

      setPr((current) =>
        current.map((item) =>
          item._id === purchase._id
            ? {
              ...item,
              status: "void",
            }
            : item
        )
      )
    })
  }

  useEffect(() => {
    if (!hasHydrated) return

    setSearchResult([])

    const url =
      `/api/web/purchases` +
      `?id=${masterAccountId}` +
      `&f=requested` +
      `&type=${filterType}`

    const bankUrl =
      `/api/web/bank-accounts?id=${masterAccountId}`

    const body = JSON.stringify({})

    bankAccount.fn(
      bankUrl,
      body,
      () => { }
    )

    if (filterType === "product") {
      getProductsFn.fn(
        `/api/web/products?id=${masterAccountId}&type=good`,
        body,
        setProducts
      )

      getSuppliersFn.fn(
        `/api/web/suppliers?id=${masterAccountId}`,
        body,
        setSuppliers
      )
    }

    if (filterType === "procurement") {
      getItemsFn.fn(
        `/api/web/inv-items?id=${masterAccountId}`,
        body,
        setItems
      )
    }

    if (filterType === "service") {
      getVendorsFn.fn(
        `/api/web/vendor?id=${masterAccountId}`,
        body,
        setVendors
      )

      getTaxesFn.fn(
        `/api/web/tax?id=${masterAccountId}`,
        body,
        setTaxes
      )
    }

    getFn.fn(
      url,
      body,
      setPr
    )
  }, [
    masterAccountId,
    hasHydrated,
    filterType,
  ])

  const displayedPurchases =
    searchResult.length > 0
      ? searchResult
      : pr

  const taxPreview = getTaxPreview()

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl text-black">
          Purchases Requisition
        </span>

        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6">
          {/* FILTER */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex flex-row gap-2 items-center">
              <button
                onClick={() =>
                  setFilterType("product")
                }
                className={
                  `px-4 py-2 rounded-full text-sm font-semibold ` +
                  `transition-colors duration-200 ` +
                  (
                    filterType === "product"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )
                }
              >
                Barang
              </button>

              <button
                onClick={() =>
                  setFilterType("service")
                }
                className={
                  `px-4 py-2 rounded-full text-sm font-semibold ` +
                  `transition-colors duration-200 ` +
                  (
                    filterType === "service"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )
                }
              >
                Jasa
              </button>

              <button
                onClick={() =>
                  setFilterType("procurement")
                }
                className={
                  `px-4 py-2 rounded-full text-sm font-semibold ` +
                  `transition-colors duration-200 ` +
                  (
                    filterType === "procurement"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  )
                }
              >
                Procurement
              </button>
            </div>

            <button
              onClick={() => {
                newPrForm.reset()
                modalRef.current?.showModal()
              }}
              className="btn ml-auto bg-blue-900 text-white hover:bg-blue-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>

              Add
            </button>
          </div>

          {/* TABLE */}
          {
            getFn.loading ? (
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl" />
              </div>
            ) : getFn.error || getFn.noResult ? (
              <div>
                <p>{getFn.message}</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto w-full">
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>P.O Number</th>

                        {filterType === "product" && (
                          <th>Created By</th>
                        )}

                        <th>
                          {
                            filterType === "service"
                              ? "Description"
                              : "Item/Product"
                          }
                        </th>

                        {filterType !== "service" && (
                          <th>Quantity</th>
                        )}

                        <th>Price</th>
                        <th>Pay Amount</th>
                        <th>Status</th>
                        <th>Supplier / Vendor</th>
                        <th>...</th>
                      </tr>
                    </thead>

                    <tbody>
                      {displayedPurchases.map(
                        (purchase) => {
                          const itemName =
                            getPurchaseName(
                              purchase
                            )

                          const unit =
                            getUnit(purchase)

                          const supplierName =
                            getSupplierVendorName(
                              purchase
                            )

                          return (
                            <tr
                              key={purchase._id}
                            >
                              <td>
                                {new Date(
                                  purchase.date
                                ).toLocaleString(
                                  "id-ID"
                                )}
                              </td>

                              <td>
                                {
                                  purchase.purchaseOrderNumber
                                }
                              </td>

                              {filterType === "product" && (
                                <td>
                                  {
                                    purchase
                                      ?.createdBy
                                      ?.name
                                  }
                                </td>
                              )}

                              <td>
                                {itemName}
                              </td>

                              {filterType !== "service" && (
                                <td>
                                  {purchase.quantity} (
                                  {unit})
                                </td>
                              )}

                              <td>
                                {purchase.finalPrice?.toLocaleString(
                                  "id-ID"
                                )}
                              </td>

                              <td>
                                {
                                  purchase.status ===
                                    "ordered" ||
                                    purchase.status ===
                                    "completed"
                                    ? purchase.payAmount
                                    : "-"
                                }
                              </td>

                              <td>
                                {purchase.status}
                              </td>

                              <td>
                                {supplierName}
                              </td>

                              <td>
                                {/* REQUESTED */}
                                {purchase.status ===
                                  "requested" &&
                                  filterType ===
                                  "product" && (
                                    <button
                                      className="text-blue-600"
                                      onClick={() =>
                                        openEdit(
                                          purchase._id
                                        )
                                      }
                                      title="Edit"
                                    >
                                      <HugeiconsIcon
                                        icon={
                                          Edit03Icon
                                        }
                                        size={24}
                                        color="currentColor"
                                      />
                                    </button>
                                  )}

                                {purchase.status ===
                                  "requested" &&
                                  filterType !==
                                  "product" && (
                                    <div className="flex flex-row justify-center gap-2">
                                      <button
                                        className="text-blue-600"
                                        onClick={() =>
                                          openEdit(
                                            purchase._id
                                          )
                                        }
                                        title="Edit"
                                      >
                                        <HugeiconsIcon
                                          icon={
                                            Edit03Icon
                                          }
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    </div>
                                  )}

                                {/* APPROVED */}
                                {purchase.status ===
                                  "approved" &&
                                  filterType ===
                                  "product" && (
                                    <button
                                      className="text-green-700"
                                      onClick={() =>
                                        openOrder(
                                          purchase._id
                                        )
                                      }
                                      title="Create Purchase Order"
                                    >
                                      <HugeiconsIcon
                                        icon={
                                          CoinsDollarIcon
                                        }
                                        size={24}
                                        color="currentColor"
                                      />
                                    </button>
                                  )}

                                {purchase.status ===
                                  "approved" &&
                                  filterType !==
                                  "product" && (
                                    <div className="flex flex-row justify-center gap-2 items-center">
                                      <button
                                        className="btn btn-sm"
                                        onClick={() =>
                                          openOrder(
                                            purchase._id
                                          )
                                        }
                                        title="Convert to PO"
                                      >
                                        Make PO
                                      </button>
                                    </div>
                                  )}

                                {/* ORDERED / COMPLETED SERVICE */}
                                {
                                  (
                                    purchase.status ===
                                    "ordered" ||
                                    purchase.status ===
                                    "completed"
                                  ) &&
                                  filterType ===
                                  "service" && (
                                    <div className="flex flex-row justify-center gap-2">
                                      {purchase.status ===
                                        "ordered" && (
                                          <button
                                            className="text-purple-600"
                                            onClick={() =>
                                              openApplyTax(
                                                purchase
                                              )
                                            }
                                            title="Apply Tax"
                                          >
                                            <HugeiconsIcon
                                              icon={
                                                BadgePercentIcon
                                              }
                                              size={24}
                                              color="currentColor"
                                            />
                                          </button>
                                        )}

                                      <button
                                        className="text-red-600"
                                        onClick={() =>
                                          makeVoid(
                                            purchase
                                          )
                                        }
                                        title="Void"
                                      >
                                        <HugeiconsIcon
                                          icon={
                                            Cancel02Icon
                                          }
                                          size={24}
                                          color="currentColor"
                                        />
                                      </button>
                                    </div>
                                  )
                                }
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* =====================================================
          MODAL EDIT REQUISITION
      ===================================================== */}
      <dialog
        ref={editRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Edit Purchase Requisition
            </span>

            <form
              onSubmit={editForm.handleSubmit(
                editSubmit
              )}
              className="h-92 relative flex flex-col gap-3"
            >
              <div className="flex flex-col gap-3">
                {filterType === "service" ? (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Description (Jasa)
                    </legend>

                    <input
                      {...editForm.register(
                        "description",
                        { required: true }
                      )}
                      className="input w-full"
                    />
                  </fieldset>
                ) : (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Select item/product
                    </legend>

                    <select
                      {...editForm.register(
                        "productId"
                      )}
                      className="input w-full"
                    >
                      {filterType ===
                        "product"
                        ? products.map(
                          (product) => (
                            <option
                              key={
                                product._id
                              }
                              value={
                                product._id
                              }
                            >
                              {
                                product.productName
                              }{" "}
                              (
                              {
                                product.conversionRatioX
                              }
                              )
                            </option>
                          )
                        )
                        : items.map(
                          (item) => (
                            <option
                              key={item._id}
                              value={item._id}
                            >
                              {item.name} (
                              {item.unit})
                            </option>
                          )
                        )}
                    </select>
                  </fieldset>
                )}

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">
                    Price
                  </legend>

                  <input
                    {...editForm.register(
                      "finalPrice",
                      { required: true }
                    )}
                    className="input w-full"
                    type="number"
                  />
                </fieldset>

                {filterType !== "service" && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Quantity
                    </legend>

                    <input
                      {...editForm.register(
                        "quantity",
                        { required: true }
                      )}
                      className="input w-full"
                      type="number"
                    />
                  </fieldset>
                )}

                {filterType === "service" && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Vendor
                    </legend>

                    <select
                      {...editForm.register(
                        "vendorId",
                        { required: true }
                      )}
                      className="select w-full"
                    >
                      {vendors.map(
                        (vendor) => (
                          <option
                            value={vendor._id}
                            key={vendor._id}
                          >
                            {vendor.name}
                          </option>
                        )
                      )}
                    </select>
                  </fieldset>
                )}
              </div>

              {(editFn.noResult ||
                editFn.error) && (
                  <label className="input-validator text-red-900">
                    something went wrong
                  </label>
                )}

              <div className="mt-auto ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    editRef.current?.close()
                  }
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

      {/* =====================================================
          MODAL ADD REQUISITION
      ===================================================== */}
      <dialog
        ref={modalRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Add Purchase Requisition
            </span>

            <form
              onSubmit={newPrForm.handleSubmit(
                submit
              )}
              className="h-92 relative flex flex-col gap-3"
            >
              <div className="flex flex-col gap-3">
                {filterType === "service" ? (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Description (Jasa)
                    </legend>

                    <input
                      {...newPrForm.register(
                        "description",
                        { required: true }
                      )}
                      className="input w-full"
                    />
                  </fieldset>
                ) : (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Select item/product
                    </legend>

                    <select
                      {...newPrForm.register(
                        "productId"
                      )}
                      className="input w-full"
                    >
                      {filterType ===
                        "product"
                        ? products.map(
                          (product) => (
                            <option
                              key={
                                product._id
                              }
                              value={
                                product._id
                              }
                            >
                              {
                                product.productName
                              }{" "}
                              (
                              {
                                product.conversionRatioX
                              }
                              )
                            </option>
                          )
                        )
                        : items.map(
                          (item) => (
                            <option
                              key={item._id}
                              value={item._id}
                            >
                              {item.name} (
                              {item.unit})
                            </option>
                          )
                        )}
                    </select>
                  </fieldset>
                )}

                <fieldset className="fieldset flex-1">
                  <legend className="fieldset-legend">
                    Price
                  </legend>

                  <Controller
                    control={
                      newPrForm.control
                    }
                    name="finalPrice"
                    rules={{
                      required: true,
                    }}
                    render={({
                      field: {
                        onChange,
                        ...fieldRest
                      },
                    }) => (
                      <NumericFormat
                        {...fieldRest}
                        value={
                          fieldRest.value ??
                          ""
                        }
                        onValueChange={(
                          values
                        ) =>
                          onChange(
                            values.floatValue ??
                            ""
                          )
                        }
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        allowNegative={false}
                        className="input w-full"
                        placeholder="Contoh: 150000"
                      />
                    )}
                  />
                </fieldset>

                {filterType !== "service" && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Quantity
                    </legend>

                    <input
                      {...newPrForm.register(
                        "quantity",
                        { required: true }
                      )}
                      className="input w-full"
                      type="number"
                    />
                  </fieldset>
                )}

                {filterType === "service" && (
                  <fieldset className="fieldset flex-1">
                    <legend className="fieldset-legend">
                      Vendor
                    </legend>

                    <select
                      {...newPrForm.register(
                        "vendorId",
                        { required: true }
                      )}
                      className="select w-full"
                    >
                      {vendors.map(
                        (vendor) => (
                          <option
                            value={vendor._id}
                            key={vendor._id}
                          >
                            {vendor.name}
                          </option>
                        )
                      )}
                    </select>
                  </fieldset>
                )}
              </div>

              {(addFn.noResult ||
                addFn.error) && (
                  <label className="input-validator text-red-900">
                    something went wrong
                  </label>
                )}

              <div className="mt-auto ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    modalRef.current?.close()
                  }
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* =====================================================
          MODAL MAKE PO
      ===================================================== */}
      <dialog
        ref={orderRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-2xl">
          <div className="flex flex-col gap-3">
            <span className="page-title">
              Create Purchase Order
            </span>

            <form
              onSubmit={orderForm.handleSubmit(
                orderSubmit
              )}
              className="flex flex-col gap-3 pb-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset col-span-2">
                  <legend className="fieldset-legend">
                    {filterType === "service"
                      ? "Description"
                      : "Product/Item"}
                  </legend>

                  <input
                    className="input w-full bg-gray-50"
                    {...orderForm.register(
                      filterType === "service"
                        ? "description"
                        : "product"
                    )}
                    type="text"
                    readOnly
                  />
                </fieldset>

                {filterType !== "service" && (
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">
                      Quantity
                    </legend>

                    <input
                      className="input w-full bg-gray-50"
                      {...orderForm.register(
                        "quantity"
                      )}
                      type="text"
                      readOnly
                    />
                  </fieldset>
                )}

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Price (Rp)
                  </legend>

                  <input
                    className="input w-full bg-gray-50"
                    {...orderForm.register(
                      "finalPrice"
                    )}
                    type="number"
                    readOnly
                  />
                </fieldset>
              </div>

              {filterType === "product" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Supplier
                  </legend>

                  <select
                    {...orderForm.register(
                      "supplierId"
                    )}
                    className="select w-full"
                    required
                  >
                    <option value="">
                      -- Pilih Supplier --
                    </option>

                    {suppliers.map(
                      (supplier) => (
                        <option
                          key={supplier._id}
                          value={supplier._id}
                        >
                          {
                            supplier.bussinessName
                          }
                        </option>
                      )
                    )}
                  </select>
                </fieldset>
              )}

              {filterType === "procurement" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Supplier / Asal
                  </legend>

                  <input
                    className="input w-full"
                    {...orderForm.register(
                      "customSupplier"
                    )}
                    type="text"
                  />
                </fieldset>
              )}

              {filterType === "service" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Vendor
                  </legend>

                  <select
                    {...orderForm.register(
                      "vendorId",
                      { required: true }
                    )}
                    className="select w-full"
                  >
                    {vendors.map(
                      (vendor) => (
                        <option
                          value={vendor._id}
                          key={vendor._id}
                        >
                          {vendor.name}
                        </option>
                      )
                    )}
                  </select>
                </fieldset>
              )}

              <div className="grid grid-cols-2 gap-3">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">
                    Initial Pay Amount (Rp)
                  </legend>

                  <input
                    className="input w-full"
                    {...orderForm.register(
                      "payAmount"
                    )}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                  />
                </fieldset>

                <fieldset
                  className={
                    `fieldset ${watchPayAmount > 0
                      ? ""
                      : "hidden"
                    }`
                  }
                >
                  <legend className="fieldset-legend">
                    Payment Method
                  </legend>

                  <select
                    {...orderForm.register(
                      "paymentMethod"
                    )}
                    className="select w-full"
                  >
                    <option value="Cash">
                      Cash
                    </option>

                    {bankAccount.result?.map(
                      (bank: any) => (
                        <option
                          key={bank._id}
                          value={
                            `Transfer - ${bank.bank}`
                          }
                        >
                          Transfer -{" "}
                          {bank.bank} (
                          {
                            bank.accountName
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </fieldset>
              </div>

              {editFn.error && (
                <p className="text-red-600 text-sm">
                  Terjadi kesalahan, coba lagi.
                </p>
              )}

              <div className="flex flex-row gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() =>
                    orderRef.current?.close()
                  }
                  className="p-3 rounded-md border border-gray-300 text-gray-700"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-blue-900"
                  disabled={editFn.loading}
                >
                  {editFn.loading
                    ? "Processing..."
                    : "Buat PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>

      {/* =====================================================
          MODAL APPLY TAX
      ===================================================== */}
      <dialog
        ref={taxRef}
        className="modal text-black"
      >
        <div className="modal-box w-11/12 max-w-lg">
          <div className="flex flex-col gap-4">
            <span className="page-title">
              Apply Tax
            </span>

            {selectedPrForTax && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
                <p className="font-semibold text-gray-800">
                  {getPurchaseName(
                    selectedPrForTax
                  )}
                </p>

                <div className="flex justify-between">
                  <span>Harga Bruto</span>

                  <span className="font-semibold">
                    Rp{" "}
                    {getGrossPrice(
                      selectedPrForTax
                    ).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>

                {selectedPrForTax.appliedTaxes
                  ?.length > 0 && (
                    <div className="flex flex-col gap-1 bg-gray-100 p-2 rounded">
                      {selectedPrForTax.appliedTaxes.map(
                        (
                          tax: any,
                          index: number
                        ) => (
                          <div
                            key={
                              tax.taxId ||
                              index
                            }
                            className={
                              `flex justify-between gap-3 ` +
                              (
                                tax.type ===
                                  "deduction"
                                  ? "text-red-700"
                                  : "text-green-700"
                              )
                            }
                          >
                            <span>
                              {
                                tax.type ===
                                  "deduction"
                                  ? "Potongan"
                                  : "Tambahan"
                              }{" "}
                              {tax.name} (
                              {tax.rate}%)
                            </span>

                            <span className="font-semibold whitespace-nowrap">
                              {
                                tax.type ===
                                  "deduction"
                                  ? "-"
                                  : "+"
                              }{" "}
                              Rp{" "}
                              {parseFloat(
                                tax.amount ||
                                0
                              ).toLocaleString(
                                "id-ID"
                              )}
                            </span>
                          </div>
                        )
                      )}

                      <div className="border-t border-gray-300 pt-1 flex justify-between">
                        <span>
                          Price saat ini
                        </span>

                        <span className="font-semibold text-blue-700">
                          Rp{" "}
                          {parseFloat(
                            selectedPrForTax.finalPrice ||
                            0
                          ).toLocaleString(
                            "id-ID"
                          )}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            )}

            <form
              onSubmit={taxForm.handleSubmit(
                applyTaxSubmit
              )}
              className="flex flex-col gap-4"
            >
              {/* TAX SELECTION */}
              <fieldset className="fieldset">
                <legend className="fieldset-legend">
                  Pilih Tax
                </legend>

                <div className="flex flex-col gap-2">
                  {taxes.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Tidak ada tax tersedia.
                    </p>
                  ) : (
                    taxes.map((tax: any) => (
                      <label
                        key={tax._id}
                        className="flex items-center gap-2 cursor-pointer rounded-md p-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          value={tax._id}
                          {...taxForm.register(
                            "taxIds"
                          )}
                          className="checkbox checkbox-sm !w-4 !h-4 !min-w-4 !min-h-4 shrink-0"
                        />

                        <span className="flex-1 min-w-0">
                          {tax.name} (
                          {tax.value}%)
                        </span>

                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {tax.isPPh
                            ? "(Potongan/PPh)"
                            : "(Tambahan/PPN)"}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </fieldset>

              {/* TAX PREVIEW */}
              {taxPreview &&
                selectedPrForTax &&
                watchTaxFormTaxIds.length >
                0 && (
                  <div className="flex flex-col gap-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>
                        Harga Bruto:
                      </span>

                      <span className="font-medium">
                        Rp{" "}
                        {getGrossPrice(
                          selectedPrForTax
                        ).toLocaleString(
                          "id-ID"
                        )}
                      </span>
                    </div>

                    {taxPreview.appliedTaxes.map(
                      (tax: any) => (
                        <div
                          key={tax.taxId}
                          className={
                            `flex justify-between gap-3 ` +
                            (
                              tax.isPPh
                                ? "text-red-700"
                                : "text-green-700"
                            )
                          }
                        >
                          <span>
                            {
                              tax.isPPh
                                ? "Potongan"
                                : "Tambahan"
                            }{" "}
                            {tax.name} (
                            {tax.rate}%):
                          </span>

                          <span className="font-medium whitespace-nowrap">
                            {tax.isPPh
                              ? "-"
                              : "+"}{" "}
                            Rp{" "}
                            {tax.amount.toLocaleString(
                              "id-ID"
                            )}
                          </span>
                        </div>
                      )
                    )}

                    <div className="flex justify-between gap-3 border-t border-amber-300 pt-1 font-bold text-gray-900">
                      <span>
                        Final Price:
                      </span>

                      <span className="whitespace-nowrap">
                        Rp{" "}
                        {taxPreview.netPrice.toLocaleString(
                          "id-ID"
                        )}
                      </span>
                    </div>
                  </div>
                )}

              {/* ACTION */}
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    taxRef.current?.close()
                    setSelectedPrForTax(null)
                    taxForm.reset({
                      taxIds: [],
                    })
                  }}
                  className="p-3 rounded-md text-black bg-gray-200"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="p-3 rounded-md text-white bg-amber-600"
                  disabled={editFn.loading}
                >
                  {editFn.loading
                    ? "Memproses..."
                    : "Apply Tax"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

export default withAuth(Purchases)