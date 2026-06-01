import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface AuthData {
  email: string;
  loggedIn: boolean;
  name: string;
  roleId: string;
  masterAccountId: string;
  pages: Record<string, string[]>;
  isSuperAdmin: boolean;
  locationId: string;
}

const useAuth = create<Auth>()(
  devtools(
    persist(
      (set) => ({
        login: (r: AuthData) => {
          set(() => ({
            ...r
          }))
        },

        logout: () => set(() => ({
          loggedIn: false,
          email: '',
          name: '',
          roleId: '',
          masterAccountId: '',
          locationId: '',
          pages: {},
          isSuperAdmin: false,
          _hasHydrated: false,
        })),

        setLocationId: (locationId: string) => set(() => ({ locationId })),

        email: '',
        loggedIn: false,
        locationId: '',
        name: '',
        roleId: '',
        masterAccountId: '',
        pages: {},
        isSuperAdmin: false,
        _hasHydrated: false,
      }),
      {
        name: 'auth-storage',
        onRehydrateStorage: () => (state) => {
          if (state) state._hasHydrated = true
        },
      }
    )
  )
)


type Auth = AuthData & {
  _hasHydrated: boolean;
  login: (r: AuthData) => void;
  logout: () => void;
  setLocationId: (locationId: string) => void;
}

export default useAuth;