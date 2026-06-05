"use client"

import Link from "next/link";
import useAuth from "@/store/auth";
import { useRouter, usePathname } from "next/navigation";
import { usePermission } from "@/hooks/usePermission";

const SidebarItem = ({ href, children }: { href: string, children: React.ReactNode }) => {
  const { canView } = usePermission()
  const pathname = usePathname()

  // if (!canView(href)) return null;
  return (
    <li>
      <Link href={href} className={pathname === href ? "active" : ""}>
        {children}
      </Link>
    </li>
  )
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const companyName = useAuth((state) => state.name)
  const logout = useAuth((state) => state.logout)
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const router = useRouter()

  function _logout() {
    logout()
    router.push('/login')
  }

  return (
    <div className="drawer drawer-open bg-gray-200 text-white">
      <input id="my-drawer-1" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {children}
      </div>
      <div className="drawer-side">
        <label htmlFor="my-drawer-1" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul className="menu bg-base-200 min-h-full w-80 p-0 bg-gray-700">
          <li className="bg-gray-800 p-3 text-white flex flex-row gap-3">
            <a>{companyName}</a>
            <button className="ml-auto" onClick={() => _logout()}>
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
          <li>
            <details open>
              <summary>Contacts</summary>
              <ul>
                <SidebarItem href="/suppliers">Suppliers</SidebarItem>
                <SidebarItem href="/customers">Customers</SidebarItem>
                <SidebarItem href="/vendor">Vendor</SidebarItem>
              </ul>
            </details>
          </li>

          {/* Product */}
          <li>
            <details open>
              <summary>Product</summary>
              <ul>
                <SidebarItem href="/products/add/good">New</SidebarItem>
                <SidebarItem href="/products/category">Category</SidebarItem>
                <SidebarItem href="/products/unit">Unit</SidebarItem>
                <SidebarItem href="/products/measure">Measure</SidebarItem>
                <SidebarItem href="/inventory/exit">Exit</SidebarItem>
              </ul>
            </details>
          </li>

          {/* Warehouse */}
          <li>
            <details>
              <summary>Warehouse</summary>
              <ul>
                <SidebarItem href="/warehouse/delivery">Delivery</SidebarItem>
                <SidebarItem href="/warehouse/new">New</SidebarItem>
                <SidebarItem href="/warehouse/receiving">Receiving</SidebarItem>
                <SidebarItem href="/warehouse/refund">Refund</SidebarItem>
              </ul>
            </details>
          </li>

          {/* Inventory */}
          <li>
            <details>
              <summary>Inventory</summary>
              <ul>
                <SidebarItem href="/inventory/items">Items</SidebarItem>
                <SidebarItem href="/inventory/usage">Usage Logs</SidebarItem>
              </ul>
            </details>
          </li>

          {/* Purchases */}
          <li>
            <details>
              <summary>Purchases</summary>
              <ul>
                <SidebarItem href="/purchases/requisition">Requisition</SidebarItem>
                <SidebarItem href="/purchases/procurement">Procurement</SidebarItem>
              </ul>
            </details>
          </li>

          {/* Sales */}
          <li>
            <details>
              <summary>Sales</summary>
              <ul>
                <SidebarItem href="/sales/quotations">Quotation</SidebarItem>
                <SidebarItem href="/sales/order">Order</SidebarItem>
                <SidebarItem href="/sales/refund">Refund Log</SidebarItem>
                <SidebarItem href="/sales/p-invoice">Invoice</SidebarItem>
                <SidebarItem href="/sales/taxes">Taxes</SidebarItem>
              </ul>
            </details>
          </li>

          <li>
            <details>
              <summary>Report</summary>
              <ul>
                <SidebarItem href="/inventory/stock-report">Stock Report</SidebarItem>
                <SidebarItem href="/work-orders">Work Orders</SidebarItem>
              </ul>
            </details>
          </li>

          {/* Work Orders */}

          {/* Finance */}
          <li>
            <details>
              <summary>Finance</summary>
              <ul>
                <SidebarItem href="/finance/purchases">Purchases Approval</SidebarItem>
                <SidebarItem href="/finance/procurement">Procurement Approval</SidebarItem>
                <SidebarItem href="/finance/inv-logs">Inventory Approval</SidebarItem>
                <SidebarItem href="/finance/debt">Debts</SidebarItem>
                <SidebarItem href="/finance/receivable">Receivable</SidebarItem>
                <SidebarItem href="/finance/bank-accounts">Bank Accounts</SidebarItem>
                <li>
                  <details>
                    <summary>Accounting</summary>
                    <ul>
                      <li>
                        <details>
                          <summary>COA</summary>
                          <ul>
                            <SidebarItem href="/finance/accounting/coa/assets">Assets</SidebarItem>
                          </ul>
                        </details>
                      </li>
                    </ul>
                  </details>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  )
}