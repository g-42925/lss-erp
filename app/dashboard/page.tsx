"use client"

import Image from "next/image"
import Link from "next/link";
import useAuth from "@/store/auth"
import Sidebar from "@/components/sidebar";
import { redirect } from "next/navigation";

export default function Dashboard(){
  const auth = useAuth((state) => state)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  if (!hasHydrated) return null
  if(!auth.loggedIn) redirect('/login')
  
  return (
    <div className="flex flex-col justify-center items-center h-full">
      dashboard page
    </div>
  )
}

