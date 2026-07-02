import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  accountId: string | null
  username: string | null
  role: string | null
  isAuthenticated: boolean
  login: (token: string, accountId: string, username: string, role: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      accountId: null,
      username: null,
      role: null,
      isAuthenticated: false,
      login: (token, accountId, username, role) =>
        set({ token, accountId, username, role, isAuthenticated: true }),
      logout: () =>
        set({ token: null, accountId: null, username: null, role: null, isAuthenticated: false }),
    }),
    { name: 'oms-auth' }
  )
)
