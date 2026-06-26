import api from '@/http/axios'

export const getVehicles = () =>
  api.get('/vehicle')

export const getVehicleById = (id: number | string) =>
  api.get(`/vehicle/${id}`)

export const createVehicle = (dto: Record<string, unknown>) =>
  api.post('/vehicle', dto)

export const updateVehicle = (id: number | string, dto: Record<string, unknown>) =>
  api.patch(`/vehicle/${id}`, dto)

export const deleteVehicle = (id: number | string) =>
  api.delete(`/vehicle/${id}`)

export type ExportFormat = 'md' | 'pdf'

// Downloads the vehicle's full service history as a Markdown or PDF file.
export const exportVehicle = async (id: number | string, format: ExportFormat) => {
  const res = await api.get(`/vehicle/${id}/export`, {
    params: { format },
    responseType: 'blob',
  })

  const disposition = (res.headers as Record<string, string>)['content-disposition'] ?? ''
  const match = /filename="?([^"]+)"?/.exec(disposition)
  const filename = match?.[1] ?? `vehicle-${id}-history.${format}`

  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
