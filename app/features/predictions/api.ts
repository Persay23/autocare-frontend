import api from '@/http/axios'

export const getPredictionsByVehicle = (vehicleId: number | string) =>
  api.get(`/prediction/vehicle/${vehicleId}`)

export const getPredictionById = (id: number | string) =>
  api.get(`/prediction/${id}`)

export const createPrediction = (dto: Record<string, unknown>) =>
  api.post('/prediction', dto)

export const updatePrediction = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/prediction/${id}`, dto)

export const deletePrediction = (id: number | string) =>
  api.delete(`/prediction/${id}`)