"use client"

import Image from "next/image"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef,useState,useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function Roles(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [categories,setCategories] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])

  const newCategoryForm = useForm()
  const editCategoryForm = useForm()
  const router = useRouter()

  const putFn = useFetch<any,any>({
    url:'/api/web/categories',
    method:'PUT'
  })

  const addFn = useFetch<any,any>({
    url:'/api/web/categories',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var getFn = useFetch<any[],any>({
    url:`/api/web/roles?id=xxx`,
    method:'GET'
  })

  var deleteFn = useFetch<any[],any>({
    url:`/api/web/roles?id=xxx`,
    method:'DELETE',
    onError:(m) => {
      alert(m)
    }
  })

  async function submit(data:any){
    const body = JSON.stringify({
      ...data,
      id:masterAccountId,
    })

    await addFn.fn('',body,(c) => {
      modalRef.current?.close()

      setCategories(
        [
          ...categories,
          c,
        ]
      )

    })
  }

  async function search(v:string){
    if(v.length > 0){
      var result = categories.filter((r) => {
        return r.categoryCode.includes(v)
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

  async function editSubmit(data:any){
    const body = JSON.stringify({
      ...data,
    })

    await putFn.fn('',body,(result) => {
      var [target] = categories.filter((r) => r._id == result._id)
      
      Object.keys(target).forEach(key => {
        target[key] = result[key]
      })

      setSearchResult([])

      editRef.current?.close()
    })
  }

  async function del(_id:string){
    var url = `/api/web/roles?id=${_id}`
    var body = JSON.stringify({})

    await deleteFn.fn(url,body,(result) =>{
      setCategories(
        categories.filter((c) => c._id != result)
      )
    })
  }

  async function edit(_id:string){
    var [filter] = categories.filter((c) => c._id == _id)

    editCategoryForm.reset({
      _id:filter._id,
      name:filter.name,
      categoryCode:filter.categoryCode,
      description:filter.description,
    })

    editRef.current?.showModal()
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/categories?id=${masterAccountId}` 
  
      const body = JSON.stringify({})
     
      getFn.fn(url,body,(result) => {
        setCategories(result)
      })
    }
  },[masterAccountId])

  if(!hasHydrated) return null
  if(!loggedIn) router.push('/login')
  if(!isSuperAdmin) router.push('/dashboard')
  
  
  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Categories <span className="text-sm leading-loose">Manage your categories</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All roles</span>
            <button onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
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
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
          </div>
          {
            getFn.loading
            ?
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="loading loading-spinner loading-xl"></span>
            </div>
            :
            getFn.error || getFn.noResult
            ?
            <div>
              <p>{getFn.message}</p>
            </div>
            :
            <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Category Code</th>
                      <th>Description</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      categories.map((c,index) => {
                        return (
                          <tr key={index}>
                            <td>{c.name}</td>
                            <td>{c.categoryCode}</td>
                            <td>{c.description}</td>
                            <td className="flex flex-row gap-3">
                              <button className="btn" onClick={() => edit(c._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
                              </button>
                            </td>
                          </tr>
                        )
                      })
                      :
                      searchResult.map((c,index) => {
                        return (
                          <tr key={index}>
                            <td>{c.name}</td>
                            <td>{c.categoryCode}</td>
                            <td>{c.description}</td>
                            <td className="flex flex-row gap-3">
                              <button className="btn" onClick={() => edit(c._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
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
            <span className="text-2xl">Edit Role</span>
            <form onSubmit={editCategoryForm.handleSubmit(editSubmit)} className="h-96 relative flex flex-col gap-3">
              <input {...editCategoryForm.register("name")} type="text" placeholder="new category name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <input {...editCategoryForm.register("categoryCode")} type="text" placeholder="new category code" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <textarea {...editCategoryForm.register("description")} className="textarea mb-3 w-full p-3 rounded-md border-1 border-black" placeholder="new category description"></textarea>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
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
            <span className="text-2xl">Add Category</span>
            <form onSubmit={newCategoryForm.handleSubmit(submit)} className="h-96 relative flex flex-col gap-3">
              <input {...newCategoryForm.register("name")} type="text" placeholder="new category name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <input {...newCategoryForm.register("categoryCode")} type="text" placeholder="new category code" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <textarea {...newCategoryForm.register("description")} className="textarea mb-3 w-full p-3 rounded-md border-1 border-black" placeholder="new category description"></textarea>
              {addFn.noResult || addFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
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
    </Sidebar>
  )
}

type Failed = {
  message:string
}