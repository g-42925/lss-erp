"use client"

import {
  useEffect,
  useState,
  useRef,
  useLayoutEffect,
  Suspense,
} from "react"
import { createPortal } from "react-dom"
import useAuth from "@/store/auth"
import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AddCircleHalfDotIcon,
  Edit03Icon,
  Delete01Icon,
  Search01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import Swal from "sweetalert2"
import { formatDate } from "@/lib/utils"
import { usePermission } from "@/hooks/usePermission"
import { useRouter } from "next/navigation"

type MenuPosition = {
  top: number
  left: number
}

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
  const hasHydrated = useAuth((state) => state._hasHydrated)
  const { canCreate, canEdit, canDelete } = usePermission()
  const router = useRouter()

  const [quotations, setQuotations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState("")
  const [searching, setSearching] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
  })

  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [copyTargetQuo, setCopyTargetQuo] = useState<any>(null)
  const [copyCustomer, setCopyCustomer] = useState("")
  const [copyPriceOptions, setCopyPriceOptions] = useState<any[]>([])
  const [copying, setCopying] = useState(false)

  const [soModalOpen, setSoModalOpen] = useState(false)
  const [soTargetQuo, setSoTargetQuo] = useState<any>(null)

  const actionButtonRef = useRef<HTMLButtonElement>(null)
  const actionMenuRef = useRef<HTMLUListElement>(null)

  const activeQuotation = quotations.find(
    (quo) => quo._id === openActionId
  )

  const updateMenuPosition = () => {
    const button = actionButtonRef.current
    const menu = actionMenuRef.current

    if (!button || !menu) return

    const rect = button.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const gap = 4
    const padding = 8

    const showBelow =
      rect.bottom + gap + menuRect.height <=
      window.innerHeight - padding

    const top = showBelow
      ? rect.bottom + gap
      : Math.max(
        padding,
        rect.top - menuRect.height - gap
      )

    const left = Math.max(
      padding,
      Math.min(
        rect.right - menuRect.width,
        window.innerWidth - menuRect.width - padding
      )
    )

    setMenuPosition({ top, left })
  }

  useLayoutEffect(() => {
    if (!openActionId) return

    updateMenuPosition()

    const handleViewportChange = () => {
      updateMenuPosition()
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      if (
        !actionButtonRef.current?.contains(target) &&
        !actionMenuRef.current?.contains(target)
      ) {
        setOpenActionId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionId(null)
      }
    }

    // Capture scroll dari window maupun container tabel.
    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    )
    window.addEventListener("resize", handleViewportChange)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      )
      window.removeEventListener("resize", handleViewportChange)
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      )
      document.removeEventListener("keydown", handleEscape)
    }
  }, [openActionId])

  useEffect(() => {
    if (loggedIn && hasHydrated && masterAccountId) {
      fetchQuotations()
    }
  }, [loggedIn, hasHydrated, masterAccountId])

  const fetchQuotations = async (name = customerName) => {
    setLoading(true)

    try {
      const params = new URLSearchParams({
        id: masterAccountId!,
      })

      if (name.trim()) {
        params.set("customerName", name.trim())
      }

      const res = await fetch(`/api/web/quotations?${params}`)
      const data = await res.json()

      if (!data.error) {
        setQuotations(data.result || [])
      } else {
        Swal.fire("Error!", data.message, "error")
      }
    } catch (e) {
      console.error(e)
      Swal.fire("Error!", "Something went wrong", "error")
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleSearch = async () => {
    setSearching(true)
    await fetchQuotations(customerName)
  }

  const handleResetFilter = async () => {
    setCustomerName("")
    setSearching(true)
    await fetchQuotations("")
  }

  const handleDelete = async (id: string) => {
    setOpenActionId(null)

    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    })

    if (!confirm.isConfirmed) return

    try {
      const res = await fetch(`/api/web/quotations/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (!data.error) {
        await Swal.fire(
          "Deleted!",
          "Your quotation has been deleted.",
          "success"
        )
        fetchQuotations()
      } else {
        Swal.fire("Error!", data.message, "error")
      }
    } catch {
      Swal.fire("Error!", "Something went wrong", "error")
    }
  }

  const openCopyModal = (quo: any) => {
    setOpenActionId(null)
    setCopyTargetQuo(quo)
    setCopyCustomer("")
    setCopyPriceOptions(
      quo.priceOptions?.length
        ? JSON.parse(JSON.stringify(quo.priceOptions))
        : [{ qty: 1, frequency: "Month", price: 0 }]
    )
    setCopyModalOpen(true)
  }

  const openSoModal = (quo: any) => {
    setOpenActionId(null)

    if (!quo.priceOptions || quo.priceOptions.length <= 1) {
      router.push(
        `/sales/svc-order?qNumber=${quo.quotationNumber}&optIndex=0`
      )
    } else {
      setSoTargetQuo(quo)
      setSoModalOpen(true)
    }
  }

  const handleSoOptionSelect = (index: number) => {
    if (soTargetQuo) {
      setSoModalOpen(false)
      router.push(
        `/sales/svc-order?qNumber=${soTargetQuo.quotationNumber}&optIndex=${index}`
      )
    }
  }

  const handleCopySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!copyCustomer) {
      Swal.fire("Error", "Nama Customer harus diisi", "error")
      return
    }

    setCopying(true)

    try {
      const payload = {
        masterAccountId,
        customCustomer: {
          name: copyCustomer,
          address: "",
        },
        productId:
          copyTargetQuo.productId?._id ||
          copyTargetQuo.productId,
        specifications: copyTargetQuo.specifications,
        priceOptions: copyPriceOptions,
        programs: copyTargetQuo.programs,
        note: copyTargetQuo.note,
        introduction: copyTargetQuo.introduction,
        disclaimers: copyTargetQuo.disclaimers,
      }

      const res = await fetch("/api/web/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!data.error) {
        await Swal.fire(
          "Success!",
          "Quotation berhasil disalin.",
          "success"
        )
        setCopyModalOpen(false)
        fetchQuotations()
      } else {
        Swal.fire("Error!", data.message, "error")
      }
    } catch {
      Swal.fire("Error!", "Something went wrong", "error")
    } finally {
      setCopying(false)
    }
  }

  const addCopyPriceOption = () => {
    setCopyPriceOptions((prev) => [
      ...prev,
      { qty: 1, frequency: "Month", price: 0 },
    ])
  }

  const updateCopyPriceOption = (
    index: number,
    field: string,
    val: any
  ) => {
    setCopyPriceOptions((prev) =>
      prev.map((option, i) =>
        i === index ? { ...option, [field]: val } : option
      )
    )
  }

  const removeCopyPriceOption = (index: number) => {
    setCopyPriceOptions((prev) =>
      prev.filter((_, i) => i !== index)
    )
  }

  async function handleUnlock(_id: string) {
    try {
      const res = await fetch(`/api/web/quotations/unlock`, {
        method: "PUT",
        body: JSON.stringify({ _id }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await res.json()

      if (!data.error) {
        await Swal.fire(
          "Success!",
          "Quotation successfully unlocked.",
          "success"
        )
        fetchQuotations()
      }
      else {
        Swal.fire("Error!", data.message, "error")
      }
    }
    catch {
      Swal.fire("Error!", "Something went wrong", "error")
    }
  }

  async function handleLock(_id: string) {
    try {
      const res = await fetch(`/api/web/quotations/lock`, {
        method: "PUT",
        body: JSON.stringify({ _id }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await res.json()

      if (!data.error) {
        await Swal.fire(
          "Success!",
          "Quotation successfully locked.",
          "success"
        )
        fetchQuotations()
      }
      else {
        Swal.fire("Error!", data.message, "error")
      }
    }
    catch {
      Swal.fire("Error!", "Something went wrong", "error")
    }
  }

  if (!hasHydrated || loading) {
    return (
      <div className="p-8 text-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="p-4 pb-32 md:p-8">
      {/* Sticky Header + Search */}
      <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 px-4 pb-3 pt-4 shadow-sm backdrop-blur-md md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">
            Quotations
          </h1>

          {canCreate("/sales/quotation") && (
            <Link
              href="/sales/quotation/create"
              className="btn btn-primary btn-sm md:btn-md"
            >
              <HugeiconsIcon icon={AddCircleHalfDotIcon} />
              Create Quotation
            </Link>
          )}
        </div>

        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
          >
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Cari nama customer..."
                className="input input-bordered w-full"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={searching}
                className="btn btn-primary flex-1 sm:flex-none"
              >
                {searching ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <HugeiconsIcon icon={Search01Icon} size={18} />
                )}
                Cari
              </button>

              <button
                type="button"
                onClick={handleResetFilter}
                disabled={searching || !customerName}
                className="btn btn-outline flex-1 sm:flex-none"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quotation Table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Quotation No</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Status</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {quotations.map((quo) => (
              <tr key={quo._id}>
                <td>{formatDate(quo.date)}</td>
                <td>{quo.quotationNumber}</td>

                <td>
                  {quo.customerId
                    ? quo.customerId.name ||
                    quo.customerId.bussinessName
                    : quo.customCustomer?.name || "-"}
                </td>

                <td>{quo.productId?.productName || "-"}</td>

                <td>
                  <span
                    className={`badge ${quo.status === "draft"
                      ? "badge-neutral"
                      : quo.status === "accepted"
                        ? "badge-success"
                        : "badge-info"
                      }`}
                  >
                    {quo.status}
                  </span>
                </td>

                <td className="text-center">
                  <button
                    ref={
                      openActionId === quo._id
                        ? actionButtonRef
                        : null
                    }
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    aria-label={`Actions for ${quo.quotationNumber}`}
                    aria-expanded={openActionId === quo._id}
                    onClick={(event) => {
                      if (openActionId === quo._id) {
                        setOpenActionId(null)
                        return
                      }

                      actionButtonRef.current = event.currentTarget
                      setOpenActionId(quo._id)
                    }}
                  >
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      size={20}
                    />
                  </button>
                </td>
              </tr>
            ))}

            {quotations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-gray-500"
                >
                  No quotations found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Menu: rendered outside the scrollable table */}
      {activeQuotation &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={actionMenuRef}
            className="menu fixed z-[9999] w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              visibility:
                menuPosition.top === 0 &&
                  menuPosition.left === 0
                  ? "hidden"
                  : "visible",
            }}
          >
            {canCreate("/sales/quotation") && (
              <li>
                <button
                  type="button"
                  onClick={() => openCopyModal(activeQuotation)}
                >
                  copy
                </button>
              </li>
            )}

            {canCreate("/sales/svc-order") && (
              <li>
                <button
                  type="button"
                  disabled={activeQuotation.locked}
                  onClick={() => openSoModal(activeQuotation)}
                >
                  make order
                </button>
              </li>
            )}

            {canEdit("/sales/quotation") && (
              <li>
                <Link
                  href={`/sales/quotation/edit/${activeQuotation._id}`}
                  onClick={() => setOpenActionId(null)}
                >
                  Edit
                </Link>
              </li>
            )}

            <li>
              <Link
                href={`/sales/quotation/print/${activeQuotation._id}`}
                onClick={() => setOpenActionId(null)}
              >
                Print / Preview
              </Link>
            </li>

            {
              activeQuotation.locked === false && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleLock(activeQuotation._id)}
                  >
                    lock
                  </button>
                </li>
              )
            }

            {
              activeQuotation.locked === true && (
                <li>
                  <button
                    type="button"

                    onClick={() => handleUnlock(activeQuotation._id)}
                  >
                    Unlock
                  </button>
                </li>
              )
            }


            {canDelete("/sales/quotation") && (
              <li>
                <button
                  type="button"
                  className="text-error"
                  onClick={() => handleDelete(activeQuotation._id)}
                >
                  Hapus
                </button>
              </li>
            )}
          </ul>,
          document.body
        )
      }

      {/* Copy Quotation Modal */}
      {
        copyModalOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-3xl">
              <h3 className="mb-4 text-lg font-bold">
                Salin Quotation
              </h3>

              <form onSubmit={handleCopySubmit} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Nama Customer Baru
                    </span>
                  </label>

                  <input
                    type="text"
                    className="input input-bordered"
                    required
                    value={copyCustomer}
                    onChange={(e) => setCopyCustomer(e.target.value)}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-semibold">Opsi Harga</span>

                    <button
                      type="button"
                      onClick={addCopyPriceOption}
                      className="btn btn-sm btn-primary"
                    >
                      Add Price Option
                    </button>
                  </div>

                  {copyPriceOptions.map((opt, i) => (
                    <div
                      key={i}
                      className="mb-2 grid grid-cols-[70px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <input
                        type="number"
                        placeholder="Qty"
                        className="input input-bordered w-full"
                        required
                        value={opt.qty}
                        onChange={(e) =>
                          updateCopyPriceOption(
                            i,
                            "qty",
                            parseInt(e.target.value) || 0
                          )
                        }
                      />

                      <select
                        className="select select-bordered w-full"
                        value={opt.frequency}
                        onChange={(e) =>
                          updateCopyPriceOption(
                            i,
                            "frequency",
                            e.target.value
                          )
                        }
                      >
                        <option value="Once">Once</option>
                        <option value="Week">Week</option>
                        <option value="Month">Month</option>
                        <option value="Year">Year</option>
                      </select>

                      <input
                        type="number"
                        placeholder="Price"
                        className="input input-bordered w-full"
                        required
                        value={opt.price}
                        onChange={(e) =>
                          updateCopyPriceOption(
                            i,
                            "price",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() => removeCopyPriceOption(i)}
                        className="btn btn-square btn-sm btn-error text-white"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>

                <div className="modal-action">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setCopyModalOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={copying}
                    className="btn btn-success text-white"
                  >
                    {copying ? "Menyalin..." : "Salin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Service Order Modal */}
      {
        soModalOpen && soTargetQuo && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="mb-4 text-lg font-bold">
                Pilih Opsi Harga untuk Service Order
              </h3>

              <div className="flex flex-col gap-3">
                {soTargetQuo.priceOptions?.map(
                  (opt: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      className="btn btn-outline justify-start"
                      onClick={() => handleSoOptionSelect(i)}
                    >
                      Qty: {opt.qty} | Freq: {opt.frequency} | Price:
                      Rp {opt.price?.toLocaleString("id-ID")}
                    </button>
                  )
                )}
              </div>

              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSoModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}
