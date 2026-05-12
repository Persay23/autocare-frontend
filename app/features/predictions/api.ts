import api from '@/http/axios'

export const getPredictionsByVehicle = (vehicleId: number | string) =>
  api.get(`/prediction/vehicle/${vehicleId}`)

export const getPredictionById = (id: number | string) =>
  api.get(`/prediction/${id}`)

export const updatePrediction = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/prediction/${id}`, dto)

export const deletePrediction = (id: number | string) =>
  api.delete(`/prediction/${id}`)

/** Triggers background AI suggestion generation for a vehicle. Fire-and-forget from the UI. */
export const triggerAiSuggest = (vehicleId: number | string) =>
  api.post(`/ai/suggest/${vehicleId}`)