"use client"

import { useState } from "react"
import useAuth from "@/store/auth"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
type RemarkType = 'exit' | 'adjust' | 'retur'

type RemarkEntry = {
  _id: string
  type: RemarkType
  typeLabel: string
  date: string
  productName: string
  productCode: string
  warehouseName: string
  qty: number
  originalQty: number | null
  reason: string
  note: string
  createdByName: string
  approvedByName: string
  status: string
  lastEditApprovedByName: string | null
  lastEditAt: string | null
  storedBackQty: number
  storedBackAt: string | null
  storeBackApprovedByName: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

// ─── Badge helpers ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<RemarkType, string> = {
  exit: "bg-rose-100 text-rose-700 border-rose-200",
  adjust: "bg-amber-100 text-amber-700 border-amber-200",
  retur: "bg-violet-100 text-violet-700 border-violet-200",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  EDITED: "bg-blue-100 text-blue-700",
  STORED_BACK: "bg-slate-100 text-slate-500",
  refunded: "bg-violet-100 text-violet-700",
  stored_back: "bg-slate-100 text-slate-500",
  resolved: "bg-emerald-100 text-emerald-600",
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ entry, onClose }: { entry: RemarkEntry | null; onClose: () => void }) {
  if (!entry) return null

  const typeColor = TYPE_COLORS[entry.type] || "bg-gray-100 text-gray-600"
  const statusColor = STATUS_COLORS[entry.status] || "bg-gray-100 text-gray-600"

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-lg bg-white shadow-2xl h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeColor}`}>
              {entry.typeLabel}
            </span>
            <h2 className="mt-1 text-lg font-bold text-slate-800">{entry.productName}</h2>
          </div>
          <button
            id="btn-close-remark-drawer"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Key info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox label="Tanggal" value={fmtDateTime(entry.date)} />
            <InfoBox label="Status">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                {entry.status}
              </span>
            </InfoBox>
            <InfoBox label="Kode Produk" value={entry.productCode} mono />
            <InfoBox label="Gudang" value={entry.warehouseName} />
          </div>

          {/* Quantities */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Kuantitas</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Jumlah (saat ini)</span>
              <span className="text-lg font-bold text-slate-800">{entry.qty.toLocaleString("id-ID")}</span>
            </div>
            {entry.originalQty !== null && entry.originalQty !== entry.qty && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Jumlah asli (sebelum edit)</span>
                <span className="text-sm font-semibold text-slate-400 line-through">{entry.originalQty.toLocaleString("id-ID")}</span>
              </div>
            )}
            {entry.storedBackQty > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Qty dikembalikan ke gudang</span>
                <span className="text-sm font-semibold text-emerald-600">+{entry.storedBackQty.toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>

          {/* Reason & Note */}
          <div className="space-y-3">
            <InfoBox label="Alasan / Referensi" value={entry.reason} />
            {entry.note && <InfoBox label="Catatan" value={entry.note} />}
          </div>

          {/* Audit trail */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Jejak Audit</p>

            <AuditRow
              icon="✍️"
              label="Dibuat oleh"
              name={entry.createdByName}
              date={entry.date}
            />
            <AuditRow
              icon="✅"
              label="Disetujui oleh"
              name={entry.approvedByName}
            />

            {entry.status === 'EDITED' && entry.lastEditApprovedByName && (
              <>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Riwayat Edit</p>
                  <AuditRow
                    icon="🖊️"
                    label="Edit disetujui oleh"
                    name={entry.lastEditApprovedByName}
                    date={entry.lastEditAt}
                  />
                </div>
              </>
            )}

            {entry.storedBackQty > 0 && entry.storeBackApprovedByName && (
              <>
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold mb-2">Riwayat Store Back</p>
                  <AuditRow
                    icon="🔄"
                    label="Store back disetujui oleh"
                    name={entry.storeBackApprovedByName}
                    date={entry.storedBackAt}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10 bg-black/30 backdrop-blur-sm" />
    </div>
  )
}

function InfoBox({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {children ?? (
        <p className={`mt-0.5 text-sm font-semibold text-slate-700 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      )}
    </div>
  )
}

function AuditRow({ icon, label, name, date }: { icon: string; label: string; name: string; date?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base">{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{name || "—"}</p>
        {date && <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(date)}</p>}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RemarkReportPage() {
  const router = useRouter()
  const hasHydrated = useAuth((s) => s._hasHydrated)
  const loggedIn = useAuth((s) => s.loggedIn)
  const masterAccountId = useAuth((s) => s.masterAccountId)

  const [startDate, setStartDate] = useState(firstOfMonthStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [typeFilter, setTypeFilter] = useState<'all' | RemarkType>('all')
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<RemarkEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [selected, setSelected] = useState<RemarkEntry | null>(null)

  // ─── Auth guard ─────────────────────────────────────────────────────────────
  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  async function runReport() {
    if (!startDate || !endDate) { alert("Pilih rentang tanggal terlebih dahulu."); return }
    setLoading(true)
    setItems([])
    try {
      const params = new URLSearchParams({
        id: masterAccountId,
        startDate,
        endDate,
        type: typeFilter,
      })
      const res = await fetch(`/api/web/reports/remarks?${params}`)
      const data = await res.json()
      if (!data.error) {
        setItems(data.result ?? [])
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
  const filtered = search.trim()
    ? items.filter(r =>
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.productCode.toLowerCase().includes(search.toLowerCase()) ||
      r.createdByName.toLowerCase().includes(search.toLowerCase()) ||
      r.approvedByName.toLowerCase().includes(search.toLowerCase()) ||
      r.warehouseName.toLowerCase().includes(search.toLowerCase())
    )
    : items

  const countByType = {
    exit: items.filter(i => i.type === 'exit').length,
    adjust: items.filter(i => i.type === 'adjust').length,
    retur: items.filter(i => i.type === 'retur').length,
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-rose-50/20 p-6">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="rounded-xl bg-indigo-600 p-2.5 shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Remark Report</h1>
              <p className="text-sm text-slate-500">Laporan kejadian: Exit Item, Adjustment, dan Retur</p>
            </div>
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Filter Laporan</p>
          <div className="flex flex-wrap items-end gap-4">

            {/* Date range */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Mulai</label>
              <input
                id="input-remark-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Tanggal Akhir</label>
              <input
                id="input-remark-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Type filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Jenis Kejadian</label>
              <select
                id="select-remark-type"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[160px]"
              >
                <option value="all">Semua</option>
                <option value="exit">Exit Item</option>
                <option value="adjust">Adjustment</option>
                <option value="retur">Retur</option>
              </select>
            </div>

            <button
              id="btn-run-remark-report"
              onClick={runReport}
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

        {/* ── Summary Cards ────────────────────────────────────────────────────── */}
        {hasRun && !loading && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard label="Total Kejadian" value={items.length} color="indigo" />
            <SummaryCard label="Exit Item" value={countByType.exit} color="rose" icon="🚚" />
            <SummaryCard label="Adjustment" value={countByType.adjust} color="amber" icon="⚖️" />
            <SummaryCard label="Retur" value={countByType.retur} color="violet" icon="↩️" />
          </div>
        )}

        {/* ── Table Card ───────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {hasRun && !loading && (
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <span className="text-sm text-slate-500">{filtered.length} record</span>
              <input
                type="search"
                placeholder="Cari produk, user, gudang…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64 rounded-xl border border-slate-200 px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 gap-3">
              <span className="loading loading-spinner loading-lg text-indigo-600" />
              <p className="text-sm text-slate-400">Memuat laporan…</p>
            </div>
          ) : !hasRun ? (
            <div className="flex flex-col items-center justify-center py-28 text-slate-400 gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-16 text-slate-200 mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="font-semibold">Pilih periode lalu klik <span className="text-indigo-700">Tampilkan Laporan</span></p>
              <p className="text-xs text-slate-300">Remark report akan muncul di sini</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">Tidak ada kejadian yang cocok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Jenis</th>
                    <th className="px-4 py-3 text-left">Produk</th>
                    <th className="px-4 py-3 text-left">Gudang</th>
                    <th className="px-4 py-3 text-center">Jumlah</th>
                    <th className="px-4 py-3 text-left">Dibuat oleh</th>
                    <th className="px-4 py-3 text-left">Disetujui oleh</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Alasan</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((row) => {
                    const typeColor = TYPE_COLORS[row.type] || "bg-gray-100 text-gray-600 border-gray-200"
                    const statusColor = STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"
                    const isEdited = row.status === 'EDITED'

                    return (
                      <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(row.date)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeColor}`}>
                            {row.typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-800">{row.productName}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{row.productCode}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs">{row.warehouseName}</td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-base font-bold text-slate-800">{row.qty.toLocaleString("id-ID")}</span>
                            {isEdited && row.originalQty !== null && row.originalQty !== row.qty && (
                              <span className="text-[10px] text-slate-400 line-through">{row.originalQty.toLocaleString("id-ID")}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-700">{row.createdByName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-700">{row.approvedByName}</p>
                          {isEdited && row.lastEditApprovedByName && (
                            <p className="text-[10px] text-blue-500 mt-0.5">Edit: {row.lastEditApprovedByName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[140px] truncate" title={row.reason}>{row.reason}</td>
                        <td className="px-4 py-3.5">
                          <button
                            id={`btn-remark-detail-${row._id}`}
                            onClick={() => setSelected(row)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline whitespace-nowrap transition-colors"
                          >
                            Detail →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────────────── */}
      <DetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </>
  )
}

// ─── Summary Card Component ───────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon }: {
  label: string
  value: number
  color: 'indigo' | 'rose' | 'amber' | 'violet'
  icon?: string
}) {
  const colorMap = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorMap[color]}`}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest opacity-70">
        {icon && <span className="mr-1">{icon}</span>}{label}
      </p>
      <p className="text-3xl font-bold">{value.toLocaleString("id-ID")}</p>
    </div>
  )
}
