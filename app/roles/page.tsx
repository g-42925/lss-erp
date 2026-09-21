"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import withAuth from "@/hofs/withAuth"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"
import { useForm } from "react-hook-form"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface RolePage {
  link: string
  permissions: string[]
}

interface RoleData {
  _id: string
  name: string
  pages: RolePage[]
}

interface Feature {
  _id: string
  name: string
  link: string
}

interface FeatureGroup {
  _id: string
  features: Feature[]
}

interface RoleForm {
  name: string
}

interface EditRoleForm extends RoleForm {
  _id: string
}

const PERMISSIONS = [
  { value: "view", label: "View" },
  { value: "create", label: "Add" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
]

/* =========================================================
   Permission Checkbox
   ========================================================= */

function PermissionCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <label className="flex items-center justify-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 cursor-pointer accent-blue-600"
      />

      <span className="text-xs text-gray-600">
        {label}
      </span>
    </label>
  )
}

/* =========================================================
   Permission Group
   ========================================================= */

function PermissionGroup({
  group,
  selectedPages,
  togglePermission,
}: {
  group: FeatureGroup
  selectedPages: Record<string, string[]>
  togglePermission: (link: string, permission: string) => void
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">

      {/* Group title */}
      <div className="px-4 py-3 bg-gray-50 border-b">
        <span className="font-bold text-sm text-blue-800 uppercase">
          {group._id}
        </span>
      </div>

      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_80px_80px_80px] border-b bg-gray-50">
        <div className="px-4 py-2 text-xs font-semibold text-gray-500">
          Feature
        </div>

        {PERMISSIONS.map((permission) => (
          <div
            key={permission.value}
            className="flex items-center justify-center px-2 py-2 text-xs font-semibold text-gray-500"
          >
            {permission.label}
          </div>
        ))}
      </div>

      {/* Features */}
      <div>
        {group.features.map((feature) => (
          <div
            key={feature._id}
            className="
              border-b
              last:border-b-0
              border-gray-100
              px-4
              py-3
            "
          >

            {/* Desktop */}
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_80px_80px_80px] items-center">

              <div className="text-sm font-medium text-gray-700">
                {feature.name}
              </div>

              {PERMISSIONS.map((permission) => (
                <PermissionCheckbox
                  key={permission.value}
                  label=""
                  checked={
                    selectedPages[feature.link]?.includes(
                      permission.value
                    ) ?? false
                  }
                  onChange={() =>
                    togglePermission(
                      feature.link,
                      permission.value
                    )
                  }
                />
              ))}
            </div>

            {/* Mobile */}
            <div className="md:hidden">

              <div className="text-sm font-medium text-gray-700 mb-3">
                {feature.name}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map((permission) => (
                  <PermissionCheckbox
                    key={permission.value}
                    label={permission.label}
                    checked={
                      selectedPages[feature.link]?.includes(
                        permission.value
                      ) ?? false
                    }
                    onChange={() =>
                      togglePermission(
                        feature.link,
                        permission.value
                      )
                    }
                  />
                ))}
              </div>

            </div>

          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================================
   Permission Panel
   ========================================================= */

function PermissionPanel({
  features,
  selectedPages,
  togglePermission,
  selectAllPermissions,
  clearAllPermissions,
}: {
  features: FeatureGroup[]
  selectedPages: Record<string, string[]>
  togglePermission: (link: string, permission: string) => void
  selectAllPermissions: () => void
  clearAllPermissions: () => void
}) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">

      {/* Panel header */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between gap-3">

          <div>
            <div className="text-sm font-semibold text-gray-800">
              Feature Access & Actions
            </div>

            <div className="text-xs text-gray-500 mt-0.5">
              Configure permissions for this role
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={selectAllPermissions}
              className="px-3 py-1.5 text-xs border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
            >
              Select All
            </button>

            <button
              type="button"
              onClick={clearAllPermissions}
              className="px-3 py-1.5 text-xs border border-red-400 text-red-500 rounded-md hover:bg-red-50"
            >
              Clear All
            </button>
          </div>

        </div>
      </div>

      {/* Groups */}
      <div className="p-3 bg-gray-50 space-y-3">
        {features.map((group) => (
          <PermissionGroup
            key={group._id}
            group={group}
            selectedPages={selectedPages}
            togglePermission={togglePermission}
          />
        ))}
      </div>
    </div>
  )
}

/* =========================================================
   Role Modal
   ========================================================= */

function RoleModal({
  modalRef,
  title,
  submitLabel,
  name,
  onNameChange,
  onSubmit,
  onClose,
  features,
  selectedPages,
  togglePermission,
  selectAllPermissions,
  clearAllPermissions,
}: {
  modalRef: React.RefObject<HTMLDialogElement | null>
  title: string
  submitLabel: string
  name: string
  onNameChange: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
  features: FeatureGroup[]
  selectedPages: Record<string, string[]>
  togglePermission: (link: string, permission: string) => void
  selectAllPermissions: () => void
  clearAllPermissions: () => void
}) {
  return (
    <dialog
      ref={modalRef}
      className="modal"
    >
      <div
        className="
          modal-box
          !w-[900px]
          !max-w-[95vw]
          !h-[90vh]
          !max-h-[900px]
          p-0
          flex
          flex-col
          overflow-hidden
          text-black
        "
      >

        {/* =================================================
            Header
            ================================================= */}

        <div className="shrink-0 px-6 py-5 border-b bg-white">
          <h3 className="text-lg font-bold">
            {title}
          </h3>
        </div>

        {/* =================================================
            Form
            ================================================= */}

        <form
          onSubmit={onSubmit}
          className="flex flex-col flex-1 min-h-0"
        >

          {/* =================================================
              Scrollable body
              ================================================= */}

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* Role name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800">
                  Role Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    onNameChange(e.target.value)
                  }
                  placeholder="e.g. Sales Manager"
                  className="
                    w-full
                    h-10
                    px-3
                    border
                    border-gray-300
                    rounded-md
                    outline-none
                    focus:border-blue-500
                    focus:ring-1
                    focus:ring-blue-500
                  "
                />
              </div>

              {/* Permissions */}
              <PermissionPanel
                features={features}
                selectedPages={selectedPages}
                togglePermission={togglePermission}
                selectAllPermissions={selectAllPermissions}
                clearAllPermissions={clearAllPermissions}
              />

            </div>
          </div>

          {/* =================================================
              Footer
              ================================================= */}

          <div className="shrink-0 px-6 py-4 border-t bg-white">
            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={onClose}
                className="
                  px-5
                  py-2
                  text-sm
                  font-medium
                  text-gray-700
                  rounded-md
                  hover:bg-gray-100
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                className="
                  px-6
                  py-2
                  text-sm
                  font-medium
                  text-white
                  bg-blue-700
                  rounded-md
                  hover:bg-blue-800
                "
              >
                {submitLabel}
              </button>

            </div>
          </div>

        </form>
      </div>
    </dialog>
  )
}

/* =========================================================
   Main
   ========================================================= */

function Roles() {
  const router = useRouter()

  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [roles, setRoles] = useState<RoleData[]>([])
  const [selectedPages, setSelectedPages] = useState<
    Record<string, string[]>
  >({})

  const newRoleForm = useForm<RoleForm>({
    defaultValues: {
      name: "",
    },
  })

  const editRoleForm = useForm<EditRoleForm>({
    defaultValues: {
      _id: "",
      name: "",
    },
  })

  /* =======================================================
     API
     ======================================================= */

  const getFn = useFetch<RoleData[], any>({
    url: "",
    method: "GET",
  })

  const getFeaturesFn = useFetch<FeatureGroup[], any>({
    url: "/api/web/features",
    method: "GET",
  })

  const addFn = useFetch<RoleData, any>({
    url: "/api/web/roles",
    method: "POST",
    onError: (message) => {
      alert(message)
    },
  })

  const putFn = useFetch<RoleData, any>({
    url: "/api/web/roles",
    method: "PUT",
  })

  const deleteFn = useFetch<string, any>({
    url: "",
    method: "DELETE",
    onError: (message) => {
      alert(message)
    },
  })

  const features = getFeaturesFn.result ?? []

  /* =======================================================
     Permissions
     ======================================================= */

  const togglePermission = (
    link: string,
    permission: string
  ) => {
    setSelectedPages((prev) => {
      const current = prev[link] ?? []

      if (current.includes(permission)) {
        const updated = current.filter(
          (item) => item !== permission
        )

        if (updated.length === 0) {
          const next = { ...prev }
          delete next[link]
          return next
        }

        return {
          ...prev,
          [link]: updated,
        }
      }

      return {
        ...prev,
        [link]: [...current, permission],
      }
    })
  }

  const selectAllPermissions = () => {
    const all: Record<string, string[]> = {}

    features.forEach((group) => {
      group.features.forEach((feature) => {
        all[feature.link] = PERMISSIONS.map(
          (permission) => permission.value
        )
      })
    })

    setSelectedPages(all)
  }

  const clearAllPermissions = () => {
    setSelectedPages({})
  }

  const buildPages = (): RolePage[] => {
    return Object.entries(selectedPages)
      .filter(([, permissions]) => permissions.length)
      .map(([link, permissions]) => ({
        link,
        permissions,
      }))
  }

  /* =======================================================
     Add
     ======================================================= */

  const newRole = () => {
    newRoleForm.reset({
      name: "",
    })

    setSelectedPages({})
    modalRef.current?.showModal()
  }

  const submit = async (data: RoleForm) => {
    const pages = buildPages()

    const body = JSON.stringify({
      name: data.name,
      pages,
      id: masterAccountId,
    })

    await addFn.fn("", body, (role) => {
      setRoles((prev) => [
        ...prev,
        {
          ...role,
          pages,
        },
      ])

      newRoleForm.reset()
      setSelectedPages({})
      modalRef.current?.close()
    })
  }

  /* =======================================================
     Edit
     ======================================================= */

  const handleEdit = (_id: string) => {
    const role = roles.find(
      (item) => item._id === _id
    )

    if (!role) return

    editRoleForm.reset({
      _id: role._id,
      name: role.name,
    })

    const pages: Record<string, string[]> = {}

    role.pages?.forEach((page) => {
      pages[page.link] = page.permissions
    })

    setSelectedPages(pages)

    editRef.current?.showModal()
  }

  const editSubmit = async (
    data: EditRoleForm
  ) => {
    const pages = buildPages()

    const body = JSON.stringify({
      _id: data._id,
      name: data.name,
      pages,
    })

    await putFn.fn("", body, (result) => {
      setRoles((prev) =>
        prev.map((role) =>
          role._id === result._id
            ? {
              ...role,
              ...result,
              pages,
            }
            : role
        )
      )

      editRoleForm.reset()
      setSelectedPages({})
      editRef.current?.close()
    })
  }

  /* =======================================================
     Delete
     ======================================================= */

  const del = async (_id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this role?"
      )
    ) {
      return
    }

    await deleteFn.fn(
      `/api/web/roles?id=${_id}`,
      JSON.stringify({}),
      (result) => {
        setRoles((prev) =>
          prev.filter(
            (role) => role._id !== result
          )
        )
      }
    )
  }

  /* =======================================================
     Fetch
     ======================================================= */

  useEffect(() => {
    if (!hasHydrated || !masterAccountId) {
      return
    }

    const body = JSON.stringify({})

    getFeaturesFn.fn(
      "/api/web/features",
      body,
      () => { }
    )

    getFn.fn(
      `/api/web/roles?id=${masterAccountId}`,
      body,
      (result) => {
        setRoles(result)
      }
    )

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, masterAccountId])

  /* =======================================================
     Auth
     ======================================================= */

  useEffect(() => {
    if (!hasHydrated) return

    if (!loggedIn) {
      router.push("/login")
      return
    }

    if (!isSuperAdmin) {
      router.push("/dashboard")
    }
  }, [
    hasHydrated,
    loggedIn,
    isSuperAdmin,
    router,
  ])

  if (
    !hasHydrated ||
    !loggedIn ||
    !isSuperAdmin
  ) {
    return null
  }

  /* =======================================================
     Render
     ======================================================= */

  return (
    <>
      <div className="h-full p-3 md:p-6 flex flex-col gap-3">

        <span className="text-2xl font-bold text-gray-800">
          Role Management
        </span>

        <div className="bg-white h-full border-t-4 border-blue-900 rounded-lg shadow-lg flex flex-col p-6 gap-6">

          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-700">
              Existing Roles
            </h2>

            <button
              onClick={newRole}
              className="btn btn-primary ml-auto shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto">
            {getFn.loading ? (
              <div className="flex justify-center p-10">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : (
              <table className="table table-zebra w-full text-black">
                <thead className="bg-gray-50 text-black">
                  <tr>
                    <th>Role Name</th>
                    <th className="text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {roles.map((role) => (
                    <tr key={role._id}>
                      <td className="font-medium text-blue-900">
                        {role.name}
                      </td>

                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            className="btn btn-sm btn-outline btn-info"
                            onClick={() =>
                              handleEdit(role._id)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="btn btn-sm btn-outline btn-error"
                            onClick={() =>
                              del(role._id)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          Edit Modal
          ===================================================== */}

      <RoleModal
        modalRef={editRef}
        title="Edit Role Permissions"
        submitLabel="Save Changes"
        name={editRoleForm.watch("name")}
        onNameChange={(value) =>
          editRoleForm.setValue("name", value)
        }
        onSubmit={editRoleForm.handleSubmit(editSubmit)}
        onClose={() => {
          editRef.current?.close()
          editRoleForm.reset()
          setSelectedPages({})
        }}
        features={features}
        selectedPages={selectedPages}
        togglePermission={togglePermission}
        selectAllPermissions={selectAllPermissions}
        clearAllPermissions={clearAllPermissions}
      />

      {/* =====================================================
          Add Modal
          ===================================================== */}

      <RoleModal
        modalRef={modalRef}
        title="Create New Role"
        submitLabel="Create Role"
        name={newRoleForm.watch("name")}
        onNameChange={(value) =>
          newRoleForm.setValue("name", value)
        }
        onSubmit={newRoleForm.handleSubmit(submit)}
        onClose={() => {
          modalRef.current?.close()
          newRoleForm.reset()
          setSelectedPages({})
        }}
        features={features}
        selectedPages={selectedPages}
        togglePermission={togglePermission}
        selectAllPermissions={selectAllPermissions}
        clearAllPermissions={clearAllPermissions}
      />
    </>
  )
}

export default withAuth(Roles)