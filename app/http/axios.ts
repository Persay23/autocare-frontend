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

// Matches the AI endpoints that consume quota (POST only — the GET diagnose history doesn't).
const AI_CONSUME = /\/ai\/(parse|predict|suggest|diagnose)\b/

const isAiConsume = (cfg?: { method?: string; url?: string }): boolean =>
  cfg?.method?.toLowerCase() === 'post' && !!cfg.url && AI_CONSUME.test(cfg.url)

// Notify the quota UI after any AI action so it can refresh the remaining count.
const signalAiUsage = (ok: boolean, status?: number) =>
  window.dispatchEvent(new CustomEvent('ai-usage', { detail: { ok, status } }))

const fireErrorToast = (message: string) =>
  window.dispatchEvent(new CustomEvent('error-toast', { detail: { message } }))

api.interceptors.response.use(
  (response) => {
    if (isAiConsume(response.config)) signalAiUsage(true)
    return response
  },
  (error: unknown) => {
    const e = error as {
      response?: { status?: number; data?: { message?: string } }
      config?: { method?: string; url?: string }
    }
    const status = e.response?.status

    // AI calls: hand off entirely to AiQuotaSnackbar via the ai-usage event.
    if (isAiConsume(e.config)) {
      signalAiUsage(false, status)
      return Promise.reject(error)
    }

    // 401: drop the token and redirect — no toast needed.
    if (status === 401) {
      if (!window.location.pathname.includes('/login')) {
        clearToken()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // 404: silent — the calling UI handles the empty / not-found state itself.
    if (status === 404) return Promise.reject(error)

    // Everything else gets a toast. For 400/409 the backend sends a specific message;
    // for 500/429/network errors we use a safe generic string.
    const serverMessage = e.response?.data?.message

    const message = !e.response
      ? 'Cannot reach the server — check your connection.'
      : status === 500
      ? 'Server error — try again in a moment.'
      : status === 429
      ? 'Too many requests — try again in a minute.'
      : status === 403
      ? "You don't have permission to do this."
      : serverMessage ?? 'Something went wrong.'

    fireErrorToast(message)
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