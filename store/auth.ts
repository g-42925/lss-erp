import { stringify } from 'querystring'
import { create } from 'zustand'
import { persist,devtools } from 'zustand/middleware'

const useAuth = create<Auth>()(
  devtools(
    persist(
      (set) => ({
        login:(r:any) => {
          console.log(r)
          set(() => ({
            ...r
          }))
        },
        
        logout:() => set(() => ({
          loggedIn:false
        })),
        
        email:'',
        loggedIn: false,
        name:'',
        role:'',
        roleDetail:{},
        isSuperAdmin:false,
        masterAccountId:'',
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
  email:string,
  loggedIn:boolean,
  name:string,
  role:'',
  roleDetail:any,
  isSuperAdmin:boolean,
  masterAccountId:string,
  _hasHydrated: boolean
  login:(r:any) => void,
  logout:() => void,
}

export default useAuth;