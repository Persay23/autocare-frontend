import api from '@/http/axios'

export const getVehicleCostSummary = (vehicleId: number | string, from: string, to: string) =>
  api.get(`/vehicle/${vehicleId}/summary/costs`, { params: { from, to } })

export const getGeneralExpensesByVehicle = (vehicleId: number | string) =>
  api.get(`/generalexpense/vehicle/${vehicleId}`)

export const createGeneralExpense = (dto: Record<string, unknown>) =>
  api.post('/generalexpense', dto)

export const deleteGeneralExpense = (id: number | string) =>
  api.delete(`/generalexpense/${id}`)