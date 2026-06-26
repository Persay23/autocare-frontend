import api from '@/http/axios'
import { User } from '@/shared/types'

// Check who is currently logged in (called on every app load)
export const getMe = () => api.get<User>('/users/me')

// Sends credentials, server sets the auth cookie in the response
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const logout = () => api.post('/auth/logout')

export const register = (dto: Record<string, unknown>) => api.post('/users', dto)