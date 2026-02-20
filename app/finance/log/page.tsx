"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch";
import { useRef,useState,useEffect } from "react"


export default function Log(){
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult,setSearchResult] = useState<any[]>([])
  const [logs,setLogs] = useState<any[]>([])
  

  var getFn = useFetch<any[],any>({
    url:`/api/web/log?id=xxx`,
    method:'GET',
    onError:(m) => {
      alert(m)
    }
  })

  useEffect(() => {
    if(hasHydrated){
      const body = JSON.stringify({})
      const url = `/api/web/log?id=${masterAccountId}&type=product` 
    
      getFn.fn(url,body,(result) => {
        setLogs(result)
      })
    }
  },[masterAccountId])

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Log</span>
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
            <input type="search" placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3"/>
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
                    <th>Date</th>
                    <th>Purchase Order Number</th>
                    <th>Payment Number</th>
                    <th>Product</th>
                    <th>Supplier</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    searchResult.length < 1
                    ?
                      logs.map((log,index) => {
                        return (
                          <tr key={index}>
                            <td>{new Date(log.date).toLocaleString('id-ID')}</td>
                            <td>{log.purchaseOrderNumber}</td>
                            <td>{log.log.paymentNumber}</td>
                            <td>{log.product.productName}</td>
                            <td>{log.supplier.bussinessName}</td>
                            <td>{log.log.type}</td>
                            <td>{log.log.amount}</td>
                            <th>{log.log.type === 'adjustment' ? log.log.reference : '-'}</th>
                          </tr>
                        )
                      })
                    :
                    <tr>
                      <td>xxx</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }     
          <button className="bg-black text-white rounded-full p-3 absolute right-12 bottom-12">
            <Link href="/finance/xlog">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>    
        </div>  
      </div>
    </>
  )
}