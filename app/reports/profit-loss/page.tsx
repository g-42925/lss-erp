/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────
type ProfitLossEntry = {
  month: string
  labaKotor: number
  pengeluaran: number
  pengeluaranDetail?: any[]
  labaBersih: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

function thisMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function startOfYearStr() {
  const now = new Date()
  return `${now.getFullYear()}-01`
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfitLossReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(startOfYearStr())
  const [endDate, setEndDate] = useState(thisMonthStr())
  const [items, setItems] = useState<ProfitLossEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  // Modal states
  const [modalData, setModalData] = useState<{ month: string, details: any[] } | null>(null)

  const openModal = (month: string, details?: any[]) => {
    if (details && details.length > 0) {
      setModalData({ month, details })
    } else {
      alert('Tidak ada rincian pengeluaran untuk bulan ini.')
    }
  }

  const closeModal = () => setModalData(null)

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    setLoading(true)
    setItems([])
    try {
      const params = new URLSearchParams({
        id: masterAccountId,
        startDate,
        endDate
      })
      const res = await fetch(`/api/web/reports/profit-loss?${params}`)
      const data = await res.json()
      if (!data.error) {
        setItems(data.result || [])
        setHasRun(true)
      } else {
        alert(data.message || "Gagal memuat laporan")
      }
    } catch (e: unknown) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const totals = items.reduce(
    (acc, curr) => {
      acc.labaKotor += curr.labaKotor
      acc.pengeluaran += curr.pengeluaran
      acc.labaBersih += curr.labaBersih
      return acc
    },
    { labaKotor: 0, pengeluaran: 0, labaBersih: 0 }
  )

  function toExcel() {
    if (items.length === 0) return alert('Tidak ada data untuk diexport')

    const data = items.map(item => ({
      'Bulan': item.month,
      'Laba Kotor': fmtMoney(item.labaKotor),
      'Pengeluaran': fmtMoney(item.pengeluaran),
      'Laba Bersih': fmtMoney(item.labaBersih),
    }))

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Profit & Loss")
    XLSX.writeFile(workbook, `profit-loss-${thisMonthStr()}.xlsx`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 p-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-teal-600 p-2.5 shadow-lg shadow-teal-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Profit & Loss Report</h1>
            <p className="text-sm text-slate-500">Laporan keuntungan dan kerugian bulanan perusahaan.</p>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Laporan</p>
        <div className="flex flex-wrap items-end gap-4">

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Bulan Mulai</label>
            <input
              type="month"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600">Bulan Akhir</label>
            <input
              type="month"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>

          <button onClick={runReport} disabled={loading} className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition-all hover:bg-teal-800 active:scale-95 disabled:opacity-60">
            {loading ? <span className="loading loading-spinner loading-xs" /> : null}
            Tampilkan Laporan
          </button>
          <button onClick={toExcel} disabled={loading} className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition-all hover:bg-teal-800 active:scale-95 disabled:opacity-60">
            Export
          </button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {hasRun && !loading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <SummaryCard label="Total Laba Kotor" value={fmtMoney(totals.labaKotor)} color="blue" icon="💰" />
          <SummaryCard label="Total Pengeluaran" value={fmtMoney(totals.pengeluaran)} color="rose" icon="📉" />
          <SummaryCard label="Total Laba Bersih" value={fmtMoney(totals.labaBersih)} color={totals.labaBersih >= 0 ? "emerald" : "rose"} icon="📈" />
        </div>
      )}

      {/* ── Table Card ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3">
            <span className="loading loading-spinner loading-lg text-teal-600" />
            <p className="text-sm text-slate-400">Menghitung profit dan loss…</p>
          </div>
        ) : !hasRun ? (
          <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
            </svg>
            <p className="font-semibold">Pilih periode lalu klik <span className="text-teal-700">Tampilkan Laporan</span></p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">Tidak ada data yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Bulan</th>
                  <th className="px-4 py-3 text-right">Laba Kotor</th>
                  <th className="px-4 py-3 text-right">Pengeluaran</th>
                  <th className="px-4 py-3 text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 text-slate-800 font-medium whitespace-nowrap">{row.month}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-800 text-xs">{fmtMoney(row.labaKotor)}</td>
                    <td 
                      className="px-4 py-3.5 text-right font-mono text-slate-800 text-xs cursor-pointer hover:text-teal-600 hover:underline"
                      onClick={() => openModal(row.month, row.pengeluaranDetail)}
                      title="Klik untuk melihat rincian pengeluaran"
                    >
                      {fmtMoney(row.pengeluaran)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-mono font-bold text-xs ${row.labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {fmtMoney(row.labaBersih)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Rincian Pengeluaran ────────────────────────────────────────── */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Rincian Pengeluaran - {modalData.month}</h3>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-200 text-xs uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Tanggal</th>
                    <th className="pb-3 font-semibold">Sumber</th>
                    <th className="pb-3 font-semibold">Keterangan</th>
                    <th className="pb-3 font-semibold text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {modalData.details.map((detail, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 text-slate-600 whitespace-nowrap">{new Date(detail.date).toLocaleDateString("id-ID")}</td>
                      <td className="py-3 text-slate-600">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {detail.source}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600 max-w-[300px] truncate" title={detail.description}>{detail.description || '-'}</td>
                      <td className="py-3 text-right font-mono text-slate-800 font-medium">{fmtMoney(detail.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={closeModal} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Summary Card Component ───────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon }: {
  label: string
  value: string | number
  color: 'emerald' | 'rose' | 'amber' | 'violet' | 'blue' | 'teal'
  icon?: string
}) {
  const colorMap = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    teal: "border-teal-100 bg-teal-50 text-teal-700",
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorMap[color]}`}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest opacity-70">
        {icon && <span className="mr-1">{icon}</span>}{label}
      </p>
      <p className="text-xl sm:text-2xl font-bold truncate" title={String(value)}>{value}</p>
    </div>
  )
}
