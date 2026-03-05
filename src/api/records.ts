import api from './axios'

export const getRecordsByVehicle = (vehicleId: number | string, params?: Record<string, unknown>) =>
  api.get(`/maintenancerecord/vehicle/${vehicleId}`, { params })

export const getRecordById = (id: number | string) =>
  api.get(`/maintenancerecord/${id}`)

export const createRecord = (dto: Record<string, unknown>) =>
  api.post('/maintenancerecord', dto)

export const updateRecord = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/maintenancerecord/${id}`, dto)

export const deleteRecord = (id: number | string) =>
  api.delete(`/maintenancerecord/${id}`)

export const createRecordComponent = (dto: Record<string, unknown>) =>
  api.post('/maintenancerecordcomponent', dto)