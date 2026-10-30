const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, data = {}) {
    super(data.mensaje || `Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.codigo = data.codigo
    this.detalles = data.detalles
  }
}

// URL pública de una foto subida por una empresa (para <img src>).
export const imageUrl = (id) => `${API_URL}/imagenes/${id}`

export async function request(path, { method = 'GET', body, token } = {}) {
  // Un Blob (foto) viaja crudo con su propio tipo; lo demás, como JSON.
  const isFile = body instanceof Blob
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': isFile ? body.type : 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: isFile ? body : JSON.stringify(body) } : {}),
  })

  if (response.status === 204) return null

  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok) throw new ApiError(response.status, data)
  return data
}
