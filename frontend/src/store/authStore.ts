import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  rememberMe: boolean
  login: (user: User, token: string, rememberMe?: boolean) => void
  logout: () => void
  updateUser: (partial: Partial<User>) => void
  setRole: (role: UserRole) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: false,
      login: (user, token, rememberMe = false) =>
        set({ user, token, isAuthenticated: true, rememberMe }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false, rememberMe: false }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      setRole: (role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        })),
    }),
    { name: 'edupredict-auth' }
  )
)
