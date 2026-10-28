import { request } from './api'

export function submitInquiry(body) {
  return request('/consultas', { method: 'POST', body })
}
