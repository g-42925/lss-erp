"use client"

import Link from "next/link";
import Image from "next/image"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import Sidebar from "@/components/sidebar";
import { useForm } from "react-hook-form"
import { useRef,useState,useEffect } from "react"
import { useRouter } from 'next/navigation'


export default function List(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
	const modalRef = useRef<HTMLDialogElement>(null)
  const editRef = useRef<HTMLDialogElement>(null)

  const [products,setProducts] = useState<any[]>([])
  const [role,setRole] = useState<string>('')
  const [newRoleName,setNewRoleName] = useState<string>('')
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [query,setQuery] = useState<string>('')

  const [selectedPage,setSelectedPage] = useState<string>('')
  
  const [selected,setSelected] = useState<any>({})

  const newRoleForm = useForm()
  const editRoleForm = useForm()
  const router = useRouter()

  const putFn = useFetch<any,any>({
    url:'/api/web/roles',
    method:'PUT'
  })

  const addFn = useFetch<any,any>({
    url:'/api/web/roles',
    method:'POST',
    onError:(m) => {
      alert(m)
    }
  })

  var getFn = useFetch<any[],any>({
    url:`/api/web/products?id=xxx`,
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
    const pages = data.page.join('/')
		const body = JSON.stringify({
      ...data,
      id:masterAccountId,
      page:pages
    })

    await addFn.fn('',body,(role) => {
      modalRef.current?.close()

      setRoles(
        [
          ...roles,
          role,
        ]
      )

    })
  }

  async function search(v:string){
    if(v.length > 0){
      var result = roles.filter((r) => {
        return r.name.includes(v)
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
    const page = data.page.join('/')
    const body = JSON.stringify({
      ...data,
      page:page
    })

    await putFn.fn('',body,(result) => {
      var [target] = roles.filter((r) => r._id == result._id)
      
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
      setRoles(
        roles.filter((r) => r._id != result)
      )
    })
  }

  async function edit(_id:string){
    var [filter] = roles.filter((r) => r._id == _id)

    editRoleForm.reset({
      _id:filter._id,
      name:filter.name,
      permission:filter.permission,
      page:filter.page.split('/')
    })

    setNewRoleName(filter.name)

    editRef.current?.showModal()
  }

  useEffect(() => {
    if(hasHydrated){
      const url = `/api/web/products?id=${masterAccountId}&type=all`
      
      const body = JSON.stringify({})
     
      getFn.fn(url,body,(result) => {
        setProducts(result)
      })
    }
  },[masterAccountId])

  if(!hasHydrated) return null
  if(!loggedIn) router.push('/login')
  if(!isSuperAdmin) router.push('/dashboard')
  
  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Products <span className="text-sm leading-loose">Manage product</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All product</span>
            <button disabled onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
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
                      <th>Product</th>
                      <th>Category</th>
                      <th>Packaging</th>
                      <th>Unit</th>
                      <th>Price</th>
                      <th>Tax</th>
                      <th>Selling Price Tax Type</th>
                      <th>Type</th>
                      <th>...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      searchResult.length < 1
                      ?
                      products.map((p,index) => {
                        return (
                          <tr key={index}>
                            <td>{p.productName}</td>
                            <td>{p.category}</td>
                            <td>{p.unit ?? '-'}</td>
                            <td>{p.altUnit ?? '-'}</td>
                            <td>{p.sellingPrice}</td>
                            <td>{p.applicableTax}</td>
                            <td>{p.sellingPriceTaxType}</td>
                            <td>{p.productType}</td>
                            <td>
                              <button>
                                <Link href={p.productType === 'service' ? `/products/xedit?id=${p._id}` : `/products/edit?id=${p._id}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                  </svg>
                                </Link>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                      :
                      searchResult.map((role,index) => {
                        return (
                          <tr key={index}>
                            <td>{role.name}</td>
                            <td className="flex flex-row gap-3">
                              <button className="btn" onClick={() => edit(role._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                                Edit
                              </button>
                              <button className="btn" onClick={() => del(role._id)}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                                  Delete
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
						<form onSubmit={editRoleForm.handleSubmit(editSubmit)} className="h-96 relative flex flex-col gap-3">
							<input {...editRoleForm.register('_id')} type="hidden" placeholder="current role _id " className="w-full p-3 rounded-md border1 border-black"/>
              <input {...editRoleForm.register("name")} type="text" placeholder="current role name" className="w-full p-3 rounded-md border-1 border-black"/>
              <select {...editRoleForm.register("permission")} className="select w-full">
                <option disabled>select permission</option>
                <option value="readonly">Read only</option>
                <option value="addonly">Add only</option>
                <option value="addandedit">Add and edit</option>
              </select>
              <div className="flex flex-row gap-3">
                <label className="label">
                  <input {...editRoleForm.register("page")} value="suppliers" type="checkbox" className="checkbox" /> Suppliers
                </label>
                <label className="label">
                  <input {...editRoleForm.register("page")} value="customers" type="checkbox" className="checkbox" /> Customers
                </label>
                <label className="label">
                  <input {...editRoleForm.register("page")} value="contacts" type="checkbox" className="checkbox" /> Contacts
                </label>
              </div>
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
						<span className="text-2xl">Add Role</span>
						<form onSubmit={newRoleForm.handleSubmit(submit)} className="h-96 relative flex flex-col gap-3">
							<input {...newRoleForm.register("name")} type="text" placeholder="new role name" className="mb-3 w-full p-3 rounded-md border-1 border-black"/>
              <select {...newRoleForm.register("permission")} className="select w-full">
                <option disabled selected>select permission</option>
                <option value="readonly">Read only</option>
                <option value="addonly">Add only</option>
                <option value="addandedit">Add and edit</option>
              </select>
              <div className="flex flex-row gap-3">
                <label className="label">
                  <input value="suppliers" {...newRoleForm.register("page")} type="checkbox" className="checkbox" /> Suppliers
                </label>
                <label className="label">
                  <input value="customers" {...newRoleForm.register("page")} type="checkbox" className="checkbox" /> Customers
                </label>
                <label className="label">
                  <input value="contacts" {...newRoleForm.register("page")} type="checkbox" className="checkbox" /> Contacts
                </label>
              </div>
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