"use client"

import Image from "next/image"
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import useFetch from "@/hooks/useFetch";

export default function Users(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  
  const [roles,setRoles] = useState<any[]>([])
  const [users,setUsers] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [selected,setSelected] = useState<any>({})
  
  const newUserForm = useForm();
  const editForm = useForm();
  
  var getUsersFn = useFetch<any[],any>({
    url:`/api/web/users?id=xxx`,
    method:'GET'
  })

  var getRolesFn = useFetch<any[],any>({
    url:`/api/web/roles?id=xxx`,
    method:'GET'
  })

  var addFn = useFetch<any,any>({
    url:'/api/web/users',
    method:'POST'
  })

  var editFn = useFetch<any,any>({
    url:'/api/web/users',
    method:'PUT'
  })

  var deleteFn = useFetch<any[],any>({
    url:`/api/web/users?id=xxx`,
    method:'DELETE',
    onError:(m) => {
      alert(deleteFn.message)
    }
  })


  async function search(v:string){
    if(v.length > 0){
      var result = users.filter((r) => {
        return r.username.includes(v)
      })

      if(result.length > 0){
        setSearchResult(
          [
            ...result
          ]
        )
      }
      else{
        setSearchResult(
          []
        )
      }
    }
    else{
      setSearchResult(
        []
      )
    }
  }

  function edit(_id:string){
    var [user] = users.filter((u) => {
      return u._id === _id
    })

    editForm.reset({
      _id:user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      roleName:user.roleName
    })

    editRef.current?.showModal()
  }

  async function handleEdit(data:any){
    const body = JSON.stringify(data)

    if(data.name.length < 1 || data.username.length < 1 || data.email.length < 1){
      alert('all field is required')
    }
    else{
      await editFn.fn('',body,(result) => {
        var [filtered] = users.filter((u) => u._id == result._id)
        filtered.name = result.name
        filtered.username = result.username
        filtered.email = result.email
        filtered.roleName = result.roleName
        filtered.roleId = result.roleId
  
        setSearchResult([])
  
        editRef.current?.close()
      })
    }
  }

  async function del(_id:string){
    var url = `/api/web/users?id=${_id}`
    var body = JSON.stringify({})

    await deleteFn.fn(url,body,(result) =>{
      setUsers(
        users.filter((u) => u._id != result)
      )

      setSearchResult(
        []
      )
    })
  }

  async function submit(data:any){
    const [roleName,roleId] = data.roleName.split('/')
    
    const body = JSON.stringify({
      ...data,
      roleName,
      roleId,
      isSuperAdmin:false,
      masterAccountId
    })
      
    await addFn.fn('',body,(result) => {
      modalRef.current?.close()
      setUsers(
        [
          ...users,
          result
        ]
      )
    })

  }

  if(!hasHydrated) return null
  if(!loggedIn) redirect('/login')
  if(!isSuperAdmin) redirect('/dashboard')

  useEffect(() => {
    if(hasHydrated){
      const url1 = `/api/web/roles?id=${masterAccountId}` 
      const url2 = `/api/web/users?id=${masterAccountId}`
  
      const body = JSON.stringify({})

      getUsersFn.fn(url2,body,(result) => {
        setUsers(result)
      })
     
      getRolesFn.fn(url1,body,(result) => {
        setRoles(result)
      })
    }
  },[masterAccountId])
  
  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Users <span className="text-sm leading-loose">Manage users</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row ">
            <span className="self-center">All users</span>
            <button onClick={() => modalRef.current?.showModal()}  className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>
          <div className="flex flex-row">
            <div className="flex flex-row gap-2 items-center">
              Show
              <select className="select w-16">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <div className="ml-auto mr-auto flex flex-row gap-1">
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Export to csv
              </div>
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Export to excel
              </div>
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Export to pdf
              </div>
              <div className="flex flex-row border-2 border-black p-1 rounded-md items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
                </svg>
                Print
              </div>
            </div>
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
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
                <table className="table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      users.map((user,index) => {
                        return (
                          <tr key={index}>
                            <td>{user.username}</td>
                            <td>{user.name}</td>
                            <td>{user.roleName}</td>
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
                                  Delete
                              </button>
                            </td>
                          </tr>
                        )
                      })
                      :
                      searchResult.map((user,index) => {
                        return (
                          <tr key={index}>
                            <td>{user.username}</td>
                            <td>{user.name}</td>
                            <td>{user.roleName}</td>
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
			<dialog id="my_modal_2" ref={editRef} className="modal">
 				<div className="modal-box">
					<div className="flex flex-col gap-3">
						<span className="text-2xl">Edit User</span>
						<form onSubmit={editForm.handleSubmit(handleEdit)} className="h-72 relative">
              <input {...editForm.register("_id")} type="hidden" placeholder="_id" className="mb-3 w-full p-3 rounded-md border-1 border-black"/> 
              <input {...editForm.register("name")} type="text" placeholder="name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <input {...editForm.register("username")} type="text" placeholder="username" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>							
              <input {...editForm.register("email")} type="text" placeholder="email" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <select {...editForm.register("roleName")} className="select w-full">
                <option disabled>Pick a role</option>
                {
                  roles.map((r) => {
                    return (
                      <option value={`${r.name}/${r._id}`}>{r.name}</option>
                    )
                  })
                }
              </select>	
              {editFn.noResult || editFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></> }

              <div className="modal-action">
                <form method="dialog">
                  <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
								    Cancel
							    </button>		
                </form>
              </div>					
							<button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
								Edit
							</button>
						</form>
		      </div>
				</div>
			</dialog>
			<dialog id="my_modal_1" ref={modalRef} className="modal">
 				<div className="modal-box">
					<div className="flex flex-col gap-3">
						<span className="text-2xl">Add User</span>
						<form onSubmit={newUserForm.handleSubmit(submit)} className="h-90 relative">
              <input {...newUserForm.register("name")} type="text" placeholder="name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <input {...newUserForm.register("username")} type="text" placeholder="username" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>							
              <input {...newUserForm.register("email")} type="text" placeholder="email" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
							<input {...newUserForm.register("password")} type="text" placeholder="password" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <select {...newUserForm.register("roleName")} className="select w-full mb-3">
                <option disabled>Pick a role</option>
                {
                  roles.map((r) => {
                    return (
                      <option key={r._id} value={`${r.name}/${r._id}`}>{r.name}</option>
                    )
                  })
                }
              </select>	
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="user">something went wrong</label> : <></> }
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
    message:string
}