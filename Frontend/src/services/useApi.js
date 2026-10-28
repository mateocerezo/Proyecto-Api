import { useAuth } from '@clerk/react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from './api'
import { request } from './api'

export function useApi() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  return useCallback(
    async (path, options = {}) => {
      try {
        return await request(path, { ...options, token: await getToken() })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          navigate('/ingresar', { replace: true })
        }
        throw error
      }
    },
    [getToken, navigate],
  )
}
