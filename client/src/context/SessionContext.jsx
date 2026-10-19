import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { fetchSession, loginUser, logoutUser } from '../api/auth.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [session, setSession] = useState({
    status: 'loading',
    user: null,
    error: '',
  })
  const requestVersion = useRef(0)

  const refreshSession = useCallback(async () => {
    const currentRequest = ++requestVersion.current
    setSession({ status: 'loading', user: null, error: '' })

    try {
      const user = await fetchSession()

      if (currentRequest === requestVersion.current) {
        setSession({ status: user ? 'authenticated' : 'anonymous', user, error: '' })
      }
    } catch (error) {
      if (currentRequest === requestVersion.current) {
        setSession({ status: 'error', user: null, error: error.message })
      }
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const login = useCallback(async (values) => {
    const user = await loginUser(values)
    requestVersion.current += 1
    setSession({ status: 'authenticated', user, error: '' })
    return user
  }, [])

  const logout = useCallback(async () => {
    await logoutUser()
    requestVersion.current += 1
    setSession({ status: 'anonymous', user: null, error: '' })
  }, [])

  return (
    <SessionContext.Provider value={{ ...session, login, logout, refreshSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSession debe utilizarse dentro de SessionProvider.')
  }

  return context
}
