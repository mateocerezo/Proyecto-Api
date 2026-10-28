import { useAuth } from '@clerk/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, request } from '../services/api'
import { useApi } from '../services/useApi'
import { SessionContext } from './sessionContext'

export function SessionProvider({ children }) {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth()
  const api = useApi()
  const [session, setSession] = useState({ status: 'loading', user: null, error: '', userId: null, revision: -1 })
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    let active = true
    if (!isLoaded || !isSignedIn) return () => { active = false }
    async function resolveSession() {
      try {
        const token = await getToken()
        try {
          const admin = await request('/auth/superadmin', { token })
          if (active) setSession({ status: 'admin', user: admin, error: '', userId, revision })
          return
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 403) throw error
        }

        try {
          const user = await api('/auth/me')
          if (active) setSession({ status: 'active', user, error: '', userId, revision })
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 403) throw error
          const statusByCode = {
            SIN_EMPRESA: 'no-company',
            EMPRESA_INACTIVA: 'inactive-company',
            USUARIO_INACTIVO: 'inactive-user',
          }
          const status = statusByCode[error.codigo]
          if (!status) throw error
          if (active) setSession({ status, user: null, error: '', userId, revision })
        }
      } catch (error) {
        if (active) {
          setSession({
            status: error instanceof ApiError && error.status === 401 ? 'signed-out' : 'error',
            user: null,
            error: error.message || 'No se pudo verificar la sesión.',
            userId,
            revision,
          })
        }
      }
    }

    resolveSession()
    return () => { active = false }
  }, [api, getToken, isLoaded, isSignedIn, revision, userId])

  const value = useMemo(() => {
    const currentSession = !isLoaded
      ? { status: 'loading', user: null, error: '' }
      : !isSignedIn
        ? { status: 'signed-out', user: null, error: '' }
        : session.userId !== userId || session.revision !== revision
          ? { status: 'loading', user: null, error: '' }
          : session
    return { ...currentSession, refresh, api }
  }, [api, isLoaded, isSignedIn, refresh, revision, session, userId])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
