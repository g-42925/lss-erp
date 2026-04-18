"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'

export default function XList() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const [products, setProducts] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [query, setQuery] = useState<string>('')

  const router = useRouter()

  const getFn = useFetch<any[], any>({
    url: `/api/web/products?id=xxx`,
    method: 'GET'
  })

  const deleteFn = useFetch<any[], any>({
    url: `/api/web/products?id=xxx`,
    method: 'DELETE',
    onError: (m) => {
      alert(m)
    }
  })

  async function search(v: string) {
    if (v.length > 0) {
      const result = products.filter((r) => {
        return r.productName.toLowerCase().includes(v.toLowerCase())
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

  async function del(_id: string) {
    const url = `/api/web/products?id=${_id}`
    const body = JSON.stringify({})

    const confirmed = window.confirm("Are you sure you want to delete this service product?")
    if (!confirmed) return

    await deleteFn.fn(url, body, (result) => {
      setProducts(
        products.filter((r) => r._id != result)
      )
      setSearchResult(
        searchResult.filter((r) => r._id != result)
      )
    })
  }

  useEffect(() => {
    if (hasHydrated) {
      // Fetch specifically service products
      const url = `/api/web/products?id=${masterAccountId}&type=service`

      const body = JSON.stringify({})

      getFn.fn(url, body, (result) => {
        console.log(result)
        setProducts(result)
      })
    }
  }, [masterAccountId])

  if (!hasHydrated) return null
  if (!loggedIn) router.push('/login')
  if (!isSuperAdmin) router.push('/dashboard')

  const displayProducts = searchResult.length > 0 ? searchResult : products

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Service Products <span className="text-sm leading-loose text-gray-500">Manage services</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-row">
            <span className="self-center font-semibold text-gray-700">All services</span>
            <Link href="/products/xadd" className="btn ml-auto bg-black text-white hover:bg-gray-800 border-none shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </Link>
          </div>
          <div className="flex flex-row">
            <div className="flex flex-row gap-2 items-center text-gray-600">
              Show
              <select className="select select-bordered w-20 bg-gray-50">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <input onChange={(e) => { setQuery(e.target.value); search(e.target.value); }} value={query} type="search" placeholder="Search Services" className="ml-auto border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {
            getFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner text-blue-900 loading-xl"></span>
              </div>
              :
              getFn.error || getFn.noResult
                ?
                <div className="flex-1 flex flex-col justify-center items-center text-red-500">
                  <p>{getFn.message || "No services found."}</p>
                </div>
                :
                <div className="overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
                  <table className="table w-full text-center whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="font-semibold text-left p-4">Service Name</th>
                        <th className="font-semibold p-4">Category</th>
                        <th className="font-semibold p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {
                        displayProducts.map((p, index) => {
                          return (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="text-left font-medium p-4 text-gray-900">{p.productName}</td>
                              <td className="p-4 text-gray-600">{p.category}</td>
                              <td className="p-4 flex flex-row gap-3 justify-center items-center">
                                <Link href={`/products/xedit?id=${p._id}`} className="btn btn-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                  </svg>
                                  Edit
                                </Link>
                                <button className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-none" onClick={() => del(p._id)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
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
    </>
  )
}
