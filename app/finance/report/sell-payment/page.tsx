/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect, useRef } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentRow = {
  invoiceId: string
  invoiceNumber: string
  customCustomer?: { name: string }
  customerData?: { bussinessName: string }
  method: string
  date: string
  amount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtDateOnly(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function firstOfMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SellPaymentReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [search, setSearch] = useState("")
  const [report, setReport] = useState<PaymentRow[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [loading, setLoading] = useState(false)

  // ─── Auth guard ───────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Functions ────────────────────────────────────────────────────────────
  function runReport(sd: string, ed: string) {
    if (!sd || !ed) { alert("Pilih tanggal mulai dan akhir."); return }
    if (new Date(sd) > new Date(ed)) { alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir."); return }

    setLoading(true)
    setReport([])
    fetch(`/api/web/finance/reports/sell-payment?id=${masterAccountId}&startDate=${sd}&endDate=${ed}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setReport(data.result ?? [])
          setHasRun(true)
        } else {
          alert(data.message || "Gagal memuat laporan")
        }
      })
      .catch(e => alert(e.message))
      .finally(() => setLoading(false))
  }

  function handleRun() {
    runReport(startDate, endDate)
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const filtered = search.trim()
    ? report.filter(r => {
        const customerName = r.customCustomer?.name || r.customerData?.bussinessName || ""
        return r.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
               customerName.toLowerCase().includes(search.toLowerCase()) ||
               r.method?.toLowerCase().includes(search.toLowerCase())
      })
    : report

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0)

  function toExcel() {
    if (filtered.length === 0) return alert('Tidak ada data untuk diexport')
    const data = filtered.map((row, idx) => {
      const customerName = row.customCustomer?.name || row.customerData?.bussinessName || 'Tidak Diketahui'
      return {
        'No': idx + 1,
        'Tanggal': fmtDateOnly(row.date),
        'No Invoice': row.invoiceNumber,
        'Customer': customerName,
        'Metode': row.method,
        'Nominal (IDR)': row.amount,
      }
    })
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sell Payment')
    XLSX.writeFile(workbook, `sell-payment-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Screen View ─────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6 print:hidden">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">Laporan Penerimaan Pembayaran</h1>
            <p className="mt-1 text-sm text-slate-500">Laporan pembayaran dari invoice penjualan per periode</p>
          </div>
          <div className="flex gap-2">
            <button
              id="btn-print-stock-report"
              onClick={() => setTimeout(() => window.print(), 100)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V6.375c0-1.036-.84-1.875-1.875-1.875h-6.75A1.875 1.875 0 0 1 6.75 6.375v2.941" /></svg>
              Print Report
            </button>
            <button
              onClick={toExcel}
              disabled={!hasRun || filtered.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export Excel
            </button>
          </div>
        </div>

        {/* Filter card */}
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Laporan</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Mulai</label>
              <input
                id="input-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
              <input
                id="input-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <button
              id="btn-run-payment-report"
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-800 active:scale-95 disabled:opacity-60"
            >
              {loading
                ? <span className="loading loading-spinner loading-xs" />
                : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              }
              Tampilkan Laporan
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {hasRun && !loading && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Total Transaksi</p>
              <p className="text-3xl font-bold text-slate-800">{filtered.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">Total Nominal</p>
              <p className="text-3xl font-bold text-emerald-700">Rp {totalAmount.toLocaleString("id-ID")}</p>
            </div>
          </div>
        )}

        {/* Table card */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {hasRun && !loading && (
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <span className="text-sm text-slate-500">{filtered.length} transaksi</span>
              <input
                type="search"
                placeholder="Cari invoice, pelanggan, rute…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <span className="loading loading-spinner loading-lg text-indigo-600" />
            </div>
          ) : !hasRun ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.2" stroke="currentColor" className="mb-4 size-16 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              <p className="font-semibold">Klik <span className="text-indigo-700">Tampilkan Laporan</span></p>
              <p className="mt-1 text-xs text-slate-300">Laporan pembayaran akan muncul di sini</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Tidak ada transaksi yang cocok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 text-left">No</th>
                    <th className="px-5 py-3 text-left">Tanggal</th>
                    <th className="px-5 py-3 text-left">No Invoice</th>
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-5 py-3 text-left">Metode</th>
                    <th className="px-5 py-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row, idx) => {
                    const customerName = row.customCustomer?.name || row.customerData?.bussinessName || "Tidak Diketahui";
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500">{idx + 1}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-700">{fmt(row.date)}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{row.invoiceNumber}</td>
                        <td className="px-5 py-3.5 text-slate-600">{customerName}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                           <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{row.method}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-700">Rp {row.amount.toLocaleString("id-ID")}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <td colSpan={5} className="px-5 py-3 text-right">TOTAL</td>
                    <td className="px-5 py-3 text-right text-emerald-700">Rp {totalAmount.toLocaleString("id-ID")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Print View ──────────────────────────────────────────────────────── */}
      <div className="hidden print:block text-black bg-white absolute top-0 left-0 w-full min-h-screen z-50 p-8">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <p className="text-2xl font-bold uppercase tracking-widest">Laporan Pembayaran Penjualan</p>
          <p className="text-sm text-gray-600 mt-1">Periode: {fmtDateOnly(startDate)} — {fmtDateOnly(endDate)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Dicetak pada: {new Date().toLocaleString("id-ID")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Total Transaksi", value: filtered.length, color: "text-black" },
            { label: "Total Nominal", value: `Rp ${totalAmount.toLocaleString("id-ID")}`, color: "text-green-800" },
          ].map(c => (
            <div key={c.label} className="border border-gray-200 rounded p-3 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-black font-bold text-left bg-gray-50">
              <th className="py-2 px-2 w-10">No</th>
              <th className="py-2 px-2 w-32">Tanggal</th>
              <th className="py-2 px-2">No Invoice</th>
              <th className="py-2 px-2">Customer</th>
              <th className="py-2 px-2 text-center">Metode</th>
              <th className="py-2 px-2 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const customerName = row.customCustomer?.name || row.customerData?.bussinessName || "Tidak Diketahui";
              return (
                <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 1 ? "bg-gray-50" : ""}`}>
                  <td className="py-1.5 px-2 text-gray-500">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-gray-700">{fmtDateOnly(row.date)}</td>
                  <td className="py-1.5 px-2 font-semibold">{row.invoiceNumber}</td>
                  <td className="py-1.5 px-2 text-gray-600">{customerName}</td>
                  <td className="py-1.5 px-2 text-center">{row.method}</td>
                  <td className="py-1.5 px-2 text-right font-bold text-green-900">Rp {row.amount.toLocaleString("id-ID")}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold bg-gray-100">
              <td colSpan={5} className="py-2 px-2 text-right uppercase text-xs text-gray-600">Total</td>
              <td className="py-2 px-2 text-right text-green-900">Rp {totalAmount.toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>
        <div className="mt-12 flex justify-end">
          <div className="text-center w-48">
            <p className="text-xs text-gray-500">Dibuat oleh,</p>
            <div className="mt-12 border-t border-black pt-1 text-xs text-gray-700">( _________________ )</div>
          </div>
        </div>
      </div>
    </>
  )
}
