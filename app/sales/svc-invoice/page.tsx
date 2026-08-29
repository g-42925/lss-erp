"use client"

import useAuth from "@/store/auth"
import useFetch from '@/hooks/useFetch'
import Sidebar from '@/components/sidebar'
import Image from "next/image"
import Link from "next/link";
import * as XLSX from "xlsx";

import { useForm } from 'react-hook-form'
import { useRef, useEffect, useState } from 'react'

export default function Invoices() {
  const loggedIn = useAuth((state) => state.loggedIn)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const name = useAuth((state) => state.name)
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const [searchResult, setSearchResult] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const modalRef = useRef<HTMLDialogElement>(null)
  const invoiceModalRef = useRef<HTMLDialogElement>(null)
  const editInvoiceModalRef = useRef<HTMLDialogElement>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedInvoicesToPrint, setSelectedInvoicesToPrint] = useState<string[]>([])
  const [invoicesToPrint, setInvoicesToPrint] = useState<any[]>([])


  function openInvoice(invoice: any) {
    setSelectedInvoice(invoice)
    invoiceModalRef.current?.showModal()
  }

  function openEditInvoice(invoice: any) {
    setSelectedInvoice(invoice)
    editInvoiceForm.reset({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      salesOrderNumber: invoice.salesOrderNumber,
      date: invoice.date ? new Date(invoice.date).toISOString().substring(0, 10) : "",
      payAmount: invoice.payAmount,
      missing: invoice.missing,
      paid: String(invoice.paid)
    })
    editInvoiceModalRef.current?.showModal()
  }


  const newInvoiceForm = useForm()
  const editInvoiceForm = useForm()
  const newQuotationForm = useForm()
  const editQuotationForm = useForm()
  const newOrderForm = useForm()

  const addInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice/product',
    method: 'POST',
    onError: (m) => {
      alert(m)
    }
  })

  const closeInvoiceFn = useFetch<any, any>({
    url: '/api/web/invoice/product',
    method: 'PUT',
    onError: (m) => {
      alert(m)
    }
  })

  const getInvoicesFn = useFetch<any, any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getBankAccountsFn = useFetch<any, any>({
    url: '',
    method: 'GET'
  })

  const getProductsFn = useFetch<any, any>({
    url: '',
    method: 'GET'
  });

  const getCompaniesFn = useFetch<any, any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const getOrdersFn = useFetch<any, any>({
    url: '',
    method: 'GET'
  })

  const getTaxesFn = useFetch<any, any>({
    url: '',
    method: 'GET',
    onError: (m) => {
      alert(m)
    }
  })

  const sourceInvoices = searchResult.length > 0 ? searchResult : (getInvoicesFn.result || []);
  const filteredInvoices = sourceInvoices.filter((s: any) => {
    if (!selectedMonth) return true;
    if (!s.date) return false;
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return false;
    const invoiceMonth = String(d.getMonth() + 1);
    return invoiceMonth === selectedMonth;
  });

  function handlePrintSelected() {
    const selected = filteredInvoices.filter((s: any) => selectedInvoicesToPrint.includes(s._id));
    setInvoicesToPrint(selected);
    setTimeout(() => window.print(), 100);
  }

  function handleExportExcel() {
    const monthAbbr = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const monthName = selectedMonth ? monthAbbr[Number(selectedMonth)] : "Semua";

    const allTaxes = getTaxesFn.result || [];
    let grandTotalDPP = 0;

    const excelData = filteredInvoices.map((s: any, index: number) => {
      const dpp = fSubtotal(s) || 0;
      grandTotalDPP += dpp;

      const rowData: any = {
        "NO": index + 1,
        "NO TRANSAKSI": s.invoiceNumber,
        "NPWP": s.order?.taxNumber || "-",
        "TGL PENJUALAN": s.date ? new Date(s.date).toLocaleDateString('id-ID') : "-",
        "NAMA CUSTOMER": s.order?.customCustomer ? s.order.customCustomer.name : (s.order?.customer?.bussinessName || "-"),
        "DESKRIPSI": s.order?.product?.productName || "-",
        "DPP": `${Number(dpp).toLocaleString('id-ID')}`,
      };

      allTaxes.forEach((tax: any) => {
        const hasTax = s.order?.taxes?.find((t: any) => t.taxName === tax.name);
        rowData[tax.name] = hasTax ? `${tax.value}%` : "0%";
      });

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData, { origin: "A3" });

    XLSX.utils.sheet_add_aoa(worksheet, [
      [
        `LAPORAN PENJUALAN - ${monthName.toUpperCase()} ${new Date().getFullYear()}`,
        "", "",
        "GRAND TOTAL:",
        `${Number(grandTotalDPP).toLocaleString('id-ID')}`
      ]
    ], { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    const sheetName = `Laporan ${monthName} ${new Date().getFullYear()}`.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `Laporan Penjualan Periode ${monthName} ${new Date().getFullYear()}.xlsx`);
  }

  function whatTax(invoice: any, taxName: string) {
    const isOneTimeService = invoice.order.contractType === "One Time" && invoice.order.frequency === "Once"
    const total = isOneTimeService ? invoice.order.price : invoice.order.price - ((invoice?.order?.price / invoice?.order?.qty) * invoice?.missing)


    if (!getTaxesFn.result) return '0%'

    const [tax] = getTaxesFn.result?.filter((t: any) => t.name === taxName)

    if (tax) {
      return `${tax.value}%`
    }
    return '0%'
  }

  function submit(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
      invoiceType: 'service'
    })
    addInvoiceFn.fn('', body, (i) => {
      setInvoices([
        i,
        ...invoices
      ])
      modalRef.current?.close()
    })
  }

  function closeInvoice(invoice: any) {
    if (!confirm('Mark this invoice as fully paid?')) return
    const total = invoice.order.price
    const params = {
      salesOrderNumber: invoice.salesOrderNumber,
      paid: true,
      payAmount: total
    }
    closeInvoiceFn.fn('', JSON.stringify(params), () => {
      getInvoicesFn.reset(
        getInvoicesFn.result?.map((inv: any) =>
          inv.salesOrderNumber === invoice.salesOrderNumber
            ? { ...inv, paid: true, payAmount: total }
            : inv
        )
      )
    })
  }

  function submitEdit(data: any) {
    const body = JSON.stringify({
      ...data,
      id: masterAccountId,
      paid: data.paid === 'true',
      missing: Number(data.missing || 0),
      payAmount: Number(data.payAmount || 0),
    })
    closeInvoiceFn.fn('', body, () => {
      getInvoicesFn.reset(
        getInvoicesFn.result?.map((inv: any) =>
          inv._id === data._id
            ? { ...inv, date: data.date, missing: Number(data.missing || 0), payAmount: Number(data.payAmount || 0), paid: data.paid === 'true' }
            : inv
        )
      )
      setSearchResult(
        searchResult.map((inv: any) =>
          inv._id === data._id
            ? { ...inv, date: data.date, missing: Number(data.missing || 0), payAmount: Number(data.payAmount || 0), paid: data.paid === 'true' }
            : inv
        )
      )
      editInvoiceModalRef.current?.close()
    })
  }


  function fSubtotal(invoice: any) {
    const isOneTimeService = invoice?.order?.contractType === "One Time" && invoice?.order?.frequency === "Once"
    const total = isOneTimeService ? invoice?.order?.price : invoice?.order?.price - ((invoice?.order?.price / invoice?.order?.qty) * invoice?.missing)
    return total
  }

  function fTotal(invoice: any) {
    const isOneTimeService = invoice?.order?.contractType === "One Time" && invoice?.order?.frequency === "Once"
    const total = isOneTimeService ? invoice?.order?.price : invoice?.order?.price - ((invoice?.order?.price / invoice?.order?.qty) * invoice?.missing)
    // hitung total setelah ditambah pajak
    const taxes = getTaxesFn.result?.filter((t: any) => t)
    let totalWithTax = total
    taxes?.forEach((tax: any) => {
      if (tax.isPPh) {
        totalWithTax -= total * tax.value / 100
      }
      else {
        totalWithTax += total * tax.value / 100
      }
    })
    return totalWithTax
  }


  useEffect(() => {
    if (hasHydrated) {
      const url4 = `/api/web/invoice/svc?id=${masterAccountId}&type=service`
      const url5 = `/api/web/products?id=${masterAccountId}&type=service`
      const url6 = `/api/web/companies?id=${masterAccountId}`
      const url7 = `/api/web/bank-accounts?id=${masterAccountId}`
      const url8 = `/api/web/tax?id=${masterAccountId}`
      const urlOrder = `/api/web/order?id=${masterAccountId}&type=service`

      const body = JSON.stringify({})

      getTaxesFn.fn(url8, body, (result: any) => { })
      getBankAccountsFn.fn(url7, body, (result: any) => { setBankAccounts(result) })
      getInvoicesFn.fn(url4, body, (result) => { })
      getCompaniesFn.fn(url6, body, (result: any) => { })
      getOrdersFn.fn(urlOrder, body, (result: any) => { setOrders(result) })
      getProductsFn.fn(url5, body, (result: any) => {
        setProducts(result)
      })
    }
  }, [masterAccountId, hasHydrated])

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            margin: 10mm;
            size: A4;
            margin-top: 0;
            margin-bottom: 0;
          }
          thead { display: table-header-group !important; }
          tbody { display: table-row-group !important; }
          tfoot { display: table-footer-group !important; }
          tr, .invoice-header, .bank-accounts-section {
            page-break-inside: avoid !important;
            page-break-after: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          .page-break { page-break-after: always; }
        }
        @media screen {
          .modal-box.invoice-modal {
            width: 90vw !important;
            max-width: 90vw !important;
          }
        }
      `}
      </style>
      <div className="h-full p-6 flex flex-col gap-3 print:hidden text-black">
        <span className="page-title">Invoices</span>
        <div className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 relative">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <span className="self-center">All invoices</span>
            <button disabled onClick={() => modalRef.current?.showModal()} className="btn ml-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex flex-row gap-2 items-center">
              Show
              <select className="select w-16">
                <option>20</option>
                <option>30</option>
                <option>40</option>
              </select>
              Entries
            </div>
            <input type="search" placeholder="Search" className="toolbar-search" />
            <div className="flex flex-row gap-2 items-center ml-auto">
              <span>Bulan:</span>
              <select className="select select-sm select-bordered w-32" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                <option value="">Semua</option>
                <option value="1">Januari</option>
                <option value="2">Februari</option>
                <option value="3">Maret</option>
                <option value="4">April</option>
                <option value="5">Mei</option>
                <option value="6">Juni</option>
                <option value="7">Juli</option>
                <option value="8">Agustus</option>
                <option value="9">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              <button className="btn btn-sm bg-black text-white hover:bg-gray-800" onClick={handlePrintSelected} disabled={selectedInvoicesToPrint.length === 0}>
                Print Selected ({selectedInvoicesToPrint.length})
              </button>
              <button className="btn btn-sm bg-green-700 text-white hover:bg-green-800" onClick={handleExportExcel} disabled={filteredInvoices.length === 0}>
                Export Excel
              </button>
            </div>
          </div>
          {
            getInvoicesFn.loading
              ?
              <div className="flex-1 flex flex-col justify-center items-center">
                <span className="loading loading-spinner loading-xl"></span>
              </div>
              :
              getInvoicesFn.error || getInvoicesFn.noResult
                ?
                <div>
                  <p>{getInvoicesFn.message}</p>
                </div>
                :
                <div>
                  <div className="overflow-x-auto w-full">
                    <table className="table text-center">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={filteredInvoices.length > 0 && selectedInvoicesToPrint.length === filteredInvoices.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInvoicesToPrint(filteredInvoices.map((s: any) => s._id));
                                } else {
                                  setSelectedInvoicesToPrint([]);
                                }
                              }}
                            />
                          </th>
                          <th>date</th>
                          <th>invoice number</th>
                          <th>sales order number</th>
                          <th>Customer</th>
                          <th>Product</th>
                          <th>Value</th>
                          <th>pay amount</th>
                          <th>paid</th>
                          <th>...</th>
                        </tr>
                      </thead>
                      <tbody className="text-center">
                        {
                          filteredInvoices.length === 0
                            ? (getInvoicesFn.loading ? <tr><td colSpan={10}><div className="text-center p-3"><span className="loading loading-spinner"></span></div></td></tr> : <tr><td colSpan={10}>No Data</td></tr>) :
                            filteredInvoices.map((s: any, index: number) => {
                              return (
                                <tr key={index}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      className="checkbox checkbox-sm"
                                      checked={selectedInvoicesToPrint.includes(s._id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedInvoicesToPrint([...selectedInvoicesToPrint, s._id]);
                                        } else {
                                          setSelectedInvoicesToPrint(selectedInvoicesToPrint.filter((id) => id !== s._id));
                                        }
                                      }}
                                    />
                                  </td>
                                  <td>{new Date(s.date).toLocaleDateString('id-ID')}</td>
                                  <td>{s.invoiceNumber}</td>
                                  <td>{s.salesOrderNumber}</td>
                                  <td>{s.order?.customCustomer ? s.order.customCustomer.name : s.order?.customer?.bussinessName}</td>
                                  <td>{s.order?.salesOrderNumber}</td>
                                  <td>{((s.order?.price || 0) / (s.order?.qty || 1)) * ((s.order?.qty || 1) - (s.missing || 0))}</td>
                                  <td>{s.payAmount}</td>
                                  <td>
                                    <span className={`badge badge-sm ${s.paid ? 'badge-success' : 'badge-warning'}`}>
                                      {s.paid ? 'paid' : 'unpaid'}
                                    </span>
                                  </td>
                                  <td className="flex flex-row gap-1 justify-center items-center">
                                    <button onClick={() => openInvoice(s)} title="View Invoice">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                        <path fillRule="evenodd" d="M7.875 1.5C6.839 1.5 6 2.34 6 3.375v2.99c-.426.053-.851.11-1.274.174-1.454.218-2.476 1.483-2.476 2.917v6.294a3 3 0 0 0 3 3h.27l-.155 1.705A1.875 1.875 0 0 0 7.232 22.5h9.536a1.875 1.875 0 0 0 1.867-2.045l-.155-1.705h.27a3 3 0 0 0 3-3V9.456c0-1.434-1.022-2.7-2.476-2.917A48.716 48.716 0 0 0 18 6.366V3.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM16.5 6.205v-2.83A.375.375 0 0 0 16.125 3h-8.25a.375.375 0 0 0-.375.375v2.83a49.353 49.353 0 0 1 9 0Zm-.217 8.265c.178.018.317.16.333.337l.526 5.784a.375.375 0 0 1-.374.409H7.232a.375.375 0 0 1-.374-.409l.526-5.784a.373.373 0 0 1 .333-.337 41.741 41.741 0 0 1 8.566 0Zm.967-3.97a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H18a.75.75 0 0 1-.75-.75V10.5ZM15 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V10.5a.75.75 0 0 0-.75-.75H15Z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                    <button onClick={() => openEditInvoice(s)} title="Edit Invoice" className="text-blue-700 hover:text-blue-900">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                      </svg>
                                    </button>
                                    {!s.paid && (
                                      <button
                                        onClick={() => closeInvoice(s)}
                                        disabled={closeInvoiceFn.loading}
                                        title="Close Invoice (Mark as Paid)"
                                        className="text-green-700 hover:text-green-900"
                                      >
                                        {closeInvoiceFn.loading ? (
                                          <span className="loading loading-spinner loading-xs"></span>
                                        ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                          </svg>
                                        )}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
          }
          <button className="bg-black text-white rounded-full p-3 absolute right-10 bottom-10">
            <Link href="/sales/xinvoices">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </Link>
          </button>
        </div>
      </div>
      <dialog ref={modalRef} id="my_modal_1" className="modal h-full text-black">
        <form onSubmit={newInvoiceForm.handleSubmit(submit)} className="h-100 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Make invoice</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Date</label>
            <input {...newInvoiceForm.register("date", { required: true })} type="date" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Sales Order Number</label>
            <select {...newInvoiceForm.register("salesOrderNumber")} className="select flex-1">
              <option value="">-- Select Sales Order --</option>
              {orders && orders.map((o: any, idx: number) => (
                <option key={idx} value={o.salesOrderNumber}>
                  {o.salesOrderNumber} - {o.customer?.bussinessName || o.customCustomer?.name} (Rp {Number(o.total || 0).toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Pay Amount</label>
            <label className="input flex-1">
              <input {...newInvoiceForm.register('payAmount')} type="text" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Missing</label>
            <label className="input flex-1">
              <input {...newInvoiceForm.register('missing')} type="text" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Paid</label>
            <select {...newInvoiceForm.register("paid")} className="select flex-1">
              <option>
                false
              </option>
              <option>
                true
              </option>
            </select>
          </div>
          {addInvoiceFn.noResult || addInvoiceFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button className="btn bg-red-900 text-white">Submit</button>
          </div>
        </form>
      </dialog>

      <dialog ref={editInvoiceModalRef} id="edit_invoice_modal" className="modal h-full text-black">
        <form onSubmit={editInvoiceForm.handleSubmit(submitEdit)} className="h-100 modal-box flex flex-col gap-3">
          <h3 className="text-lg font-bold">Edit invoice</h3>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Date</label>
            <input {...editInvoiceForm.register("date", { required: true })} type="date" className="input flex-1" />
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Pay Amount</label>
            <label className="input flex-1">
              <input {...editInvoiceForm.register('payAmount')} type="number" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-3">
            <label className="w-[70px]">Missing</label>
            <label className="input flex-1">
              <input {...editInvoiceForm.register('missing')} type="number" />
            </label>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="w-[70px]">Paid</label>
            <select {...editInvoiceForm.register("paid")} className="select flex-1">
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          </div>
          {closeInvoiceFn.noResult || closeInvoiceFn.error ? <label className="input-validator text-red-900" htmlFor="role">something went wrong</label> : <></>}
          <div className="flex flex-row gap-3 modal-action">
            <button type="button" className="btn" onClick={() => editInvoiceModalRef.current?.close()}>Cancel</button>
            <button disabled={closeInvoiceFn.loading} className="btn bg-blue-900 text-white">
              {closeInvoiceFn.loading ? <span className="loading loading-spinner"></span> : "Save"}
            </button>
          </div>
        </form>
      </dialog>

      <dialog ref={invoiceModalRef} className="modal h-full print:hidden text-black">
        <div className="modal-box invoice-modal flex flex-col gap-6 w-[98vw] max-w-none px-4 py-6">
          <div className="flex justify-between items-start border-b pb-4">
            <div className="grid gap-4 w-full items-start invoice-header" style={{ gridTemplateColumns: '7fr 3fr 4fr' }}>
              <div className="flex flex-row gap-3">
                {getCompaniesFn.result?.[0]?.logo ? (
                  <img
                    src={getCompaniesFn.result[0].logo}
                    className="object-contain flex-shrink-0"
                    alt="Logo"
                    style={{ width: '55px', height: '55px' }}
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-lg text-gray-500 font-bold underline leading-tight">{getCompaniesFn.result?.[0]?.name}</p>
                  <p className="text-xs text-gray-500 break-words">{getCompaniesFn.result?.[0]?.address}</p>
                  <p className="text-xs text-gray-500">{getCompaniesFn.result?.[0]?.phone}</p>
                  <p className="text-xs text-gray-500">{getCompaniesFn.result?.[0]?.site}</p>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl text-black font-bold">Invoice</span>
                <span className="text-sm text-gray-500">No: {selectedInvoice?.invoiceNumber}</span>
                <span className="text-sm text-gray-500">Date: {selectedInvoice ? new Date(selectedInvoice.date).toLocaleDateString('id-ID') : ''}</span>
                {
                  selectedInvoice?.order?.contractType === "One Time" && selectedInvoice?.order?.frequency === "Once" ? (
                    <span className="text-xl text-gray-500">Termin: 31-08-2026</span>
                  ) : (
                    <span className="text-xl text-gray-500">Termin: 31-08-2026</span>
                  )
                }
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm text-gray-500 break-words">To: {selectedInvoice?.order?.customCustomer ? selectedInvoice?.order?.customCustomer?.name : selectedInvoice?.order?.customer?.bussinessName}</span>
                <span className="text-sm text-gray-500 break-words">Address: {selectedInvoice?.order?.customCustomer ? selectedInvoice?.order?.customCustomer?.address : selectedInvoice?.order?.customer?.address}</span>
              </div>
            </div>
          </div>

          <div>
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2 text-sm text-gray-600 uppercase">No</th>
                  <th className="py-2 text-sm text-gray-600 uppercase">Product</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Price</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Qty</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="border-gray-200">
                <tr>
                  <td className="py-[5px] text-sm text-gray-800">1</td>
                  <td className="py-[5px] text-sm text-gray-800">{selectedInvoice?.order?.product?.productName}</td>
                  {
                    selectedInvoice?.order?.contractType === "One Time" && selectedInvoice?.order?.frequency === "Once" ? (
                      <td className="py-[5px] text-sm text-gray-800 text-right">{Number(selectedInvoice?.order?.price).toLocaleString('id-ID')}</td>
                    ) : (
                      <td className="py-[5px] text-sm text-gray-800 text-right">{Number(selectedInvoice?.order?.price / selectedInvoice?.order?.qty).toLocaleString('id-ID')}</td>
                    )
                  }
                  {
                    selectedInvoice?.order?.contractType === "One Time" && selectedInvoice?.order?.frequency === "Once" ? (
                      <td className="py-[5px] text-sm text-gray-800 text-right">1</td>
                    ) : (
                      <td className="py-[5px] text-sm text-gray-800 text-right">{(selectedInvoice?.order?.qty || 1) - (selectedInvoice?.missing || 0)}</td>
                    )
                  }
                  {
                    selectedInvoice?.order?.contractType === "One Time" && selectedInvoice?.order?.frequency === "Once" ? (
                      <td className="py-[5px] text-sm text-gray-800 text-right font-medium">{Number(selectedInvoice?.order?.price).toLocaleString('id-ID')}</td>
                    ) : (
                      <td className="py-[5px] text-sm text-gray-800 text-right font-medium">{Number(fSubtotal(selectedInvoice)).toLocaleString('id-ID')}</td>
                    )
                  }
                </tr>
                {/* Filler rows: menjaga tinggi tabel setara 5 baris, invisible di layar & tidak cetak */}
                {Array.from({ length: 1 }).map((_, i) => (
                  <tr key={`filler-${i}`} className="opacity-0 select-none" aria-hidden="true">
                    <td className="py-[5px] text-sm text-gray-800">{i + 2}</td>
                    <td className="py-[5px] text-sm text-gray-800">-</td>
                    <td className="py-[5px] text-sm text-gray-800 text-right">-</td>
                    <td className="py-[5px] text-sm text-gray-800 text-right">-</td>
                    <td className="py-[5px] text-sm text-gray-800 text-right">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4 break-inside-avoid">
            <div className="w-full flex flex-row">
              <div className="w-1/2 flex flex-col justify-center">
                {bankAccounts && bankAccounts.length > 0 && (
                  <div>
                    {bankAccounts.map((acc: any, idx: number) => (
                      <div key={idx} className="flex flex-col py-1">
                        <span className="text-sm text-black">Pembayaran melalui transfer ke:</span>
                        <span className="text-sm text-black">{acc.bank} · {acc.accountNumber}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-auto w-1/2 flex flex-col justify-between py-2 border-b print:border-gray-200">
                <div className="flex flex-row">
                  <span className="text-gray-700 text-sm">Subtotal</span>
                  {
                    selectedInvoice?.order?.contractType === "One Time" && selectedInvoice?.order?.frequency === "Once" ? (
                      <span className="text-gray-800 ml-auto text-sm">{Number(selectedInvoice?.order?.price).toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-gray-800 ml-auto text-sm">{Number(fSubtotal(selectedInvoice)).toLocaleString('id-ID')}</span>
                    )
                  }
                </div>
                {selectedInvoice?.order?.taxes && selectedInvoice.order.taxes.length > 0
                  ? selectedInvoice.order.taxes.map((t: any, idx: number) => (
                    <div key={idx} className="flex flex-row">
                      <span className="text-gray-700 text-sm">{t.taxName}</span>
                      <span className="text-gray-800 ml-auto text-sm">{whatTax(selectedInvoice, t.taxName)}</span>
                    </div>
                  ))
                  : <></>
                }
                <div className="flex flex-row font-bold">
                  <span className="text-gray-700 text-sm">Total</span>
                  {
                    selectedInvoice?.order?.contractType === "One Time" && selectedInvoice?.order?.frequency === "Once" ? (
                      <span className="text-gray-800 ml-auto text-sm">{Number(selectedInvoice?.order?.price).toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-gray-800 ml-auto text-sm">{Number(fSubtotal(selectedInvoice)).toLocaleString('id-ID')}</span>
                    )
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Signature section */}
          <div className="flex flex-row mt-0 gap-4">
            <div className="flex flex-col items-center w-1/2">
              <div className="w-full h-16 mb-2"></div>
              <span className="text-sm font-semibold text-gray-800">{name || 'Admin'}</span>
              <span className="text-xs text-gray-500">Dibuat Oleh</span>
            </div>
            <div className="flex flex-col items-center w-1/2">
              <div className="w-full h-16 mb-2"></div>
              <span className="text-sm text-gray-700">Hormat Kami</span>
            </div>
          </div>

          <div className="modal-action print:hidden">
            <button type="button" onClick={(e) => {
              e.preventDefault();
              setInvoicesToPrint([selectedInvoice]);
              setTimeout(() => window.print(), 100);
            }} className="btn bg-black text-white px-6 hover:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0v-2.941c0-1.13.91-2.046 2.046-2.046h6.408c1.135 0 2.046.915 2.046 2.046v2.941Z" />
              </svg>
              Print
            </button>
            <button type="button" onClick={() => invoiceModalRef.current?.close()} className="btn">Close</button>
          </div>
        </div>
      </dialog>

      {/* ========== PRINT-ONLY INVOICE AREA ========== */}
      <style type="text/css" media="print">
        {`
          @page { margin: 0; size: auto; }
          body { margin: 0; padding: 0; }
        `}
      </style>
      {/* Rendered as a regular div so browsers include it in print (dialog top-layer is excluded) */}
      <div id="invoice-print-area" className="hidden print:block bg-white text-black w-full">
        {invoicesToPrint.map((invoiceToPrint, invoiceIdx) => (
          <div key={invoiceIdx} className={`w-full p-6 ${invoiceIdx < invoicesToPrint.length - 1 ? 'page-break' : ''}`}>
            {/* Header */}
            <div className="grid gap-6 w-full items-start border-b-2 border-gray-200 pb-4 mb-6 invoice-header" style={{ gridTemplateColumns: '5fr 3fr 4fr' }}>
              <div className="flex flex-row gap-3">
                <div className="flex flex-row gap-6">
                  {getCompaniesFn.result?.[0]?.logo && (
                    <img
                      src={getCompaniesFn.result[0].logo}
                      className="object-contain flex-shrink-0"
                      alt="Logo"
                      style={{ width: '70px', height: '70px' }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-lg text-gray-500 font-bold underline leading-tight">{getCompaniesFn.result?.[0]?.name}</p>
                    <p className="text-xs text-gray-500 break-words">{getCompaniesFn.result?.[0]?.address}</p>
                    <p className="text-xs text-gray-500">{getCompaniesFn.result?.[0]?.phone}</p>
                    <p className="text-xs text-gray-500">{getCompaniesFn.result?.[0]?.site}</p>
                  </div>
                </div>

              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">Invoice</span>
                <span className="text-xl text-gray-500">No: {invoiceToPrint?.invoiceNumber}</span>
                {
                  invoiceToPrint?.order?.contractType === "One Time" && invoiceToPrint?.order?.frequency === "Once" ? (
                    <span className="text-lg text-gray-500">Termin: 31-08-2026</span>
                  ) : (
                    <span className="text-lg text-gray-500">Termin: 31-08-2026</span>
                  )
                }
              </div>
              <div className="flex flex-col gap-1">
                <div>
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">To</span>
                  <p className="text-sm text-gray-700 break-words leading-snug">{invoiceToPrint?.order?.customCustomer ? invoiceToPrint.order.customCustomer.name : invoiceToPrint?.order?.customer?.bussinessName}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Address</span>
                  <p className="text-sm text-gray-700 break-words leading-snug">{invoiceToPrint?.order?.customCustomer ? invoiceToPrint.order.customCustomer.address : invoiceToPrint?.order?.customer?.address}</p>
                </div>
              </div>
            </div>

            {/* Service table */}
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2 text-sm text-gray-600 uppercase">No</th>
                  <th className="py-2 text-sm text-gray-600 uppercase">Nama Item</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Price</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Qty</th>
                  <th className="py-2 text-sm text-gray-600 uppercase text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-[5px] text-sm text-gray-800">1</td>
                  <td className="py-[5px] text-sm text-gray-800">{invoiceToPrint?.order?.product?.productName}</td>
                  {
                    invoiceToPrint?.order?.contractType === "One Time" && invoiceToPrint?.order?.frequency === "Once" ? (
                      <td className="py-[5px] text-sm text-gray-800 text-right">{Number(invoiceToPrint?.order?.price).toLocaleString('id-ID')}</td>
                    ) : (
                      <td className="py-[5px] text-sm text-gray-800 text-right">{Number((invoiceToPrint?.order?.price || 0) / (invoiceToPrint?.order?.qty || 1)).toLocaleString('id-ID')}</td>
                    )
                  }
                  {
                    invoiceToPrint?.order?.contractType === "One Time" && invoiceToPrint?.order?.frequency === "Once" ? (
                      <td className="py-[5px] text-sm text-gray-800 text-right">1</td>
                    ) : (
                      <td className="py-[5px] text-sm text-gray-800 text-right">{(invoiceToPrint?.order?.qty || 1) - (invoiceToPrint?.missing || 0)}</td>
                    )
                  }
                  {
                    invoiceToPrint?.order?.contractType === "One Time" && invoiceToPrint?.order?.frequency === "Once" ? (
                      <td className="py-[5px] text-sm text-gray-800 text-right font-medium">{Number(invoiceToPrint?.order?.price).toLocaleString('id-ID')}</td>
                    ) : (
                      <td className="py-[5px] text-sm text-gray-800 text-right font-medium">{Number(fSubtotal(invoiceToPrint)).toLocaleString('id-ID')}</td>
                    )
                  }
                </tr>
                {/* Filler rows untuk print: menjaga ukuran tabel setara 5 baris */}
                {Array.from({ length: 0 }).map((_, i) => (
                  <tr key={`print-filler-${i}`}>
                    <td className="py-[5px] text-sm text-gray-800">&nbsp;</td>
                    <td className="py-[5px] text-sm text-gray-800">&nbsp;</td>
                    <td className="py-[5px] text-sm text-gray-800">&nbsp;</td>
                    <td className="py-[5px] text-sm text-gray-800">&nbsp;</td>
                    <td className="py-[5px] text-sm text-gray-800">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals + Bank accounts */}
            <div className="flex flex-row mt-6">
              <div className="w-1/2 flex flex-col justify-center bank-accounts-section">
                {bankAccounts && bankAccounts.length > 0 && bankAccounts.map((acc: any, idx: number) => (
                  <div key={idx} className="py-1">
                    <p className="text-sm text-black">Pembayaran melalui transfer ke:</p>
                    <span className="text-sm text-black">{acc.bank} · {acc.accountNumber} A/N {acc.accountName}</span>
                  </div>
                ))}
              </div>
              <div className="w-1/2 flex flex-col border-b border-gray-200 py-2">
                <div className="flex flex-row">
                  <span className="text-gray-700 text-sm">Total</span>
                  {
                    invoiceToPrint?.order?.contractType === "One Time" && invoiceToPrint?.order?.frequency === "Once" ? (
                      <span className="text-gray-800 ml-auto text-sm">{Number(invoiceToPrint?.order?.price).toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-gray-800 ml-auto text-sm">{Number(fSubtotal(invoiceToPrint)).toLocaleString('id-ID')}</span>
                    )
                  }
                </div>
                {invoiceToPrint?.order?.taxes && invoiceToPrint.order.taxes.length > 0 && invoiceToPrint.order.taxes.map((t: any, idx: number) => (
                  <div key={idx} className="flex flex-row">
                    <span className="text-gray-700 text-sm">{t.taxName}</span>
                    <span className="text-gray-800 ml-auto text-sm">{whatTax(invoiceToPrint, t.taxName)}</span>
                  </div>
                ))}

                <div className="flex flex-row font-bold">
                  <span className="text-gray-700 text-sm">Grand Total</span>
                  {
                    invoiceToPrint?.order?.contractType === "One Time" && invoiceToPrint?.order?.frequency === "Once" ? (
                      <span className="text-gray-800 ml-auto text-sm">{Number(invoiceToPrint?.order?.price).toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-gray-800 ml-auto text-sm">{Number(fSubtotal(invoiceToPrint)).toLocaleString('id-ID')}</span>
                    )
                  }
                </div>
              </div>
            </div>

            {/* Signature section */}
            <div className="flex flex-row gap-8 justify-center mt-6">
              <div className="flex flex-col items-center w-1/2">
                <div className="w-full h-16 mb-2"></div>
                <span className="text-sm font-semibold text-gray-800">{'PT. Leryn Jaya Mas'}</span>
                <span className="text-xs text-gray-500">Dibuat Oleh</span>
              </div>
              <div className="flex flex-col items-center w-1/2">
                <div className="w-full h-16 mb-2"></div>
                <span className="text-sm text-gray-700">Hormat Kami</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}