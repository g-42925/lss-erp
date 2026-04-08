"use client"

import Link from "next/link";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import useFetch from "@/hooks/useFetch";
import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form";


export default function Allocation() {
	const [mounted, setMounted] = useState<boolean>(false);
	const [stock, setStock] = useState<any[]>([])

	const [searchResult, setSearchResult] = useState<any[]>([])

	const masterAccountId = useAuth((state) => state.masterAccountId)
	const hasHydrated = useAuth((s) => s._hasHydrated)

	const modalRef = useRef<HTMLDialogElement>(null)

	const openingStockForm = useForm();

	const [selectedProd, setSelectedProd] = useState<string>('')
	const [selectedLoc, setSelectedLoc] = useState<string>('')
	const [log, setLog] = useState<any[]>()


	async function search(v: string) {
		if (v.length > 0) {
			var [loc, prod] = v.split(":")

			if (prod) {
				var result = stock.filter((r) => {
					return r.locationName.includes(loc) && r.product.productName.includes(prod)
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
				var result = stock.filter((r) => {
					return r.locationName.includes(loc) || r.product.productName === loc
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
		}
		else {
			setSearchResult(
				[]
			)
		}
	}

	const logFn = useFetch<any, any>({
		url: `/api/web/allocation`,
		method: 'GET',
		onError: (m) => {
			alert(m)
		}
	})

	const allocateFn = useFetch<any, any>({
		url: `/api/web/allocation`,
		method: 'POST',
		onError: (m) => {
			alert(m)
		}
	})

	const getBatchesFn = useFetch<any, any>({
		url: `/api/web/batch`,
		method: 'GET',
		onError: (m) => {
			alert(m)
		}
	})

	function handleSubmit(data: any) {
		const limit = parseInt(data.batches.split("/")[1])
		const batchNumber = data.batches.split("/")[0]
		const quantity = parseInt(data.qty)

		const params = {
			locationId: data.locationId,
			from: batchNumber,
			qty: quantity,
			productId: data.productId,
			date: new Date(),
			id: masterAccountId,
		}

		if (quantity > limit) {
			alert('quantity invalid')
		}
		else {
			allocateFn.fn('', JSON.stringify(params), r => {
				setLog(r)
				modalRef?.current?.close()
			})
		}
	}

	const fetchLocationsFn = useFetch<any[], any>({
		url: `/api/web/location?id=xxx`,
		method: 'GET'
	})

	const fetchProductsFn = useFetch<any[], any>({
		url: `/api/web/products?id=xxx`,
		method: 'GET',
		onError: (m) => {
			console.log(m)
		}
	})

	function onLocChg(_id: string) {
		setSelectedLoc(_id)

		if (_id != '' && selectedProd != '') {
			getBatchesFn.fn(`/api/web/batches?pId=${selectedProd}&lId=${_id}`, JSON.stringify({}), r => {
				console.log(r)
			})
		}
	}

	function onProdChg(_id: string) {
		setSelectedProd(_id)


		if (_id != '' && selectedLoc != '') {
			getBatchesFn.fn(`/api/web/batches?pId=${_id}&lId=${selectedLoc}`, JSON.stringify({}), r => {
				console.log(r)
			})
		}
	}

	useEffect(() => {
		if (hasHydrated) {
			const url = `/api/web/location?id=${masterAccountId}`
			const url2 = `/api/web/products?id=${masterAccountId}&type=good`
			const url3 = `/api/web/allocation?id=${masterAccountId}&type=good`

			const body = JSON.stringify({})

			fetchLocationsFn.fn(url, body, (result) => { })

			fetchProductsFn.fn(url2, body, (result) => { })

			logFn.fn(url3, body, (result) => {
				setLog(result)
				modalRef?.current?.close()
			})


			setMounted(
				true
			)
		}
	}, [masterAccountId])

	if (!mounted) return null;

	return (
		<>
			<div className="h-full p-6 flex flex-col gap-3">
				<span className="text-2xl">Allocation <span className="text-sm leading-loose">Manage allocation</span></span>
				<div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6">
					<div className="flex flex-row">
						<span className="self-center">All allocation</span>
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
						<input type="search" onKeyUp={(e) => search(e.target.value)} placeholder="Search" className="ml-auto border-1 border-black rounded-md p-3" />
					</div>
					{
						logFn.loading
							?
							<div className="flex-1 flex flex-col justify-center items-center">
								<span className="loading loading-spinner loading-xl"></span>
							</div>
							:
							logFn.error || logFn.noResult
								?
								<div>
									<p>{logFn.message}</p>
								</div>
								:
								<div>
									<table className="table">
										<thead>
											<tr>
												<th>date</th>
												<th>location</th>
												<th>Product</th>
												<th>Batch</th>
												<th>quantity</th>
											</tr>
										</thead>
										<tbody>
											{
												searchResult.length < 1
													?
													log?.map((s, logIndex) => {
														return s?.allocations?.map((a, aIndex: any) => {
															return (
																<tr key={`${logIndex}-${aIndex}`}>
																	<td>{new Date(a.date).toLocaleDateString('id-ID')}</td>
																	<td>{a.location.name}</td>
																	<td>{s.productName}</td>
																	<td>{a.from}</td>
																	<td>{a.qty}</td>
																</tr>
															)
														})

													})
													:
													searchResult.map((s, index) => {
														return (
															<tr key={index}>
																<td>{s.locationName}</td>
																<td>{s.product.productName}</td>
																<td>
																	<Link href={`/batches?pId=${s.product._id}&lId=${s._id.locationId}`}>
																		{`${s.remain} (${s.product.warehouseUnit})`}
																	</Link>
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
			<dialog ref={modalRef} id="my_modal_1" className="modal h-full">
				<form onSubmit={openingStockForm.handleSubmit(handleSubmit)} className="modal-box flex flex-col gap-3">
					<h3 className="text-lg font-bold">Allocate</h3>
					<div className="flex flex-row items-center gap-2">
						<label className="w-[60px]">Location</label>
						<select  {...openingStockForm.register("locationId", { onChange: (e) => onLocChg(e.target.value) })} className="select flex-1">
							<option>
								Select Location
							</option>
							{
								fetchLocationsFn?.result?.map((location) => {
									return <option value={location._id} key={location._id}>{location.name}</option>
								})
							}
						</select>
					</div>
					<div className="flex flex-row items-center gap-2">
						<label className="w-[60px]">Product</label>
						<select  {...openingStockForm.register("productId", { onChange: (e) => onProdChg(e.target.value) })} className="select flex-1">
							<option>
								Select Product
							</option>
							{
								fetchProductsFn?.result?.map((p) => {
									return <option value={p._id} key={p._id}>{p.productName} - ({p.warehouseUnit})</option>
								})
							}
						</select>
					</div>
					<div className="flex flex-row items-center gap-2">
						<label className="w-[60px]">Batches</label>
						<select  {...openingStockForm.register("batches")} className="select flex-1">
							<option>
								Select Batches
							</option>
							{
								getBatchesFn?.result?.map((b) => {
									return <option key={b.batchNumber} value={`${b.batchNumber}/${b.accumulative - b.outQty}`}>{b.batchNumber} ({b.accumulative - b.outQty})</option>
								})
							}
						</select>
					</div>
					<div className={`flex flex-row items-center gap-2`}>
						<label className="w-[100px]">Quantity</label>
						<input  {...openingStockForm.register("qty")} type="text" className="input p-3 rounded-md w-full" placeholder="quantity" />
					</div>
					{logFn.noResult || logFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
					<div className="flex flex-row gap-3 modal-action">
						<button className="btn bg-red-900 text-white">Submit</button>
					</div>
				</form>
			</dialog>
		</>
	)
}

