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
  Copy01Icon,
  Delete01Icon,
  Search01Icon,
  MoreHorizontalIcon,
  Edit03Icon,
  PrinterIcon,
} from "@hugeicons/core-free-icons"
import Swal from "sweetalert2"
import { formatDate } from "@/lib/utils"
import { usePermission } from "@/hooks/usePermission"
import CopyContractModal from "./CopyContractModal"

type MenuPosition = { top: number; left: number }

export default function ContractList() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContractListContent />
    </Suspense>
  )
}

function ContractListContent() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)
  const { canCreate, canEdit, canDelete } = usePermission()

  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [searching, setSearching] = useState(false)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ top: 0, left: 0 })
  const [copySourceContract, setCopySourceContract] = useState<any | null>(null)

  const actionButtonRef = useRef<HTMLButtonElement>(null)
  const actionMenuRef = useRef<HTMLUListElement>(null)

  const activeContract = contracts.find((c) => c._id === openActionId)

  const updateMenuPosition = () => {
    const button = actionButtonRef.current
    const menu = actionMenuRef.current
    if (!button || !menu) return

    const rect = button.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const gap = 4
    const padding = 8

    const showBelow = rect.bottom + gap + menuRect.height <= window.innerHeight - padding
    const top = showBelow
      ? rect.bottom + gap
      : Math.max(padding, rect.top - menuRect.height - gap)
    const left = Math.max(
      padding,
      Math.min(rect.right - menuRect.width, window.innerWidth - menuRect.width - padding)
    )

    setMenuPosition({ top, left })
  }

  useLayoutEffect(() => {
    if (!openActionId) return
    updateMenuPosition()

    const handleViewportChange = () => updateMenuPosition()
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (!actionButtonRef.current?.contains(target) && !actionMenuRef.current?.contains(target)) {
        setOpenActionId(null)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenActionId(null)
    }

    window.addEventListener("scroll", handleViewportChange, true)
    window.addEventListener("resize", handleViewportChange)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("scroll", handleViewportChange, true)
      window.removeEventListener("resize", handleViewportChange)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [openActionId])

  useEffect(() => {
    if (loggedIn && hasHydrated && masterAccountId) {
      fetchContracts()
    }
  }, [loggedIn, hasHydrated, masterAccountId])

  const fetchContracts = async (customerName = searchInput) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ id: masterAccountId! })
      if (customerName.trim()) params.set("customerName", customerName.trim())

      const res = await fetch(`/api/web/contracts?${params}`)
      const data = await res.json()

      if (!data.error) {
        setContracts(data.result || [])
      } else {
        Swal.fire("Error!", data.message, "error")
      }
    } catch {
      Swal.fire("Error!", "Something went wrong", "error")
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleSearch = async () => {
    setSearching(true)
    await fetchContracts(searchInput)
  }

  const handleResetFilter = async () => {
    setSearchInput("")
    setSearching(true)
    await fetchContracts("")
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
      const res = await fetch(`/api/web/contracts/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.error) {
        await Swal.fire("Deleted!", "Contract has been deleted.", "success")
        fetchContracts()
      } else {
        Swal.fire("Error!", data.message, "error")
      }
    } catch {
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
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-6 px-4 pb-3 pt-4 shadow-sm backdrop-blur-md md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">Contracts</h1>
          {canCreate("/sales/contract") && (
            <Link href="/sales/contract/create" className="btn btn-primary btn-sm md:btn-md">
              <HugeiconsIcon icon={AddCircleHalfDotIcon} />
              Create Contract
            </Link>
          )}
        </div>

        <div className="rounded-lg bg-white p-3 shadow md:p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch() }}
            className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
          >
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama customer..."
                className="input input-bordered w-full"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={searching} className="btn btn-primary flex-1 sm:flex-none">
                {searching ? <span className="loading loading-spinner loading-sm" /> : <HugeiconsIcon icon={Search01Icon} size={18} />}
                Cari
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                disabled={searching || !searchInput}
                className="btn btn-outline flex-1 sm:flex-none"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>No. Kontrak</th>
              <th>Customer</th>
              <th>Produk / Layanan</th>
              <th>Dari</th>
              <th>Sampai</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract._id}>
                <td className="font-mono text-sm">{contract.contractNumber}</td>
                <td>
                  {contract.customerId
                    ? contract.customerId.name || contract.customerId.bussinessName
                    : "-"}
                </td>
                <td>{contract.productId?.productName || "-"}</td>
                <td>{formatDate(contract.from)}</td>
                <td>{formatDate(contract.to)}</td>
                <td className="text-center">
                  <button
                    ref={openActionId === contract._id ? actionButtonRef : null}
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    aria-label={`Actions for ${contract.contractNumber}`}
                    aria-expanded={openActionId === contract._id}
                    onClick={(event) => {
                      if (openActionId === contract._id) {
                        setOpenActionId(null)
                        return
                      }
                      actionButtonRef.current = event.currentTarget
                      setOpenActionId(contract._id)
                    }}
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} size={20} />
                  </button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No contracts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action Menu Portal */}
      {activeContract &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={actionMenuRef}
            className="menu fixed z-[9999] w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              visibility: menuPosition.top === 0 && menuPosition.left === 0 ? "hidden" : "visible",
            }}
          >
            <li>
              <Link
                href={`/sales/contract/print/${activeContract._id}`}
                onClick={() => setOpenActionId(null)}
              >
                <HugeiconsIcon icon={PrinterIcon} size={16} />
                Print / Preview
              </Link>
            </li>
            {canCreate("/sales/contract") && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    const selected = activeContract
                    setOpenActionId(null)
                    setCopySourceContract(selected)
                  }}
                >
                  <HugeiconsIcon icon={Copy01Icon} size={16} />
                  Salin Kontrak
                </button>
              </li>
            )}
            {canEdit("/sales/contract") && (
              <li>
                <Link
                  href={`/sales/contract/edit/${activeContract._id}`}
                  onClick={() => setOpenActionId(null)}
                >
                  <HugeiconsIcon icon={Edit03Icon} size={16} />
                  Edit
                </Link>
              </li>
            )}
            {canDelete("/sales/contract") && (
              <li>
                <button
                  type="button"
                  className="text-error"
                  onClick={() => handleDelete(activeContract._id)}
                >
                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                  Hapus
                </button>
              </li>
            )}
          </ul>,
          document.body
        )}

      <CopyContractModal
        contract={copySourceContract}
        masterAccountId={masterAccountId || ""}
        onClose={() => setCopySourceContract(null)}
        onSuccess={() => {
          setCopySourceContract(null)
          fetchContracts()
        }}
      />
    </div>
  )
}

