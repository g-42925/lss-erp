"use client"

import Link from "next/link";
import useAuth from "@/store/auth";

export default function Sidebar({children}:{children:any}){
  const companyName = useAuth((state) => state.name)
  

  return (
    <div className="drawer drawer-open bg-gray-200">
      <input id="my-drawer-1" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {children}
      </div>
      <div className="drawer-side">
        <label htmlFor="my-drawer-1" arisa-label="close sidebar" className="drawer-overlay"></label>
        <ul className="menu bg-base-200 min-h-full w-80 p-0 bg-gray-700">
          <li className="bg-gray-800 p-3 text-white"><a>{companyName}</a></li>
          <li className="bg-gray-700 p-3 text-white">
            <details open>
              <summary>User Management</summary>
              <ul>
                <li>
                  <Link href="/users">Users</Link>
                </li>
                <li>
                  <Link href="/roles">
                    Roles
                  </Link>
                </li>
              </ul>
            </details>
            <details open>
              <summary>Contacts</summary>
              <ul>
                <li>
                  <Link href="/suppliers">Suppliers</Link>
                </li>
                <li>
                  <Link href="/customers">
                    Customers
                  </Link>
                </li>
                <li>
                  <Link href="/vendor">
                    Vendor
                  </Link>
                </li>
              </ul>
            </details>
            <details open>
              <summary>Goods & Services</summary>
              <ul>
                <li>
                  <Link href="/products/add/good">New Good</Link>
                </li>
                <li>
                  <Link href="/products/add/service">New Service</Link>
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
              </ul>
            </details>
            <details>
              <summary>
                Warehouse
              </summary>
              <ul>
                <li>
                  <Link href="/warehouse/receiving">
                    Receiving
                  </Link>
                </li>
                <li>
                  <Link href="/warehouse/delivery">
                    Delivery
                  </Link>
                </li>
                <li>
                  <Link href="/warehouse/receiving">
                    Refund
                  </Link>
                </li>
              </ul>
            </details>
            <details>
              <summary>
                Purchases
              </summary>
              <ul>
                <li>
                  <Link href="/purchases/requisition">
                    Requisition
                  </Link>
                </li>
              </ul>
            </details>
            <details>
              <summary>
                Sales
              </summary>
              <ul>
                <li>
                  <Link href="/sales/quotations">
                    Quotation
                  </Link>
                </li>
                <li>
                  <Link href="/sales/order">
                    Order
                  </Link>
                </li>
              </ul>
            </details>
            <details>
              <summary>
                Finance
              </summary>
              <ul>
                <li>
                  <Link href="/finance/purchases">
                    Purchases
                  </Link>
                </li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  )
}