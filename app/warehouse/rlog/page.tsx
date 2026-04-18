"use client"
import useFetch from "@/hooks/useFetch";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import { useRef, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from 'next/navigation';

export default function Rlog() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [locations, setLocations] = useState<any[]>([])
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [purchases, setPurchases] = useState<any[]>([])
  const [disabled, setDisabled] = useState<boolean>(false)
  const [expiredFieldHide, setExpiredFieldHide] = useState<boolean>(false)
  const [log, setLog] = useState<any[]>([])

  const editRef = useRef<HTMLDialogElement>(null)

  const editPrForm = useForm()

  const searchParams = useSearchParams();

  const so = searchParams.get('so');

  const fetchBatchesFn = useFetch<any[], any>({
    url: `/api/web/rlog?so=xxx`,
    method: 'GET'
  })



  useEffect(() => {
    if (hasHydrated) {
      const url = `/api/web/rlog?so=${so}`

      fetchBatchesFn.fn(url, JSON.stringify({}), (result) => {
        setLog(result)
      })

    }
  }, [masterAccountId])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
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
            <input onKeyUp={(e) => search(e.target.value)} type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
          </div>
          {
            fetchBatchesFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              fetchBatchesFn.error || fetchBatchesFn.noResult
                ?
                <div>
                  <p>{fetchBatchesFn.message}</p>
                </div>
                :
                <div>
                  <table className="table text-center">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Supplier</th>
                        <th>Location</th>
                        <th>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        searchResult.length < 1
                          ?
                          log.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.createdAt).toLocaleString('id-ID')}</td>
                                <td>{p.product.productName}</td>
                                <td>{p.supplier.bussinessName}</td>
                                <td>{p.location.name}</td>
                                <td>{p.qty} ({p.product.purchaseUnit})</td>
                              </tr>
                            )
                          })
                          :
                          searchResult.map((p, index) => {
                            return (
                              <tr key={index}>
                                <td>{new Date(p.createdAt).toLocaleString('id-ID')}</td>
                                <td>{p.product.productName}</td>
                                <td>{p.supplier.bussinessName}</td>
                                <td>{p.location.name}</td>
                                <td>{p.qty} ({p.product.purchaseUnit})</td>
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

type Failed = {
  message: string
}