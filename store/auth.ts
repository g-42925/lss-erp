import { create } from 'zustand'
import { persist,devtools } from 'zustand/middleware'

const useAuth = create<Auth>()(
  devtools(
    persist(
      (set) => ({
        login:(isSuperAdmin:boolean) => set(() => ({
          loggedIn:true,
          isSuperAdmin,
        })),
        logout:() => set(() => ({loggedIn:false})),
        loggedIn: false,
        isSuperAdmin:false,
        _hasHydrated: false,

      }),
      {
        name:'auth-storage',
        onRehydrateStorage: () => (state:any) => {
          state._hasHydrated = true
        },
      }
    )
  )
)


type Auth = {
  loggedIn:boolean,
  login:(isSuperAdmin:boolean) => void,
  logout:() => void,
  isSuperAdmin:boolean,
  _hasHydrated: boolean
}

export default useAuth;