"use client"

import Image from "next/image"
import useAuth from "@/store/auth"
import { redirect,useRouter } from "next/navigation";
import { useState } from "react";
import useFetch from "@/hooks/useFetch";

export default function Users(){
  const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
  const hasHydrated = useAuth((s) => s._hasHydrated)

  if (!hasHydrated) return null
  if(!isSuperAdmin) redirect('/dashboard')
  
  return (
    <></>
  )
}

type Failed = {
    message:string
}