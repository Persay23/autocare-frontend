import api from '@/http/axios'
import type { AiDiagnosis } from '@/shared/types'

export const diagnoseVehicle = (vehicleId: string | number, symptom: string) =>
  api.post<AiDiagnosis>(`/ai/diagnose/${vehicleId}`, { symptom })

export const getDiagnosisHistory = (vehicleId: string | number) =>
  api.get<AiDiagnosis[]>(`/ai/diagnose/${vehicleId}`)

export type ParseTarget = 'record' | 'fuel' | 'component' | 'expense' | 'vehicle'

// Sends a document photo to the AI for field extraction, scoped to a target form.
// Nothing is saved — the result pre-fills the form for the user to review and submit.
export const parseDocument = <T,>(target: ParseTarget, image: File) => {
  const data = new FormData()
  data.append('image', image)
  return api.post<T>(`/ai/parse/${target}`, data)
}

// Stores a receipt image and returns its URL. Call only on form submit, so a
// discarded form never leaves an orphaned file.
export const uploadReceiptImage = (image: File) => {
  const data = new FormData()
  data.append('image', image)
  return api.post<{ url: string }>('/uploads/receipt', data)
}
