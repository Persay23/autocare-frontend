import api from '@/http/axios'

// Cross-vehicle timeline for the current user
export const getUserTimeline = () =>
  api.get('/users/timeline')

// Per-vehicle timeline
export const getVehicleTimeline = (vehicleId: number | string) =>
  api.get(`/vehicle/${vehicleId}/summary/timeline`)