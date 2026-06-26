import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://localhost:7235/api',
  withCredentials: true, // sends the auth cookie with every request
})

// If the server returns 401, the user's session has expired.
// Redirect them to login automatically.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 401 && !window.location.pathname.includes('/login')) {
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