import Link from "next/link";

function Sidebar(){
  return (
    <div className="drawer drawer-open bg-gray-900">
      <input id="my-drawer-1" type="checkbox" className="drawer-toggle" />
      <div className="drawer-side">
        <label htmlFor="my-drawer-1" aria-label="close sidebar" className="drawer-overlay"></label>
        <ul className="menu bg-base-200 min-h-full w-80 p-0">
          <li className="bg-gray-800 p-3 text-white"><a>PT. Tembaga Makmur</a></li>
          <li className="bg-gray-700 p-3 text-white">
            <details open>
              <summary>User Management</summary>
              <ul>
                <li>
                  <Link href="/users">Users</Link>
                </li>
                <li><a>Roles</a></li>
              </ul>
            </details>
          </li>
        </ul>
      </div>
    </div>
  )
}