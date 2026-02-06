"use client"

import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";

import { useForm } from "react-hook-form"
import { useRef,useState,useEffect } from "react"
import { useRouter } from 'next/navigation'

export default function Unit(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [unit,setUnit] = useState<any[]>([])
  const [searchResult,setSearchResult] = useState<any[]>([])

  const newUnitForm = useForm()
  const editUnitForm = useForm()
  const router = useRouter()

  const putFn = useFetch<any,any>({
    url:'/api/web/unit',
    method:'PUT',
    onError:(m) => {
      alert(m)
    }
  })

  const addFn = useFetch<any,any>({
    url:'/api/web/unit',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var getFn = useFetch<any[],any>({
    url:`/api/web/unit?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })

  var deleteFn = useFetch<any[],any>({
    url:`/api/web/unit?id=xxx`,
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

      setUnit(
        [
          ...unit,
          c,
        ]
      )

    })
  }

  async function search(v:string){
    if(v.length > 0){
      var result = unit.filter((r) => {
        return r.shortName.includes(v)
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
      var [target] = unit.filter((r) => r._id == result._id)

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
      setUnit(
        unit.filter((c) => c._id != result)
      )
    })
  }

  async function edit(_id:string){
    var [filter] = unit.filter((c) => c._id == _id)

    editUnitForm.reset({
      _id:filter._id,
      name:filter.name,
      shortName:filter.shortName,
      allowDecimal:filter.allowDecimal,
    })

    editRef.current?.showModal()
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/unit?id=${masterAccountId}` 
  
      const body = JSON.stringify({})
     
      getFn.fn(url,body,(result) => {
        setUnit(result)
      })
    }
  },[masterAccountId])

  if(!hasHydrated) return null
  if(!loggedIn) router.push('/login')
  if(!isSuperAdmin) router.push('/dashboard')
  
  
  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Unit <span className="text-sm leading-loose">Manage your unit</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All your unit</span>
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
                      <th>Short Name</th>
                      <th>Allow Decimal</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      unit.map((u,index) => {
                        return (
                          <tr key={index}>
                            <td>{u.name}</td>
                            <td>{u.shortName}</td>
                            <td>{u.allowDecimal}</td>
                            <td className="flex flex-row gap-3">
                              <button className="btn" onClick={() => edit(u._id)}>
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
                      searchResult.map((u,index) => {
                        return (
                          <tr key={index}>
                            <td>{u.name}</td>
                            <td>{u.shortName}</td>
                            <td>{u.allowDecimal}</td>
                            <td className="flex flex-row gap-3">
                              <button className="btn" onClick={() => edit(u._id)}>
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
            <span className="text-2xl">Edit Unit</span>
            <form onSubmit={editUnitForm.handleSubmit(editSubmit)} className="h-96 relative flex flex-col gap-3">
              <input {...editUnitForm.register("name")} type="text" placeholder="new unit name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <input {...editUnitForm.register("shortName")} type="text" placeholder="new unit short name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <select {...editUnitForm.register("allowDecimal")} className="appearance-none mb-3 w-full p-3 rounded-md border-1 border-black">
                <option disabled selected>pick an option</option>
                <option>no</option>
                <option>yes</option>
              </select>
              {putFn.noResult || putFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></> }
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
            <span className="text-2xl">Add Unit</span>
            <form onSubmit={newUnitForm.handleSubmit(submit)} className="h-96 relative flex flex-col gap-3">
              <input {...newUnitForm.register("name")} type="text" placeholder="new unit name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <input {...newUnitForm.register("shortName")} type="text" placeholder="new unit short name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <select {...newUnitForm.register("allowDecimal")} className="appearance-none mb-3 w-full p-3 rounded-md border-1 border-black">
                <option disabled selected>pick an option</option>
                <option>no</option>
                <option>yes</option>
              </select>
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