"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useAuth from "@/store/auth"

// ─── Types ────────────────────────────────────────────────────────────────────
type MonthlyPoint = { _id: { year: number; month: number }; revenue: number; orders: number }
type TopProduct = { _id: string; productName: string; totalRevenue: number; totalQty: number }
type RecentOrder = { _id: string; salesOrderNumber: string; total: number; saleDate: string; customerId?: { bussinessName?: string; name?: string } | null }
type LowStock = { _id: string; batchNumber: string; qty: number; productName: string; expiryDate?: string }
type PurchaseStatus = { _id: string; count: number; total: number }

type DashboardData = {
  revenueThisMonth: number
  revenueLastMonth: number
  revenueChange: number
  orderCountThisMonth: number
  orderCountLastMonth: number
  orderCountChange: number
  purchaseSpendThisMonth: number
  purchaseSpendLastMonth: number
  purchaseChange: number
  outstandingReceivable: number
  outstandingReceivableCount: number
  totalDebt: number
  totalDebtCount: number
  todayRevenue: number
  todayOrders: number
  expiringCount: number
  expiringQty: number
  expiredCount: number
  expiredQty: number
  totalCustomers: number
  totalProducts: number
  pendingPurchases: number
  totalPurchase: number
  totalExpense: number
  purchaseStatusBreakdown: PurchaseStatus[]
  monthlyTrend: MonthlyPoint[]
  monthlyServiceTrend: MonthlyPoint[]
  topProducts: TopProduct[]
  recentOrders: RecentOrder[]
  lowStockBatches: LowStock[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v)

const SHORT_IDR = (v: number) => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`
  return IDR(v)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })

function pct(val: number) {
  const s = val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)
  return `${s}%`
}


// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, change, icon, gradient, linkHref
}: {
  label: string; value: string; sub?: string; change?: number
  icon: React.ReactNode; gradient: string; linkHref?: string
}) {
  const changeColor = change === undefined ? "" : change >= 0 ? "text-emerald-500" : "text-rose-500"
  const changeBg = change === undefined ? "" : change >= 0 ? "bg-emerald-50" : "bg-rose-50"
  const arrow = change === undefined ? "" : change >= 0 ? "↑" : "↓"

  const inner = (
    <div className={`rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${gradient} text-white relative overflow-hidden`}>
      {/* Decorative bg circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
            {icon}
          </div>
          {change !== undefined && (
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${changeBg} ${changeColor}`}>
              {arrow} {pct(Math.abs(change))}
            </span>
          )}
        </div>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-extrabold leading-none truncate">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-1.5">{sub}</p>}
      </div>
    </div>
  )
  return linkHref ? <Link href={linkHref} className="block">{inner}</Link> : inner
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ icon, label, value, sub, severity }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; severity: "warn" | "danger" | "info"
}) {
  const map = {
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
  }
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${map[severity]}`}>
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-lg font-extrabold">{value}</p>
        <p className="text-xs opacity-60 truncate">{sub}</p>
      </div>
    </div>
  )
}

// ─── Section title ────────────────────────────────────────────────────────────
function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon && <span className="text-lg">{icon}</span>}
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">{children}</h2>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const hasHydrated = useAuth(s => s._hasHydrated)
  const loggedIn = useAuth(s => s.loggedIn)
  const masterAccountId = useAuth(s => s.masterAccountId)
  const companyName = useAuth(s => s.name)

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchDashboard = useCallback(async () => {
    if (!masterAccountId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/web/dashboard?id=${masterAccountId}`)
      const json = await res.json()
      if (json.error) throw new Error(json.message)
      setData(json.data)
      setLastRefresh(new Date())
      console.log(JSON.stringify(json.data))
    }
    catch (e: unknown) {
      setError((e as Error).message)
    }
    finally {
      setLoading(false)
    }
  }, [masterAccountId])

  useEffect(() => {
    if (hasHydrated && loggedIn) fetchDashboard()
  }, [hasHydrated, loggedIn, fetchDashboard])

  if (!hasHydrated) return null
  if (!loggedIn) { router.push("/login"); return null }

  // ─── Merge monthly trend ──────────────────────────────────────────────────
  const mergedMonthly = (() => {
    const map: Record<string, { label: string; revenue: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const k = `${d.getFullYear()}-${d.getMonth() + 1}`
      map[k] = { label: MONTHS[d.getMonth()], revenue: 0 }
    }
    for (const p of data?.monthlyTrend ?? []) {
      const k = `${p._id.year}-${p._id.month}`
      if (map[k]) map[k].revenue += p.revenue
    }
    for (const p of data?.monthlyServiceTrend ?? []) {
      const k = `${p._id.year}-${p._id.month}`
      if (map[k]) map[k].revenue += p.revenue
    }
    return Object.values(map)
  })()

  // ─── Purchase status breakdown map ────────────────────────────────────────
  const purchaseMap: Record<string, number> = {}
  for (const s of data?.purchaseStatusBreakdown ?? []) {
    purchaseMap[s._id] = (purchaseMap[s._id] ?? 0) + s.count
  }

  const statusColors: Record<string, string> = {
    requested: "bg-amber-400",
    approved: "bg-blue-400",
    ordered: "bg-violet-400",
    completed: "bg-emerald-400",
    rejected: "bg-rose-400",
  }
  const statusLabels: Record<string, string> = {
    requested: "Requested",
    approved: "Approved",
    ordered: "Ordered",
    completed: "Completed",
    rejected: "Rejected",
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/30 text-slate-800">

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800 leading-tight">Dashboard ERP</h1>
          <p className="text-xs text-slate-400">{companyName} &middot; {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">
            Diperbarui: {lastRefresh.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={`size-3.5 ${loading ? "animate-spin" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-[1600px] mx-auto">

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-rose-700 flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-bold text-sm">Gagal memuat data</p>
              <p className="text-xs opacity-70">{error}</p>
            </div>
          </div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-slate-200 animate-pulse h-28" />
            ))}
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Today summary banner ────────────────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-5 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Pendapatan Hari Ini</p>
                <p className="text-3xl font-extrabold">{data.todayRevenue.toLocaleString("id-ID")}</p>
              </div>
              <div className="w-px h-10 bg-white/20 hidden sm:block" />
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Order Hari Ini</p>
                <p className="text-3xl font-extrabold">{data.todayOrders}</p>
              </div>
              <div className="w-px h-10 bg-white/20 hidden sm:block" />
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Purchase Pending</p>
                <p className="text-3xl font-extrabold">{data.pendingPurchases}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-white/60 text-xs">Live</span>
              </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────────── */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Total Revenue"
                  value={SHORT_IDR(data.revenueThisMonth)}
                  change={data.revenueChange}
                  gradient="bg-gradient-to-br from-violet-600 to-purple-700"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
                  linkHref="/reports/profit-loss"
                />
                <KpiCard
                  label="Total Order"
                  value={String(data.orderCountThisMonth)}
                  change={data.orderCountChange}
                  gradient="bg-gradient-to-br from-sky-500 to-blue-600"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>}
                  linkHref="/sales/order"
                />
                <KpiCard
                  label="Pengeluaran"
                  value={SHORT_IDR(data.totalExpense)}
                  change={-data.purchaseChange}
                  gradient="bg-gradient-to-br from-orange-500 to-amber-600"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>}
                  linkHref="/purchases/requisition"
                />
                <KpiCard
                  label="Piutang"
                  value={data.outstandingReceivable.toLocaleString("id-ID")}
                  gradient="bg-gradient-to-br from-teal-500 to-emerald-600"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>}
                  linkHref="/finance/receivable"
                />
              </div>
            </div>

            {/* ── Secondary KPI ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Pelanggan", value: data.totalCustomers, icon: "🧑‍💼", href: "/customers" },
                { label: "Total Produk", value: data.totalProducts, icon: "📦", href: "/products/add/good" },
                { label: "Total Purchase", value: data.totalPurchase.toLocaleString("id-ID"), icon: "🧑‍💼", href: "/purchases/requisition" },
                { label: "Hutang", value: data.totalDebt.toLocaleString("id-ID"), icon: "💳", href: "/finance/debt" },
                { label: "Expiry", value: data.expiringCount, icon: "⚠️", href: "/reports/expiry" },
                { label: "Expired", value: data.expiredCount, icon: "🚨", href: "/reports/expiry" },
              ]
                .map((item) => (
                  <Link key={item.label} href={item.href} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-1">
                    <p className="text-2xl">{item.icon}</p>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest leading-none">{item.label}</p>
                    <p className="text-lg font-extrabold text-slate-800">{item.value}</p>
                  </Link>
                ))}
            </div>

            {/* ── Middle row: Chart + Alerts + Purchase Status ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Revenue Trend Chart */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <SectionTitle icon="📈">Revenue 6 Bulan Terakhir</SectionTitle>
                <div className="flex items-end gap-1.5 h-36 w-full">
                  {mergedMonthly.map((p, i) => {
                    const max = Math.max(...mergedMonthly.map(m => m.revenue), 1)
                    const h = Math.max(4, (p.revenue / max) * 100)
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative">
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-violet-500 to-purple-400 transition-all duration-700 hover:from-violet-600 hover:to-purple-500 cursor-pointer"
                          style={{ height: `${h}%` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {SHORT_IDR(p.revenue)}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{p.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total bulan ini: <span className="font-bold text-violet-600">{IDR(data.revenueThisMonth)}</span></span>
                  <span className={`text-xs font-bold ${data.revenueChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {data.revenueChange >= 0 ? "▲" : "▼"} {pct(Math.abs(data.revenueChange))} vs bulan lalu
                  </span>
                </div>
              </div>

              {/* Purchase Status Pie-like */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <SectionTitle icon="🛒">Status Pembelian Bulan Ini</SectionTitle>
                <div className="space-y-2.5">
                  {Object.entries(statusLabels).map(([key, label]) => {
                    const count = purchaseMap[key] ?? 0
                    const total = Object.values(purchaseMap).reduce((a, b) => a + b, 0) || 1
                    const pctVal = Math.round((count / total) * 100)
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-700">{label}</span>
                          <span className="text-slate-400">{count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${statusColors[key] ?? "bg-slate-400"}`}
                            style={{ width: `${pctVal}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {Object.keys(purchaseMap).length === 0 && (
                  <p className="text-slate-400 text-xs text-center py-6">Tidak ada data pembelian bulan ini</p>
                )}
              </div>
            </div>

            {/* ── Alerts row ──────────────────────────────────────────────────── */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <AlertCard
                  icon="⚠️"
                  label="Segera Expired (10 hari)"
                  value={`${data.expiringCount}`}
                  severity="warn"
                />
                <AlertCard
                  icon="🚨"
                  label="Sudah Expired"
                  value={`${data.expiredCount}`}
                  severity="danger"
                />
                <AlertCard
                  icon="📬"
                  label="Piutang"
                  value={`${data.outstandingReceivableCount}`}
                  severity="warn"
                />
                <AlertCard
                  icon="💳"
                  label="Hutang"
                  value={data.totalDebt.toLocaleString("id-ID")}
                  severity="info"
                />
              </div>
            </div>

            {/* ── Bottom row: Top Products + Recent Orders + Low Stock ────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Top Products */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <SectionTitle icon="🏆">Top 5 Produk Bulan Ini</SectionTitle>
                {data.topProducts.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">Belum ada data produk bulan ini</p>
                ) : (
                  <div className="space-y-3">
                    {data.topProducts.map((p, i) => {
                      const maxRev = data.topProducts[0]?.totalRevenue || 1
                      const barPct = Math.round((p.totalRevenue / maxRev) * 100)
                      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
                      return (
                        <div key={p._id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm">{medals[i]}</span>
                              <p className="text-sm font-semibold text-slate-700 truncate">{p.productName}</p>
                            </div>
                            <p className="text-xs font-bold text-violet-600 ml-2 whitespace-nowrap">{SHORT_IDR(p.totalRevenue)}</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-700"
                              style={{ width: `${barPct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{p.totalQty} unit terjual</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Order Terbaru</h2>
                  </div>
                  <Link href="/sales/order" className="text-xs text-violet-600 hover:underline font-semibold">Lihat Semua →</Link>
                </div>
                {data.recentOrders.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-8">Tidak ada order</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentOrders.map((o) => {
                      const customerName = o.customerId?.bussinessName ?? o.customerId?.name ?? ""
                      return (
                        <div key={o._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 font-mono">{o.salesOrderNumber}</p>
                            <p className="text-[11px] text-slate-400 truncate">{customerName}</p>
                            <p className="text-[11px] text-slate-300">{fmtDate(o.saleDate)}</p>
                          </div>
                          <p className="text-sm font-bold text-slate-800 ml-2 whitespace-nowrap">{SHORT_IDR(o.total)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Low Stock */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span>📉</span>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Stok Menipis</h2>
                  </div>
                  <Link href="/warehouse/availability" className="text-xs text-violet-600 hover:underline font-semibold">Lihat Stok →</Link>
                </div>
                {data.lowStockBatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-1">
                    <span className="text-3xl">✅</span>
                    <p className="text-slate-400 text-xs text-center">Semua stok dalam kondisi baik</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.lowStockBatches.map((b) => (
                      <div key={b._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{b.productName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{b.batchNumber}</p>
                          {b.expiryDate && (
                            <p className="text-[11px] text-amber-500">Exp: {fmtDate(b.expiryDate)}</p>
                          )}
                        </div>
                        <span className={`ml-2 rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${b.qty <= 5 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                          {b.qty} unit
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Quick Links ──────────────────────────────────────────────────── */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: "Order Baru", icon: "➕", href: "/sales/order", color: "bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-100" },
                  { label: "Quotation", icon: "📄", href: "/sales/quotations", color: "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-100" },
                  { label: "Requisition", icon: "🛒", href: "/purchases/requisition", color: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-100" },
                  { label: "Receiving", icon: "📥", href: "/warehouse/receiving", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-100" },
                  { label: "Invoice", icon: "🧾", href: "/sales/p-invoice", color: "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-100" },
                  { label: "Laporan P&L", icon: "📊", href: "/reports/profit-loss", color: "bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-100" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`rounded-2xl border p-4 flex flex-col items-center gap-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-md duration-200 ${l.color}`}
                  >
                    <span className="text-2xl">{l.icon}</span>
                    <span className="text-xs font-bold leading-tight">{l.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
