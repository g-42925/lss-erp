"use client"

import Link from "next/link";
import useAuth from "@/store/auth";
import { useRouter } from "next/navigation";

export default function Sidebar({ children }: { children: any }) {
  const companyName = useAuth((state) => state.name)
  const logout = useAuth((state) => state.logout)
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
          <li>
            <details open>
              <summary>User Management</summary>
              <ul>
                <li>
                  <Link href="/users">Users</Link>
                </li>
                <li>
                  <Link href="/roles">Roles</Link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details open>
              <summary>Contacts</summary>
              <ul>
                <li>
                  <Link href="/suppliers">Suppliers</Link>
                </li>
                <li>
                  <Link href="/customers">Customers</Link>
                </li>
                <li>
                  <Link href="/vendor">Vendor</Link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details open>
              <summary>Product</summary>
              <ul>
                <li>
                  <Link href="/products/add/good">New</Link>
                </li>
                <li>
                  <Link href="/products/category">Category</Link>
                </li>
                <li>
                  <Link href="/products/unit">Unit</Link>
                </li>
                <li>
                  <Link href="/products/location">Location</Link>
                </li>
                <li>
                  <Link href="/products/stock">Stock</Link>
                </li>
                <li>
                  <Link href="/products/measure">Measure</Link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Warehouse</summary>
              <ul>
                <li>
                  <Link href="/warehouse/receiving">Receiving</Link>
                </li>
                <li>
                  <Link href="/warehouse/delivery">Delivery</Link>
                </li>
                <li>
                  <Link href="/warehouse/refund">Refund</Link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Inventory</summary>
              <ul>
                <li>
                  <Link href="/inventory/items">Items</Link>
                </li>
                <li>
                  <Link href="/inventory/usage">Usage Logs</Link>
                </li>
              </ul>

            </details>
          </li>
          <li>
            <details>
              <summary>Purchases</summary>
              <ul>
                <li>
                  <Link href="/purchases/requisition">Requisition</Link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Sales</summary>
              <ul>
                <li>
                  <Link href="/sales/quotations">Quotation</Link>
                </li>
                <li>
                  <Link href="/sales/order">Order</Link>
                </li>
                <li>
                  <Link href="/sales/invoices">Invoice</Link>
                </li>
              </ul>
            </details>
          </li>
          <li>
            <details>
              <summary>Finance</summary>
              <ul>
                <li>
                  <Link href="/finance/purchases">Purchases Approval</Link>
                </li>
                <li>
                  <Link href="/finance/inv-logs">Inventory Approval</Link>
                </li>
                <li>
                  <Link href="/finance/debt">Debts</Link>
                </li>
                <li>
                  <Link href="/finance/receivable">Receivable</Link>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  )
}