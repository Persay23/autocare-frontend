import api from '@/http/axios'

export const getFuelByVehicle = (vehicleId: number | string, params?: Record<string, unknown>) =>
  api.get(`/fuelentry/vehicle/${vehicleId}`, { params })

export const getFuelById = (id: number | string) =>
  api.get(`/fuelentry/${id}`)

export const createFuelEntry = (dto: Record<string, unknown>) =>
  api.post('/fuelentry', dto)

export const updateFuelEntry = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/fuelentry/${id}`, dto)

export const deleteFuelEntry = (id: number | string) =>
  api.delete(`/fuelentry/${id}`)