"use client"

import withAuth from "@/hofs/withAuth"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useForm } from "react-hook-form"
import { useRef, useState, useEffect } from "react"
import { useRouter } from 'next/navigation'

interface RoleData {
  _id: string;
  name: string;
  pages: Array<{
    link: string;
    permissions: string[];
  }>;
}

interface Feature {
  _id: string;
  name: string;
  link: string;
}

interface FeatureGroup {
  _id: string;
  features: Feature[];
}

function Roles() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [roles, setRoles] = useState<RoleData[]>([])
  const [searchResult, setSearchResult] = useState<RoleData[]>([])
  const [selectedPages, setSelectedPages] = useState<Record<string, string[]>>({})

  const newRoleForm = useForm<{ name: string }>()
  const editRoleForm = useForm<{ _id: string, name: string }>()
  const router = useRouter()

  const putFn = useFetch<RoleData, any>({
    url: '/api/web/roles',
    method: 'PUT'
  })

  const addFn = useFetch<RoleData, any>({
    url: '/api/web/roles',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const getFn = useFetch<RoleData[], any>({
    url: `/api/web/roles?id=xxx`,
    method: 'GET'
  })

  const getFeaturesFn = useFetch<FeatureGroup[], any>({
    url: `/api/web/features`,
    method: 'GET'
  })

  const deleteFn = useFetch<string, any>({
    url: `/api/web/roles?id=xxx`,
    method: 'DELETE',
    onError: (m) => {
      alert(m)
    }
  })

  const submit = async (data: { name: string }) => {
    const pagesArray = Object.entries(selectedPages)
      .filter(([_, perms]) => perms.length > 0)
      .map(([link, perms]) => ({ link, permissions: perms }))

    const body = JSON.stringify({
      name: data.name,
      pages: pagesArray,
      id: masterAccountId,
    })

    await addFn.fn('', body, (role) => {
      modalRef.current?.close()
      setRoles([...roles, { ...role, pages: pagesArray }])
      setSelectedPages({})
      newRoleForm.reset()
    })
  }

  const search = (v: string) => {
    if (v.length > 0) {
      const result = roles.filter((r) => r.name.toLowerCase().includes(v.toLowerCase()))
      setSearchResult(result)
    } else {
      setSearchResult([])
    }
  }

  const editSubmit = async (data: { _id: string, name: string }) => {
    const pagesArray = Object.entries(selectedPages)
      .filter(([_, perms]) => perms.length > 0)
      .map(([link, perms]) => ({ link, permissions: perms }))

    const body = JSON.stringify({
      _id: data._id,
      name: data.name,
      pages: pagesArray
    })

    await putFn.fn('', body, (result) => {
      setRoles(roles.map(r => r._id === result._id ? { ...r, ...result } : r))
      setSearchResult([])
      editRef.current?.close()
      setSelectedPages({})
    })
  }

  const del = async (_id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return
    const url = `/api/web/roles?id=${_id}`
    const body = JSON.stringify({})

    await deleteFn.fn(url, body, (result) => {
      setRoles(roles.filter((r) => r._id != result))
    })
  }

  const handleEdit = (_id: string) => {
    const filter = roles.find((r) => r._id == _id)
    if (!filter) return

    editRoleForm.reset({
      _id: filter._id,
      name: filter.name,
    })

    const initialPages: Record<string, string[]> = {}
    filter.pages?.forEach((p) => {
      initialPages[p.link] = p.permissions
    })
    setSelectedPages(initialPages)
    editRef.current?.showModal()
  }

  const togglePermission = (link: string, permission: string) => {
    setSelectedPages(prev => {
      const current = prev[link] || []
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission]

      return { ...prev, [link]: updated }
    })
  }

  const PermissionToggle = ({ link, permission, label }: { link: string, permission: string, label: string }) => (
    <label className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-100 p-1 rounded">
      <input
        type="checkbox"
        className="checkbox checkbox-xs"
        checked={selectedPages[link]?.includes(permission) || false}
        onChange={() => togglePermission(link, permission)}
      />
      {label}
    </label>
  )

  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/roles?id=${masterAccountId}`
      const featuresUrl = `/api/web/features`
      const body = JSON.stringify({})

      getFeaturesFn.fn(featuresUrl, body, () => { })
      getFn.fn(url, body, (result) => { setRoles(result) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl font-bold text-gray-800">Role Management <span className="text-sm font-normal text-gray-500 ml-2">Define granular tool access</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 rounded-lg shadow-lg flex flex-col p-6 gap-6">
          <div className="flex flex-row items-center">
            <h2 className="text-xl font-semibold text-gray-700">Existing Roles</h2>
            <button onClick={() => {
              setSelectedPages({})
              newRoleForm.reset()
              modalRef.current?.showModal()
            }} className="btn btn-primary ml-auto shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Role
            </button>
          </div>

          <div className="flex flex-row gap-4">
            <input onChange={(e) => search(e.target.value)} type="search" placeholder="Filter roles..." className="input input-bordered w-full max-w-xs text-black" />
          </div>

          <div className="overflow-x-auto">
            {getFn.loading ? (
              <div className="flex justify-center p-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : (
              <table className="table table-zebra w-full text-black">
                <thead className="bg-gray-50">
                  <tr>
                    <th>Role Name</th>
                    <th>Permissions Detailed</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(searchResult.length > 0 ? searchResult : roles).map((role, index) => (
                    <tr key={index} className="hover">
                      <td className="font-medium text-blue-900">{role.name}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {role.pages?.slice(0, 3).map((p, i) => (
                            <span key={i} className="badge badge-ghost badge-sm text-[10px]">
                              {p.link.split('/').pop()} ({p.permissions.join(',')})
                            </span>
                          ))}
                          {role.pages?.length > 3 && <span className="text-xs text-gray-400">+{role.pages.length - 3} more</span>}
                        </div>
                      </td>
                      <td className="text-right flex justify-end gap-2">
                        <button className="btn btn-sm btn-outline btn-info" onClick={() => handleEdit(role._id)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-outline btn-error" onClick={() => del(role._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Edit Role Modal */}
      <dialog ref={editRef} className="modal text-black">
        <div className="modal-box w-11/24 max-w-5xl h-[80vh] flex flex-col">
          <h3 className="font-bold text-lg mb-4">Edit Role Permissions</h3>
          <form onSubmit={(e) => { e.preventDefault(); editRoleForm.handleSubmit(editSubmit)(e); }} className="flex-1 flex flex-col gap-4 overflow-hidden">
            <input {...editRoleForm.register('_id')} type="hidden" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Role Name</label>
              <input {...editRoleForm.register("name")} type="text" className="input input-bordered w-full" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 border rounded-lg p-4 bg-gray-50">
              <span className="text-sm font-semibold mb-3 block">Feature Access & Actions</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFeaturesFn?.result?.map((group, gIdx) => (
                  <div key={gIdx} className="card bg-white shadow-sm border p-3">
                    <h4 className="font-bold text-blue-800 text-sm mb-2 border-b uppercase pb-1">{group._id}</h4>
                    <div className="flex flex-col gap-3">
                      {group.features.map((f, fIdx) => (
                        <div key={fIdx} className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-700">{f.name}</span>
                          <div className="flex flex-wrap gap-2 ml-1">
                            <PermissionToggle link={f.link} permission="view" label="View" />
                            <PermissionToggle link={f.link} permission="create" label="Add" />
                            <PermissionToggle link={f.link} permission="edit" label="Edit" />
                            <PermissionToggle link={f.link} permission="delete" label="Del" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-action mt-auto pt-4">
              <button type="button" className="btn btn-ghost" onClick={() => editRef.current?.close()}>Cancel</button>
              <button type="submit" className="btn btn-primary px-8">Save Changes</button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Add Role Modal */}
      <dialog ref={modalRef} className="modal text-black">
        <div className="modal-box w-11/24 max-w-5xl h-[80vh] flex flex-col">
          <h3 className="font-bold text-lg mb-4">Create New Role</h3>
          <form onSubmit={(e) => { e.preventDefault(); newRoleForm.handleSubmit(submit)(e); }} className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Role Name</label>
              <input {...newRoleForm.register("name")} type="text" placeholder="e.g. Sales Manager" className="input input-bordered w-full" />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 border rounded-lg p-4 bg-gray-50">
              <span className="text-sm font-semibold mb-3 block">Configure Permissions</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFeaturesFn?.result?.map((group, gIdx) => (
                  <div key={gIdx} className="card bg-white shadow-sm border p-3">
                    <h4 className="font-bold text-blue-800 text-sm mb-2 border-b uppercase pb-1">{group._id}</h4>
                    <div className="flex flex-col gap-3">
                      {group.features.map((f, fIdx) => (
                        <div key={fIdx} className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-700">{f.name}</span>
                          <div className="flex flex-wrap gap-2 ml-1">
                            <PermissionToggle link={f.link} permission="view" label="View" />
                            <PermissionToggle link={f.link} permission="create" label="Add" />
                            <PermissionToggle link={f.link} permission="edit" label="Edit" />
                            <PermissionToggle link={f.link} permission="delete" label="Del" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-action mt-auto pt-4">
              <button type="button" className="btn btn-ghost" onClick={() => modalRef.current?.close()}>Cancel</button>
              <button type="submit" className="btn btn-primary px-8">Create Role</button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  )
}

export default withAuth(Roles)