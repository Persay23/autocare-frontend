import axios from 'axios'
import { getToken, clearToken } from '@/features/auth/token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost:7235/api',
})

// Attach the JWT as a bearer header on every request (replaces cookie auth).
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A 401 means the token is missing/expired/invalid — drop it and send the user to login.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 401 && !window.location.pathname.includes('/login')) {
      clearToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Resolves a server-relative asset path (e.g. "/uploads/receipts/x.jpg") against the
// API origin, since static files are served by the backend, not the frontend dev server.
// Absolute URLs are returned unchanged.
export const assetUrl = (path?: string | null): string => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const base = (import.meta.env.VITE_API_URL ?? 'https://localhost:7235/api').replace(/\/api\/?$/, '')
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`
}

export default api