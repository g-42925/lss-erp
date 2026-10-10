"use client"

import Link from "next/link";
import useAuth from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";
import { useState, useEffect, useRef } from "react";

const SidebarItem = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const { canView } = usePermission()
  const pathname = usePathname()

  function closeSidebar() {
    const drawerToggle = document.getElementById('my-drawer-1') as HTMLInputElement | null
    if (drawerToggle) drawerToggle.checked = false
  }

  if (!canView(href)) return null;
  return (
    <li>
      <Link href={href} className={pathname === href ? "active" : ""} onClick={closeSidebar}>
        {children}
      </Link>
    </li>
  )
}

/**
 * ParentMenu: renders a <details> parent group only if the user
 * can view at least one of the child links.
 */
function ParentMenu({
  label,
  links,
  defaultOpen = false,
  children,
}: {
  label: string
  links: string[]
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const { canViewGroup } = usePermission()
  if (!canViewGroup(links)) return null
  return (
    <li>
      <details open={defaultOpen}>
        <summary>{label}</summary>
        <ul>{children}</ul>
      </details>
    </li>
  )
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const companyName = useAuth((state) => state.name)
  const logout = useAuth((state) => state.logout)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const drawerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      // Kalau sedang open lewat checkbox (mobile/overlay), tutup dulu
      if (drawerRef.current) drawerRef.current.checked = false
      return next
    })
  }

  if (pathname === '/login' || pathname === '/select-location' || pathname === '/reset' || pathname.includes('/print')) {
    return <>{children}</>
  }

  function _logout() {
    logout()
    router.push('/login')
  }

  // Saat tidak collapsed: lg:drawer-open → sidebar selalu terlihat di desktop
  // Saat collapsed      : hilangkan lg:drawer-open → sidebar jadi overlay mode di desktop
  const drawerClass = collapsed
    ? "drawer bg-gray-200 text-white print:bg-transparent print:text-black print:block h-screen"
    : "drawer lg:drawer-open bg-gray-200 text-white print:bg-transparent print:text-black print:block h-screen"

  return (
    <>
      <style>{`
        /* Tab kecil untuk membuka kembali sidebar di desktop saat collapsed */
        .sidebar-reopen-tab {
          position: fixed;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          z-index: 200;
          background: #374151;
          color: white;
          border-radius: 0 6px 6px 0;
          padding: 10px 5px;
          cursor: pointer;
          box-shadow: 2px 0 8px rgba(0,0,0,0.3);
          transition: background 0.15s, padding 0.15s;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sidebar-reopen-tab:hover {
          background: #4b5563;
          padding-left: 8px;
        }
        @media print {
          .sidebar-reopen-tab { display: none !important; }
        }
      `}</style>

      <div className={drawerClass}>
        <input id="my-drawer-1" ref={drawerRef} type="checkbox" className="drawer-toggle" />

        {/* ── Konten utama ── */}
        <div className="drawer-content flex flex-col h-screen overflow-hidden print:w-full print:h-auto">
          {/* Navbar mobile (hamburger) */}
          <div className="w-full navbar bg-gray-800 text-white lg:hidden shrink-0 z-[60] print:hidden">
            <div className="flex-none">
              <label htmlFor="my-drawer-1" aria-label="open sidebar" className="btn btn-square btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </label>
            </div>
            <div className="flex-1 px-2 mx-2 font-bold max-w-full truncate text-sm uppercase tracking-wider">
              {companyName || "ERP System"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full relative text-black print:text-black">
            {children}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="drawer-side print:hidden z-[100]">
          <label htmlFor="my-drawer-1" aria-label="close sidebar" className="drawer-overlay"></label>
          <ul className="menu bg-gray-700 min-h-full w-80 p-0 text-white">

            {/* Header sidebar */}
            <li className="bg-gray-800 p-3 text-white flex flex-row items-center gap-2">
              {/* Tombol toggle — hanya tampil di desktop */}
              <button
                onClick={toggleCollapsed}
                title="Sembunyikan sidebar"
                className="hidden lg:flex opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <a href="/dashboard" className="font-semibold flex-1 truncate text-sm">{companyName}</a>
              <button className="ml-auto opacity-70 hover:opacity-100 transition-opacity flex-shrink-0" onClick={() => _logout()}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
                </svg>
              </button>
            </li>

            {/* User Management — superadmin only */}
            {isSuperAdmin && (
              <li>
                <details open>
                  <summary>User Management</summary>
                  <ul>
                    <SidebarItem href="/users">Users</SidebarItem>
                    <SidebarItem href="/roles">Roles</SidebarItem>
                    <SidebarItem href="/products/location">Location</SidebarItem>
                  </ul>
                </details>
              </li>
            )}

            {/* Contacts */}
            <ParentMenu
              label="Contacts"
              links={["/customers", "/vendor", "/suppliers"]}
            >
              <SidebarItem href="/customers">Customers</SidebarItem>
              <SidebarItem href="/vendor">Vendor</SidebarItem>
              <SidebarItem href="/suppliers">Suppliers</SidebarItem>
            </ParentMenu>

            {/* Product */}
            <ParentMenu
              label="Product"
              links={["/products/catalog", "/products/add/good", "/products/packaging", "/products/list"]}
            >
              <SidebarItem href="/products/catalog">Catalog</SidebarItem>
              <SidebarItem href="/products/add/good">New</SidebarItem>
              <SidebarItem href="/products/packaging">UoM</SidebarItem>
              <SidebarItem href="/products/list">List</SidebarItem>
            </ParentMenu>

            {/* Warehouse */}
            <ParentMenu
              label="Warehouse"
              links={[
                "/inventory/exit", "/warehouse/adjust", "/warehouse/availability",
                "/warehouse/movement", "/warehouse/log", "/warehouse/new",
                "/warehouse/receiving", "/warehouse/rlog", "/warehouse/qc", "/warehouse/alerts"
              ]}
            >
              <SidebarItem href="/inventory/exit">Exit</SidebarItem>
              <SidebarItem href="/warehouse/adjust">Adjust</SidebarItem>
              <SidebarItem href="/warehouse/availability">Stock</SidebarItem>
              <SidebarItem href="/warehouse/movement">Shipping</SidebarItem>
              <SidebarItem href="/warehouse/log">Shipping Log</SidebarItem>
              <SidebarItem href="/warehouse/new">New</SidebarItem>
              <SidebarItem href="/warehouse/receiving">Receiving</SidebarItem>
              <SidebarItem href="/warehouse/rlog">Receiving Log</SidebarItem>
              <SidebarItem href="/warehouse/qc">Quality Check</SidebarItem>
              <SidebarItem href="/warehouse/alerts">Stock Alerts</SidebarItem>
            </ParentMenu>

            {/* Inventory */}
            <ParentMenu
              label="Inventory"
              links={["/inventory/items", "/inventory/usage", "/batches"]}
            >
              <SidebarItem href="/inventory/items">Items</SidebarItem>
              <SidebarItem href="/inventory/usage">Usage Logs</SidebarItem>
            </ParentMenu>

            {/* Purchases */}
            <ParentMenu
              label="Purchases"
              links={["/purchases", "/purchases/purchase-return"]}
            >
              <SidebarItem href="/purchases">Requisition</SidebarItem>
              {/*<SidebarItem href="/purchases/purchase-return">Purchase Return</SidebarItem>*/}
            </ParentMenu>

            {/* Sales */}
            <ParentMenu
              label="Sales"
              links={["/sales/order", "/sales/svc-order", "/sales/refund", "/sales/p-invoice", "/sales/svc-invoice", "/sales/quotation"]}
            >
              <SidebarItem href="/sales/order">Order</SidebarItem>
              <SidebarItem href="/sales/svc-order">Service Order</SidebarItem>
              <SidebarItem href="/sales/refund">Refund Log</SidebarItem>
              <SidebarItem href="/sales/p-invoice">Invoice</SidebarItem>
              <SidebarItem href="/sales/svc-invoice">Service Invoice</SidebarItem>
              <SidebarItem href="/sales/quotation">Quotation</SidebarItem>
            </ParentMenu>

            {/* Finance */}
            <ParentMenu
              label="Finance"
              links={[
                "/finance/purchases", "/finance/purchase-return", "/finance/debt",
                "/finance/bank-accounts", "/finance/bank-report", "/finance/log",
                "/finance/svc-log", "/finance/inv-logs",
                "/finance/voucher/cash", "/finance/voucher/bank",
                "/finance/accounting/journal", "/finance/accounting/coa", "/finance/accounting/coa/assets"
              ]}
            >
              <SidebarItem href="/finance/purchases">Purchases Approval</SidebarItem>
              {/*<SidebarItem href="/finance/purchase-return">Purchase Return Approval</SidebarItem>*/}
              <SidebarItem href="/finance/debt">Debts</SidebarItem>
              {/*<SidebarItem href="/finance/receivable">Receivable</SidebarItem>*/}
              {/*<SidebarItem href="/finance/svc-receivable">Service Receivable</SidebarItem>*/}
              <SidebarItem href="/finance/bank-accounts">Bank Accounts</SidebarItem>
              <SidebarItem href="/finance/bank-report">Bank Report</SidebarItem>
              <SidebarItem href="/finance/log">Finance Log</SidebarItem>
              <SidebarItem href="/finance/svc-log">Service Log</SidebarItem>
              <SidebarItem href="/finance/inv-logs">Inventory Logs</SidebarItem>
              <li>
                <details>
                  <summary>Voucher</summary>
                  <ul>
                    <SidebarItem href="/finance/voucher/cash">Voucher Cash</SidebarItem>
                    <SidebarItem href="/finance/voucher/bank">Voucher Bank</SidebarItem>
                  </ul>
                </details>
              </li>
              <li>
                <details>
                  <summary>Accounting</summary>
                  <ul>
                    <SidebarItem href="/finance/accounting/journal">General Journal</SidebarItem>
                    <SidebarItem href="/finance/accounting/coa">Master COA</SidebarItem>
                    <li>
                      <details>
                        <summary>Reports</summary>
                        <ul>
                          <SidebarItem href="/finance/accounting/coa/assets">Assets Summary</SidebarItem>
                        </ul>
                      </details>
                    </li>
                  </ul>
                </details>
              </li>
            </ParentMenu>

            {/* HRM / Payroll */}
            <ParentMenu
              label="HRM"
              links={["/payroll"]}
            >
              <SidebarItem href="/payroll">Payroll</SidebarItem>
            </ParentMenu>

            {/* Asset Management */}
            <ParentMenu
              label="Asset"
              links={["/assets"]}
            >
              <SidebarItem href="/assets">Asset Perusahaan</SidebarItem>
            </ParentMenu>

            {/* Master Data */}
            {
              /*
                <li>
                  <details>
                    <summary>Master Data</summary>
                    <ul>
                      <SidebarItem href="/master">Master Data Config</SidebarItem>
                    </ul>
                  </details>
                </li>
              */
            }
            <SidebarItem href="/sales/taxes">Taxes</SidebarItem>

            {/* Report */}
            <ParentMenu
              label="Report"
              links={[
                "/dashboard/finance/cashflow", "/reports/profit-loss", "/reports/tax",
                "/reports/product-sell", "/reports/product-purchase",
                "/finance/report/sell-payment", "/finance/report/purchase-payment",
                "/reports/stock-report", "/reports/remarks", "/reports/expiry", "/work-orders"
              ]}
            >
              <SidebarItem href="/dashboard/finance/cashflow">Cashflow</SidebarItem>
              <SidebarItem href="/reports/profit-loss">Profit &amp; Loss</SidebarItem>
              <SidebarItem href="/reports/tax">Tax Report</SidebarItem>
              <SidebarItem href="/reports/product-sell">Product Sales</SidebarItem>
              <SidebarItem href="/reports/product-purchase">Product Purchases</SidebarItem>
              <SidebarItem href="/finance/report/sell-payment">Sell Payment</SidebarItem>
              <SidebarItem href="/finance/report/purchase-payment">Purchase Payment</SidebarItem>
              <SidebarItem href="/reports/stock-report">Stock Report</SidebarItem>
              <SidebarItem href="/reports/remarks">Remark Report</SidebarItem>
              <SidebarItem href="/reports/expiry">Expiry Report</SidebarItem>
              <SidebarItem href="/work-orders">Work Orders</SidebarItem>
            </ParentMenu>
          </ul>
        </div>
      </div>

      {/* Tab untuk membuka kembali sidebar — hanya muncul di desktop saat collapsed */}
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          title="Tampilkan sidebar"
          className="sidebar-reopen-tab hidden lg:flex"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}
    </>
  )
}