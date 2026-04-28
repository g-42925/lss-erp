import Dashboard from "@/app/dashboard/page"
import useAuth from "@/store/auth"
import { ComponentType, useEffect, useState } from "react"
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation';

function withAuth(Compt) {
  return function WrappedComponent(props) {
    const state = useAuth((state) => state)
    const hasHydrated = useAuth((s) => s._hasHydrated)
    const pathName = usePathname()
    const router = useRouter()

    return <Compt {...props} />
  }
}

export default withAuth