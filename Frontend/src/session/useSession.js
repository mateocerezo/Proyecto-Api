import { useContext } from 'react'
import { SessionContext } from './sessionContext'

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession debe usarse dentro de SessionProvider')
  return value
}
