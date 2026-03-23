import api from '@/http/axios'

export const getVehicles = () =>
  api.get('/vehicle')

export const getVehicleById = (id: number | string) =>
  api.get(`/vehicle/${id}`)

export const createVehicle = (dto: Record<string, unknown>) =>
  api.post('/vehicle', dto)

export const updateVehicle = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/vehicle/${id}`, dto)

export const deleteVehicle = (id: number | string) =>
  api.delete(`/vehicle/${id}`)
