import useAuth from "@/store/auth"
import { ComponentType, useEffect } from "react"
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation';

function withAuth<T extends object>(Compt: ComponentType<T>) {
  return function WrappedComponent(props: T) {
    const loggedIn = useAuth((state) => state.loggedIn)
    const isSuperAdmin = useAuth((state) => state.isSuperAdmin)
    const pages = useAuth((state) => state.pages)
    const hasHydrated = useAuth((s) => s._hasHydrated)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
      if (hasHydrated) {
        if (!loggedIn && pathname !== '/login') {
          //router.push('/login')
        }
        else if (loggedIn && !isSuperAdmin && pathname !== '/dashboard') {
          // Check if user has view permission for this page
          // We normalize pathname by removing trailing slashes if any
          const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname

          if (!pages[normalizedPath] || !pages[normalizedPath].includes('view')) {
            //router.push('/dashboard')
          }
        }
      }
    }, [hasHydrated, loggedIn, pathname, isSuperAdmin, pages, router])

    if (!hasHydrated) return null

    return <Compt {...props} />
  }
}

export default withAuth