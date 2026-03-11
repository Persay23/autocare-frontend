import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import ActionButton from '../components/shared/ActionButton'
import { getRecordById, updateRecord, deleteRecord } from '../api/records'
import { LoadingText, ErrorBanner } from '../components/shared/AsyncStates'
import { backBtnStyle, labelStyle } from '../styles/pageStyles'
import FormInput from '../components/shared/FormInput'
import { inputStyle, onFocus, onBlur } from '../components/shared/formStyles'
import { SERVICE_TYPES } from '../constants/enums'
import { formatEnumLabel } from '../utils/formatters'

export default function EditRecord() {
  const { vehicleId, recordId } = useParams()
  const navigate = useNavigate()

  interface RecordForm { serviceName: string; serviceType: string; serviceDate: string; cost: string | number; description: string }

  const [form, setForm] = useState<RecordForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRecordById(recordId!).then((res) => {
      const r = res.data
      setForm({
        serviceName: r.serviceName ?? '',
        serviceType: r.serviceType ?? '',
        serviceDate: r.serviceDate ? r.serviceDate.split('T')[0] : '',
        cost: r.cost ?? '',
        description: r.description ?? '',
      })
    }).finally(() => setLoading(false))
  }, [recordId])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form) return
    setError(null)
    setSaving(true)
    try {
      await updateRecord(recordId!, {
        serviceName: form.serviceName || null,
        serviceType: form.serviceType,
        serviceDate: new Date(form.serviceDate).toISOString(),
        cost: form.cost ? parseFloat(String(form.cost)) : 0,
        description: form.description || null,
      })
      navigate(`/vehicles/${vehicleId}/records/${recordId}`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to update record.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this record?')) return
    await deleteRecord(recordId!)
    navigate(`/vehicles/${vehicleId}/records`)
  }

  if (loading || !form) return <PageShell><LoadingText /></PageShell>

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}`)} style={backBtnStyle}>
        ← Record
      </button>
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Edit Record</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        

        <div style={{ padding: '0 22px' }}>

          
        <FormInput
          label="Service Name"
          type="text"
          value={form.serviceName}
          onChange={set('serviceName')}
          placeholder="e.g., Oil Change"
        />

          <FormInput label="Service Type" value={form.serviceType} onChange={set('serviceType')}>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEnumLabel(t)}
              </option>
            ))}
          </FormInput>

          <FormInput label="Service Date" type="date" value={form.serviceDate} onChange={set('serviceDate')} required />
          <FormInput label="Cost (zł)" type="number" value={form.cost} onChange={set('cost')} placeholder="320.00" min="0" />

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        </div>

        <ActionButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/records/${recordId}`)}>
          Cancel
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="danger" onClick={handleDelete}>
          Delete Record
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
