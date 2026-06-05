import api from '@/http/axios'
import type { AiDiagnosis } from '@/shared/types'

export const diagnoseVehicle = (vehicleId: string | number, symptom: string) =>
  api.post<AiDiagnosis>(`/ai/diagnose/${vehicleId}`, { symptom })

export const getDiagnosisHistory = (vehicleId: string | number) =>
  api.get<AiDiagnosis[]>(`/ai/diagnose/${vehicleId}`)
