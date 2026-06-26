// Persisted JWT. localStorage survives reloads and PWA relaunches; the token is sent as a
// bearer header on every request (see http/axios.ts), so no cookies are involved.
const TOKEN_KEY = 'auth_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)

export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)
