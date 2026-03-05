import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PredictionCard from '../../components/predictions/PredictionCard'
import { getPredictionsByVehicle, updatePrediction } from '../../api/predictions'
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/AsyncStates'
import { PREDICTION_STATUS_ORDER } from '../../constants/enums'

export default function VehiclePredictions({ vehicleId }) {
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPredictionsByVehicle(vehicleId)
      .then((res) => setPredictions(res.data))
      .catch(() => setError('Failed to load predictions.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const handleIgnore = async (prediction) => {
    try {
      await updatePrediction(prediction.predictionId, { status: 'Ignored' })
      setPredictions((prev) =>
        prev.map((p) => (p.predictionId === prediction.predictionId ? { ...p, status: 'Ignored' } : p))
      )
    } catch {
      // no-op
    }
  }

  const handleDone = async (prediction) => {
    const completedAt = new Date().toISOString()

    try {
      await updatePrediction(prediction.predictionId, { status: 'Completed', completedAt })
      setPredictions((prev) =>
        prev.map((p) =>
          p.predictionId === prediction.predictionId ? { ...p, status: 'Completed', completedAt } : p
        )
      )
    } catch {
      // no-op
    }
  }

  const sorted = [...predictions].sort(
    (a, b) => (PREDICTION_STATUS_ORDER[a.status] ?? 0) - (PREDICTION_STATUS_ORDER[b.status] ?? 0)
  )

  return (
    <div>
      <div style={{ padding: '16px 22px 8px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Predictions</div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
          }}
        >
          AI-estimated service dates based on history
        </div>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && predictions.length === 0 && (
        <EmptyState icon="🤖" message="No predictions yet - add components and records first" />
      )}

      {!loading && !error && sorted.map((prediction) => (
        <PredictionCard
          key={prediction.predictionId}
          prediction={prediction}
          onDone={prediction.status === 'Active' ? handleDone : null}
          onIgnore={prediction.status === 'Active' ? handleIgnore : null}
          onClick={() => navigate(`/vehicles/${vehicleId}/predictions/${prediction.predictionId}`)}
        />
      ))}
    </div>
  )
}
