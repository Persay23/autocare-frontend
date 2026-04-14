import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import ActionButton from '@/ui/ActionButton'
import { createComponent } from '@/features/components/api'
import { useVehiclesStore } from '@/features/vehicles/vehiclesStore'
import { ErrorBanner } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import VehicleLabel from '@/ui/VehicleLabel'
import SmartFillButton from '@/ui/SmartFillButton'
import FormInput from '@/ui/FormInput'
import { COMPONENT_DEFAULTS } from '@/lib/componentDefaults'
import { COMPONENT_TYPES } from '@/lib/enums'
import { formatEnumLabel } from '@/lib/formatters'

export default function CreateComponent() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const invalidate = useVehiclesStore((s) => s.invalidate)
  const vehicle = useVehiclesStore((s) => s.vehicles.find((v) => v.vehicleId === parseInt(vehicleId!, 10)))

  const [form, setForm] = useState({
    componentType: '',
    vehicleComponentName: '',
    vehicleComponentBrand: '',
    installationDate: new Date().toISOString().split('T')[0],
    currentMileage: '',
    partNumber: '',
    expectedLifetimeKm: '',
    expectedLifetimeYears: '',
    warrantyKm: '',
    warrantyDate: '',
    nextServiceRecommendedKm: '',
    nextServiceRecommendedDate: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => {
      const next = { ...prev, [field]: e.target.value }
      // When component type changes, pre-fill lifetime from defaults (only if user hasn't typed)
      if (field === 'componentType') {
        const d = COMPONENT_DEFAULTS[e.target.value] ?? COMPONENT_DEFAULTS.Other
        if (!prev.expectedLifetimeKm) next.expectedLifetimeKm = String(d.lifetimeKm)
        if (!prev.expectedLifetimeYears) next.expectedLifetimeYears = String(d.lifetimeYears)
      }
      return next
    })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (vehicle?.mileage && form.currentMileage !== '' && parseInt(form.currentMileage, 10) > vehicle.mileage) {
      setError(`Km since install cannot exceed vehicle total of ${vehicle.mileage.toLocaleString()} km.`)
      return
    }

    setError(null)
    setLoading(true)
    const defaults = COMPONENT_DEFAULTS[form.componentType] ?? COMPONENT_DEFAULTS.Other
    try {
      await createComponent({
        vehicleId: Number.parseInt(vehicleId!, 10),
        componentType: form.componentType,
        vehicleComponentName: form.vehicleComponentName || null,
        vehicleComponentBrand: form.vehicleComponentBrand || null,
        state: 'Unknown',
        installationDate: new Date(form.installationDate).toISOString(),
        currentMileage: form.currentMileage ? Number.parseInt(form.currentMileage, 10) : 0,
        expectedLifetimeKm: form.expectedLifetimeKm ? parseInt(form.expectedLifetimeKm, 10) : defaults.lifetimeKm,
        expectedLifetimeYears: form.expectedLifetimeYears ? parseInt(form.expectedLifetimeYears, 10) : defaults.lifetimeYears,
        partNumber: form.partNumber || null,
        warrantyKm: form.warrantyKm ? parseInt(form.warrantyKm, 10) : null,
        warrantyDate: form.warrantyDate ? new Date(form.warrantyDate).toISOString() : null,
        nextServiceRecommendedKm: form.nextServiceRecommendedKm ? parseInt(form.nextServiceRecommendedKm, 10) : null,
        nextServiceRecommendedDate: form.nextServiceRecommendedDate ? new Date(form.nextServiceRecommendedDate).toISOString() : null,
        notes: form.notes || null,
      })
      invalidate()
      navigate(`/vehicles/${vehicleId}/components`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Failed to add component.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/components`)} style={backBtnStyle}>
        ← Components
      </button>
      <VehicleLabel vehicleId={vehicleId} />
      <div style={{ padding: '0 22px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Add Component</div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}

        <div style={{ padding: '0 22px' }}>
          <SmartFillButton />

          <FormInput label="Name" type="text" value={form.vehicleComponentName} onChange={set('vehicleComponentName')} placeholder="Front Axle, Brake Pads..." />
          <FormInput label="Brand (optional)" type="text" value={form.vehicleComponentBrand} onChange={set('vehicleComponentBrand')} placeholder="Brembo, Gates..." />

          <FormInput label="Component Type" value={form.componentType} onChange={set('componentType')} required>
            <option value="">Select a component type...</option>
            {COMPONENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatEnumLabel(t)}
              </option>
            ))}
          </FormInput>

          <FormInput label="Installation Date" type="date" value={form.installationDate} onChange={set('installationDate')} required />

          <FormInput
            label="Km used since install"
            type="number"
            value={form.currentMileage}
            onChange={set('currentMileage')}
            placeholder="0"
            min="0"
            max={vehicle?.mileage}
            hint={vehicle?.mileage ? `0 – ${vehicle.mileage.toLocaleString()} km` : 'km driven since this was installed'}
            error={
              vehicle?.mileage && form.currentMileage !== '' && parseInt(form.currentMileage, 10) > vehicle.mileage
                ? `Cannot exceed vehicle total of ${vehicle.mileage.toLocaleString()} km`
                : undefined
            }
          />

          <FormInput label="Part Number" type="text" value={form.partNumber} onChange={set('partNumber')} placeholder="e.g. P85 020" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Lifetime (km)" type="number" value={form.expectedLifetimeKm} onChange={set('expectedLifetimeKm')} placeholder="50000" min="0" />
            <FormInput label="Lifetime (years)" type="number" value={form.expectedLifetimeYears} onChange={set('expectedLifetimeYears')} placeholder="5" min="0" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Warranty (km)" type="number" value={form.warrantyKm} onChange={set('warrantyKm')} placeholder="20000" min="0" />
            <FormInput label="Warranty until" type="date" value={form.warrantyDate} onChange={set('warrantyDate')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <FormInput label="Next service (km)" type="number" value={form.nextServiceRecommendedKm} onChange={set('nextServiceRecommendedKm')} placeholder="50000" min="0" />
            <FormInput label="Next service date" type="date" value={form.nextServiceRecommendedDate} onChange={set('nextServiceRecommendedDate')} />
          </div>

          <FormInput label="Notes" type="text" value={form.notes} onChange={set('notes')} placeholder="Any notes..." />
        </div>

        <ActionButton type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Add Component'}
        </ActionButton>
        <div style={{ height: 8 }} />
        <ActionButton variant="secondary" onClick={() => navigate(`/vehicles/${vehicleId}/components`)}>
          Cancel
        </ActionButton>
        <div style={{ height: 24 }} />
      </form>
    </PageShell>
  )
}
