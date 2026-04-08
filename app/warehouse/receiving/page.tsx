"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";

import { useRef, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";

export default function Receiving() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [locations, setLocations] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [disabled, setDisabled] = useState<boolean>(false)
  const [expiredFieldHide, setExpiredFieldHide] = useState<boolean>(false)

  const editRef = useRef<HTMLDialogElement>(null)

  const editPrForm = useForm()

  const router = useRouter()

  var fetchLocationsFn = useFetch<any[], any>({
    url: `/api/web/location?id=xxx`,
    method: 'GET'
  })

  var getFn = useFetch<any[], any>({
    url: `/api/web/purchases?id=xxx`,
    method: 'GET'
  })

  var editFn = useFetch<any, any>({
    url: `/api/web/purchases`,
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  function search(v: string) {
    if (v.length > 0) {
      var result = purchases.filter((r) => {
        return r.purchaseOrderNumber === v
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


  async function editSubmit(data: any) {
    var { max, product, estimatedPrice, supplier, finalPrice, ...rest } = data

    var additional = {
      isOpening: false,
      createdAt: new Date().toISOString().slice(0, 10),
      outQty: 0,
    }

    const batch = JSON.stringify(
      {
        ...rest,
        ...additional,
        qty: data.receivedQty
      }
    )

    if (parseInt(data.receivedQty) > max) {
      alert("Quantity cannot be higher than maximum remained")
    }
    else {
      await editFn.fn('', batch, (result) => {
        router.push('/products/stock')
      })
    }
  }

  async function edit(_id: string) {
    var [filter] = purchases.filter((p) => p._id == _id)

    console.log({ filter })

    if (!filter.product.haveExpiredDate) setExpiredFieldHide(
      true
    )

    editPrForm.reset({
      ...filter,
      productId: filter.product._id,
      product: filter.product.productName,
      supplier: filter.supplier.bussinessName,
      status: filter.status,
      receivedQty: filter.receivedQty,
      max: filter.quantity - filter.receivedQty,
      purchaseOrderNumber: filter.purchaseOrderNumber
    })

    if (filter.status != 'ordered') {
      setDisabled(true)
    }

    editRef.current?.showModal()
  }


  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/purchases?id=${masterAccountId}&type=product`
      const url2 = `/api/web/location?id=${masterAccountId}`

      const body = JSON.stringify({})

      fetchLocationsFn.fn(url2, body, (result) => {
        setLocations(result)
      })

      getFn.fn(url, JSON.stringify({}), (result) => {
        console.log(result)
        setPurchases(result)
      })
    }
  }, [masterAccountId])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Receiving</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
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
            <div className="ml-auto flex flex-row gap-3">
              <input defaultValue={new Date().toISOString().split("T")[0]} onChange={() => alert('ok')} type="date" className="border-1 border-black rounded-md p-3" />
              <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="border-1 border-black rounded-md p-3" />
            </div>
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
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Purchase Date</th>
                        <th>Purchase Order Number</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Received</th>
                        <th>...</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          purchases.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.purchaseOrderNumber}</td>
                                <td>{p.product.productName}</td>
                                <td>{p.quantity} ({p.product.purchaseUnit})</td>
                                <td>
                                  <Link href={{ pathname: '/warehouse/rlog', query: { so: p.purchaseOrderNumber } }}>
                                    {p.receivedQty}
                                  </Link>
                                </td>
                                <td>
                                  <button onClick={() => edit(p._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.date).toLocaleString('id-ID')}</td>
                                <td>{p.purchaseOrderNumber}</td>
                                <td>{p.product.productName}</td>
                                <td>{p.quantity} ({p.product.purchaseUnit})</td>
                                <td>
                                  <Link href={{ pathname: '/warehouse/rlog', query: { so: p.purchaseOrderNumber } }}>
                                    {p.receivedQty}
                                  </Link>
                                </td>
                                <td>
                                  <button onClick={() => edit(p._id)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
                                    </svg>
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
          <div className="flex flex-col ">
            <span className="text-2xl">Receive</span>
            <form onSubmit={editPrForm.handleSubmit(editSubmit)} className="h-120 relative flex flex-col gap-3">
              <div className="flex flex-row items-center gap-2">
                <label>Product</label>
                <input className="input w-full" {...editPrForm.register("product")} type="text" readOnly />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label>Quantity</label>
                <input className="input w-full" {...editPrForm.register("receivedQty")} type="text" />
              </div>
              <div className="flex flex-row items-center gap-2 hidden">
                <label>Quantity</label>
                <input className="input w-full" {...editPrForm.register("limiter")} type="text" />
              </div>
              {
                !expiredFieldHide
                  ?
                  <div className="flex flex-frow items-center gap-2">
                    <label>Expiry date</label>
                    <input className="input w-full" {...editPrForm.register("expiryDate")} type="date" />
                  </div>
                  :
                  <></>
              }

              <div className="flex flex-frow items-center">
                <label>Batch number</label>
                <input value={Date.now()} className="input w-full" {...editPrForm.register("batchNumber")} type="text" readOnly />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="w-[60px]">Location</label>
                <select  {...editPrForm.register("locationId")} className="select flex-1">
                  <option>
                    Select Location
                  </option>
                  {
                    locations.map((location) => {
                      return <option value={location._id} key={location._id}>{location.name}</option>
                    })
                  }
                </select>
              </div>
              <div className="modal-action">
                {
                  /*
                    <form method="dialog">
                      <button className="btn p-3 rounded-md absolute bottom-0 right-16 text-white bg-gray-400">
                        Cancel
                      </button>		
                    </form>
                  */
                }
              </div>
              <button type="submit" className="p-3 rounded-md absolute bottom-0 right-0 text-white bg-blue-900">
                Save
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