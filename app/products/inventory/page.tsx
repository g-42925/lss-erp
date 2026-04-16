"use client"

import Sidebar from "@/components/sidebar";

export default function Inventory() {
  return (
    <Sidebar>
      <div className="h-full p-6 flex flex-col gap-3">
        <span className="text-2xl">Inventory</span>
      </div>
    </Sidebar>
  )
}