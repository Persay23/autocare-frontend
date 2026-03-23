import api from '@/http/axios'

export const updateUserProfile = (userId: string, dto: Record<string, unknown>) =>
  api.patch(`/users/${userId}`, dto)

export const changeUserPassword = (userId: string, dto: Record<string, unknown>) =>
  api.post(`/users/${userId}/change-password`, dto)
