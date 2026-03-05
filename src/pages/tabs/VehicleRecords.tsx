import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import RecordItem from '../../components/records/RecordItem'
import { getRecordsByVehicle } from '../../api/records'
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/AsyncStates'

export default function VehicleRecords({ vehicleId }) {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getRecordsByVehicle(vehicleId)
      .then((res) => setRecords(res.data))
      .catch(() => setError('Failed to load records.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 22px 12px',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Records</div>
        <button
          onClick={() => navigate(`/vehicles/${vehicleId}/records/new`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.3)',
            color: 'var(--accent)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && records.length === 0 && (
        <EmptyState icon="🔧" message="No maintenance records yet" />
      )}

      {!loading && !error && records.map((record) => (
        <RecordItem
          key={record.maintenanceRecordId}
          record={record}
          onClick={() => navigate(`/vehicles/${vehicleId}/records/${record.maintenanceRecordId}`)}
        />
      ))}
    </div>
  )
}
