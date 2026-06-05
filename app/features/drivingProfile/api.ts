import api from '@/http/axios'
import type { DrivingProfile } from '@/features/drivingProfile/utils'

export const getDrivingProfile = (userId: string) =>
  api.get<DrivingProfile>(`/userdrivingprofile/${userId}`)

export const createDrivingProfile = (userId: string, data: DrivingProfile) =>
  api.post('/userdrivingprofile', { userId, ...data })

export const updateDrivingProfile = (userId: string, data: Partial<DrivingProfile>) =>
  api.patch(`/userdrivingprofile/${userId}`, data)
