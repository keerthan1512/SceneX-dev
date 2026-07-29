import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { authAPI, _clearSession } from '../services/api'

const AuthContext = createContext(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

function saveSession(accessToken, refreshToken, userData) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  // Cache user so the app loads instantly on refresh without a network call
  localStorage.setItem('user', JSON.stringify(userData))
}

function loadCachedUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // Seed state from cache immediately — no loading flash on refresh
  const [user, setUser] = useState(() => loadCachedUser())
  const [loading, setLoading] = useState(true)
  const initRan = useRef(false)

  useEffect(() => {
    // Strict-mode guard — only run once
    if (initRan.current) return
    initRan.current = true

    restoreSession()
  }, [])

  /**
   * On mount:
   * 1. If no tokens at all → guest, done.
   * 2. Try GET /auth/me directly (raw axios, bypassing the api interceptor)
   *    so only ONE thing owns the refresh flow during initialisation.
   *    - Success → update user from server, done.
   *    - 401     → try silent refresh with refresh_token.
   *      - Refresh success → store new tokens, retry /auth/me, done.
   *      - Refresh fail    → clear session, treat as guest.
   *    - Other error (network etc.) → keep cached user, let interceptor
   *      handle future 401s once the backend comes back.
   */
  async function restoreSession() {
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')

    if (!accessToken && !refreshToken) {
      setLoading(false)
      return
    }

    // Raw axios so the response interceptor does NOT race us for the 401
    const rawGet = (token) =>
      axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })

    try {
      let meRes
      try {
        meRes = await rawGet(accessToken)
      } catch (err) {
        if (err.response?.status !== 401 || !refreshToken) {
          // Not a token error (network blip, etc.) — keep cached user
          if (loadCachedUser()) return
          throw err   // no cache → fall through to clear + null
        }

        // Access token expired → silent refresh
        const refreshRes = await axios.post('/auth/refresh', { refresh_token: refreshToken })
        const { access_token: newAccess, refresh_token: newRefresh } = refreshRes.data
        localStorage.setItem('access_token', newAccess)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)

        meRes = await rawGet(newAccess)
      }

      const freshUser = meRes.data
      setUser(freshUser)
      localStorage.setItem('user', JSON.stringify(freshUser))
    } catch {
      // Refresh token invalid / expired or any other hard failure
      _clearSession()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { access_token, refresh_token, user: userData } = res.data
    saveSession(access_token, refresh_token, userData)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data)
    const { access_token, refresh_token, user: userData } = res.data
    saveSession(access_token, refresh_token, userData)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await authAPI.logout() } catch { /* ignore — clear locally regardless */ }
    _clearSession()
    setUser(null)
  }, [])

  // Keep localStorage user cache in sync whenever user state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
