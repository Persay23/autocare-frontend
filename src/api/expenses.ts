import api from './axios'

export const getVehicleCostSummary = (vehicleId: number | string, from: string, to: string) =>
  api.get(`/vehicle/${vehicleId}/summary/costs`, { params: { from, to } })