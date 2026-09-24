import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loginRequest } from '../api/realApi'
import { normalizeRole } from '../utils/constants'

const AuthContext = createContext(null)
const STORAGE_KEY = 'securedocs.session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.role) {
          parsed.role = normalizeRole(parsed.role)
        }
        setUser(parsed)
      } catch {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }
    setInitializing(false)
  }, [])

  const login = async (userId, password) => {
    const { user: loggedInUser, token } = await loginRequest(userId, password)
    const normalizedRole = normalizeRole(loggedInUser.role)
    const session = {
      ...loggedInUser,
      role: normalizedRole,
      rawRole: loggedInUser.role,
      token,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }

  const loginAs = (mockUser) => {
    const normalizedRole = normalizeRole(mockUser.role)
    const session = {
      ...mockUser,
      role: normalizedRole,
      token: `mock-jwt-token.${mockUser.id || mockUser.username}.${Date.now()}`,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, initializing, login, loginAs, logout }),
    [user, initializing]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
