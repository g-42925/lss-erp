import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

const useAuth = create<Auth>()(
  devtools(
    persist(
      (set) => ({
        login: (r: any) => {
          console.log(r)
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
          permission: '',
          pages: [],
          isSuperAdmin: false,
          _hasHydrated: false,
        })),

        email: '',
        loggedIn: false,
        name: '',
        roleId: '',
        masterAccountId: '',
        permission: '',
        pages: [],
        isSuperAdmin: false,
        _hasHydrated: false,
      }),
      {
        name: 'auth-storage',
        onRehydrateStorage: () => (state: any) => {
          state._hasHydrated = true
        },
      }
    )
  )
)


type Auth = {
  email: string,
  loggedIn: boolean,
  name: string,
  roleId: string,
  masterAccountId: string,
  _hasHydrated: boolean,
  permission: string,
  pages: string[],
  isSuperAdmin: boolean,
  login: (r: any) => void,
  logout: () => void,
}

export default useAuth;