"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import CryptoJS from "crypto-js";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from '@hugeicons/react';
import { AddMaleIcon } from '@hugeicons/core-free-icons';
import { Edit03Icon } from '@hugeicons/core-free-icons';

import useAuth from "@/store/auth";
import useFetch from "@/hooks/useFetch";

export default function Users() {
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const router = useRouter()

  const [roles, setRoles] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [selected, setSelected] = useState<any>({})

  const newUserForm = useForm();
  const editForm = useForm();

  const getUsersFn = useFetch<any[], any>({
    url: `/api/web/users?id=xxx`,
    method: 'GET'
  })

  const getLocationFn = useFetch<any[], any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET'
  })

  const getRolesFn = useFetch<any[], any>({
    url: `/api/web/roles?id=xxx`,
    method: 'GET'
  })

  const addFn = useFetch<any, any>({
    url: '/api/web/users',
    method: 'POST',
    onError(m) {
      alert(m)
    },
  })

  const editFn = useFetch<any, any>({
    url: '/api/web/users',
    method: 'PUT',
    onError(m) {
      alert(m)
    },
  })

  const deleteFn = useFetch<any[], any>({
    url: `/api/web/users?id=xxx`,
    method: 'DELETE',
    onError: (m) => {
      alert(deleteFn.message)
    }
  })


  async function search(v: string) {
    if (v.length > 0) {
      const result = users.filter((r) => {
        return r.username.includes(v)
      })

      if (result.length > 0) {
        setSearchResult(
          [
            ...result
          ]
        )
      }
      else {
        setSearchResult(
          []
        )
      }
    }
    else {
      setSearchResult(
        []
      )
    }
  }

  function edit(_id: string) {
    const [user] = users.filter((u) => {
      return u._id === _id
    })

    editForm.reset({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: `${user.roleId}/${user.role}`,
      password: user.password,
      prevPassword: user.password
    })

    editRef.current?.showModal()
  }

  async function handleEdit(data: any) {
    const [roleId, role] = data.role.split('/')
    const body = JSON.stringify({
      ...data,
      roleId,
      role
    })

    if (data.name.length < 1 || data.email.length < 1) {
      alert('all field is required')
    }
    else {
      await editFn.fn('', body, (result) => {
        const [filtered] = users.filter((u) => u._id == result._id)
        filtered.name = result.name
        filtered.email = result.email
        filtered.role = result.role
        filtered.roleId = result.roleId
        filtered.locationId = result.locationId

        setSearchResult([])

        editRef.current?.close()
      })
    }
  }

  async function del(_id: string) {
    const url = `/api/web/users?id=${_id}`
    const body = JSON.stringify({})

    await deleteFn.fn(url, body, (result) => {
      setUsers(
        users.filter((u) => u._id != result)
      )

      setSearchResult(
        []
      )
    })
  }

  async function submit(data: any) {
    const [roleId, role] = data.role.split('/')

    const body = JSON.stringify({
      ...data,
      roleId,
      role,
      isSuperAdmin: false,
      masterAccountId
    })

    console.log(JSON.parse(body))

    await addFn.fn('', body, (result) => {
      modalRef.current?.close()
      setUsers(
        [
          ...users,
          result
        ]
      )
      newUserForm.reset()
    })
  }

  // Guard: superadmin-only redirect (must be in useEffect to preserve hooks order)
  useEffect(() => {
    if (hasHydrated && !isSuperAdmin) {
      router.replace('/dashboard')
    }
  }, [hasHydrated, isSuperAdmin, router])

  useEffect(() => {
    if (hasHydrated && isSuperAdmin) {
      const url1 = `/api/web/roles?id=${masterAccountId}`
      const url2 = `/api/web/users?id=${masterAccountId}`
      const url3 = `/api/web/location?id=${masterAccountId}`

      const body = JSON.stringify({})

      getUsersFn.fn(url2, body, (result) => {
        setUsers(result)
      })

      getRolesFn.fn(url1, body, (result) => {
        setRoles(result)
      })

      getLocationFn.fn(url3, body, (result) => { })
    }
  }, [hasHydrated, isSuperAdmin])

  // Block render while not hydrated or not authorised
  if (!hasHydrated || !isSuperAdmin) return null

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl text-black">Users <span className="text-sm leading-loose">Manage users</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row ">
            <span className="self-center text-black">All users</span>
            <button onClick={() => modalRef.current?.showModal()} className="ml-auto">
              <HugeiconsIcon
                icon={AddMaleIcon}
                size={24}
                color="currentColor"
                strokeWidth={1.5}
              />
            </button>
          </div>
          {
            getUsersFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getUsersFn.noResult || getUsersFn.error
                ?
                <div>
                  <p>{getUsersFn.message}</p>
                </div>
                :
                <div>
                  <table className="table text-black">
                    <thead className="text-black">
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          users.map((user, index) => {
                            return (
                              <tr key={index}>
                                <td>{user.name}</td>
                                <td>{user.role}</td>
                                <td className="max-w-[10ch] truncate">{user.email}</td>

                                <td className="flex flex-row gap-3">
                                  <button onClick={() => edit(user._id)} className="">
                                    <HugeiconsIcon
                                      icon={Edit03Icon}
                                      size={24}
                                      color="currentColor"
                                      strokeWidth={1.5}
                                    />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((user, index) => {
                            return (
                              <tr key={index}>
                                <td>{user.username}</td>
                                <td>{user.name}</td>
                                <td>{user.role}</td>
                                <td>{user.email}</td>

                                <td className="flex flex-row gap-3">
                                  <button onClick={() => edit(user._id)} className="btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                    </svg>
                                    Edit
                                  </button>
                                  <button className="btn" onClick={() => del(user._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                    Deletes
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                      }
                    </tbody>
                  </table>
                </div>
          }
        </div>
      </div>
      <dialog id="my_modal_2" ref={editRef} className="modal text-black">
        <div className="modal-box bg-white text-black h-120">
          <div className="flex flex-col gap-3">
            <span className="text-2xl">Edit User</span>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="h-72 relative">
              <input {...editForm.register("_id")} type="hidden" placeholder="_id" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...editForm.register("name")} type="text" placeholder="name" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...editForm.register("email")} type="text" placeholder="email" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...editForm.register("password")} type="password" placeholder="password" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...editForm.register("prevPassword")} type="hidden" placeholder="previous password" className="mb-3 w-full p-3 rounded-md border-1 border-black" readOnly />
              <input {...editForm.register("approvalCode")} type="text" placeholder="approval code" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <select {...editForm.register("role")} className="select w-full mb-3 bg-white border-1 border-black">
                {
                  roles.map((r) => {
                    return (
                      <option key={r._id} value={`${r._id}/${r.name}`}>{r.name}</option>
                    )
                  })
                }
              </select>
              <select {...editForm.register("locationId")} className="select w-full mb-3 bg-white border-1 border-black">
                {
                  getLocationFn?.result?.map((l) => {
                    return (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    )
                  })
                }
              </select>
              {editFn.noResult || editFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}

              <div className="modal-action">
                <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                    Cancel
                  </button>
                </form>
                <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                  Edit
                </button>
              </div>

            </form>
          </div>
        </div>
      </dialog>
      <dialog id="my_modal_1" ref={modalRef} className="modal text-black">
        <div className="modal-box bg-white text-black">
          <div className="flex flex-col gap-3 ">
            <span className="text-2xl">Add User</span>
            <form onSubmit={newUserForm.handleSubmit(submit)} className="h-110 relative">
              <input {...newUserForm.register("name")} type="text" placeholder="name" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...newUserForm.register("email")} type="text" placeholder="email" className="mb-3 w-full p-3 rounded-md border-1 border-black" />
              <input {...newUserForm.register("password")} type="text" placeholder="password" className="mb-3 w-full p-3 rounded-md border-1" />
              <input {...newUserForm.register("approvalCode")} type="text" placeholder="approval code" className="mb-3 w-full p-3 rounded-md border-1" />
              <select {...newUserForm.register("role")} className="select w-full mb-3 bg-white border-1 border-black">
                {
                  roles.map((r) => {
                    return (
                      <option key={r._id} value={`${r._id}/${r.name}`}>{r.name}</option>
                    )
                  })
                }
              </select>
              <select {...newUserForm.register("locationId")} className="select w-full mb-3 bg-white border-1 border-black">
                {
                  getLocationFn?.result?.map((l) => {
                    return (
                      <option key={l._id} value={l._id}>{l.name}</option>
                    )
                  })
                }
              </select>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></>}
              <div className="modal-action">
                <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                    Cancel
                  </button>
                </form>
              </div>
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Add
              </button>
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