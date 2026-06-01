"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form";
import useFetch from "@/hooks/useFetch";

type StockItem = {
  _id: { warehouseId: string; productId: string; locationId: string }
  locationName: string
  product: { _id: string; productName: string; warehouseUnit: string }
  remain: number
  reserved: number
}

type Product = {
  _id: string
  productName: string
  warehouseUnit: string
  haveExpiredDate: boolean
}

type Warehouse = {
  _id: string
  name: string
}

export default function Stock() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [stock, setStock] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [nonExpiredProduct, setNonExpiredProducts] = useState<string[]>([])
  const [searchResult, setSearchResult] = useState<StockItem[]>([])

  const masterAccountId = useAuth((state) => state.masterAccountId)
  const locationId = useAuth((state) => state.locationId)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  const modalRef = useRef<HTMLDialogElement>(null)

  const openingStockForm = useForm<{
    productId: string
    warehouseId: string
    locationId: string
    batchNumber: string
    unitCost: string
    expiryDate: string
    accumulative: string
  }>()

  const selected = openingStockForm.watch('productId')

  function search(v: string) {
    if (v.length > 0) {
      const [loc, prod] = v.split(":")

      if (prod) {
        const result = stock.filter((r) =>
          r.locationName.includes(loc) && r.product.productName.includes(prod)
        )
        setSearchResult(result)
      } else {
        const result = stock.filter((r) =>
          r.locationName.includes(loc) || r.product.productName === loc
        )
        setSearchResult(result)
      }
    } else {
      setSearchResult([])
    }
  }

  const openStockFn = useFetch<StockItem, string>({
    url: `/api/web/stock`,
    method: 'POST',
    onError: (m) => { alert(m) }
  })

  const getStockFn = useFetch<StockItem[], string>({
    url: `/api/web/stock`,
    method: 'GET'
  })

  const fetchWarehousesFn = useFetch<Warehouse[], string>({
    url: `/api/web/warehouse?id=xxx`,
    method: 'GET'
  })

  const fetchProductsFn = useFetch<Product[], string>({
    url: `/api/web/products?id=xxx`,
    method: 'GET',
    onError: (m) => { console.log(m) }
  })

  function handleSubmit(data: {
    productId: string
    warehouseId: string
    locationId: string
    batchNumber: string
    unitCost: string
    expiryDate: string
    accumulative: string
  }) {
    const body = JSON.stringify({
      ...data,
      locationId: locationId,
      status: 'ACTIVE',
      isOpening: true,
      outQty: 0
    })

    openStockFn.fn('', body, (result) => {
      setStock((prev) => [...prev, result])
      modalRef.current?.close()
    })
  }

  function toggle() {
    modalRef.current?.showModal()
  }

  useEffect(() => {
    if (hasHydrated) {
      const urlStock = `/api/web/stock?id=${masterAccountId}&locationId=${locationId}`
      const urlProducts = `/api/web/products?id=${masterAccountId}&type=good`
      const urlWarehouses = `/api/web/warehouse?id=${masterAccountId}&lId=${locationId}`
      const body = JSON.stringify({})

      fetchWarehousesFn.fn(urlWarehouses, body, (result) => {
        setWarehouses(result)
      })

      fetchProductsFn.fn(urlProducts, body, (result) => {
        const nonExpired = result
          .filter((p) => p.haveExpiredDate === false)
          .map((p) => p._id)
        setNonExpiredProducts(nonExpired)
        setProducts(result)
      })

      getStockFn.fn(urlStock, body, (r) => {
        setStock(r)
      })

      setMounted(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterAccountId, locationId, hasHydrated])

  if (!mounted) return null;

  const displayList = searchResult.length > 0 ? searchResult : stock

  return (
    <>
      <div className="h-full p-6 flex flex-col gap-3 text-black">
        <span className="text-2xl">Stock <span className="text-sm leading-loose">Manage stock</span></span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
          <div className="flex flex-row">
            <span className="self-center">All stock</span>
            <button onClick={toggle} className="btn ml-auto">
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
            <input
              type="search"
              onKeyUp={(e) => search((e.target as HTMLInputElement).value)}
              placeholder="Search"
              className="ml-auto border-1 border-black rounded-md p-3"
            />
          </div>
          {
            getStockFn.loading
              ? (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <span className="loading loading-spinner loading-xl"></span>
                </div>
              )
              : getStockFn.error || getStockFn.noResult
                ? (
                  <div>
                    <p>{getStockFn.message}</p>
                  </div>
                )
                : (
                  <div>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th>Product</th>
                          <th>Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayList.map((s, index) => (
                          <tr key={index}>
                            <td>{s.locationName}</td>
                            <td>{s.product.productName}</td>
                            <td>
                              <Link href={`/batches?pId=${s.product._id}&lId=${s._id.locationId}`}>
                                {`${s.remain} (${s.product.warehouseUnit})`}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
          }
        </div>
      </div>
      <dialog ref={modalRef} id="stock_modal" className="modal h-full text-black">
        <form onSubmit={openingStockForm.handleSubmit(handleSubmit)} className="modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Add opening stock</h3>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[100px]">Warehouse</label>
            <select {...openingStockForm.register("warehouseId", { required: true })} className="select flex-1">
              <option value="">Select Warehouse</option>
              {warehouses.map((warehouse) => (
                <option value={warehouse._id} key={warehouse._id}>{warehouse.name}</option>
              ))}
            </select>
          </div>
          <input type="hidden" {...openingStockForm.register("locationId")} defaultValue={locationId ?? ''} />
          <div className="flex flex-row items-center gap-2">
            <label className="w-[60px]">Product</label>
            <select {...openingStockForm.register("productId")} className="select flex-1">
              <option value="">Select Product</option>
              {products.map((p) => (
                <option value={p._id} key={p._id}>{p.productName} - ({p.warehouseUnit})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-row items-center">
            <label className="w-[150px]">Batch number</label>
            <input {...openingStockForm.register("batchNumber")} defaultValue={Date.now()} type="text" className="input p-3 rounded-md w-full" readOnly />
          </div>
          <div className="flex flex-row items-center gap-2 hidden">
            <label className="w-[80px]">Unit cost</label>
            <input defaultValue="0" placeholder="submit unit cost here" className="input p-3 rounded-md w-full" {...openingStockForm.register("unitCost")} />
          </div>
          <div className={`flex flex-row items-center gap-2 ${nonExpiredProduct.includes(selected) ? "hidden" : ""}`}>
            <label className="w-[110px]">Expiry date</label>
            <input
              defaultValue={new Date().toISOString().slice(0, 10)}
              {...openingStockForm.register("expiryDate")}
              type="date"
              className="input p-3 rounded-md w-full"
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[100px]">Quantity</label>
            <input {...openingStockForm.register("accumulative")} type="text" className="input p-3 rounded-md w-full" placeholder="initial quantity" />
          </div>
          {(openStockFn.noResult || openStockFn.error) && (
            <label className="input-validator text-red-900" htmlFor="role">something went wrong</label>
          )}
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
