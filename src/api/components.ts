import api from './axios'

export const getComponentsByVehicle = (vehicleId: number | string) =>
  api.get(`/vehiclecomponent/vehicle/${vehicleId}`)

export const getComponentHealth = (vehicleId: number | string) =>
  api.get(`/vehiclecomponent/vehicle/${vehicleId}/health`)

export const getComponentById = (id: number | string) =>
  api.get(`/vehiclecomponent/${id}`)

export const createComponent = (dto: Record<string, unknown>) =>
  api.post('/vehiclecomponent', dto)

export const updateComponent = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/vehiclecomponent/${id}`, dto)

export const deleteComponent = (id: number | string) =>
  api.delete(`/vehiclecomponent/${id}`)

export const getComponentHistory = (componentId: number | string) =>
  api.get(`/vehiclecomponent/${componentId}/history`)