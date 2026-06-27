import api from '@/http/axios'
import { User } from '@/shared/types'

export interface LoginResponse {
  token: string
  expiresAt: string
}

// Check who is currently logged in (called on every app load)
export const getMe = () => api.get<User>('/users/me')

// Validates credentials and returns a JWT for the client to store and send as a bearer token.
export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { email, password })

export const logout = () => api.post('/auth/logout')

export const register = (dto: Record<string, unknown>) => api.post('/auth/register', dto)

// Email confirmation
export const confirmEmail = (userId: string, token: string) =>
  api.get('/auth/confirm-email', { params: { userId, token } })

export const resendConfirmation = (email: string) =>
  api.post('/auth/resend-confirmation', { email })