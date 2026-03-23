import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PredictionCard from '@/features/predictions/PredictionCard'
import { getPredictionsByVehicle, updatePrediction } from '@/features/predictions/api'
import { LoadingState, ErrorState, EmptyState } from '@/ui/AsyncStates'
import { PREDICTION_STATUS_ORDER } from '@/lib/enums'

import type { Prediction } from '@/lib/types'

export default function VehiclePredictions() {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPredictionsByVehicle(vehicleId!)
      .then((res) => setPredictions(res.data))
      .catch(() => setError('Failed to load predictions.'))
      .finally(() => setLoading(false))
  }, [vehicleId])

  const handleIgnore = async (prediction: Prediction) => {
    try {
      await updatePrediction(prediction.predictionId, { status: 'Ignored' })
      setPredictions((prev) =>
        prev.map((p) => (p.predictionId === prediction.predictionId ? { ...p, status: 'Ignored' } : p))
      )
    } catch {
      // no-op
    }
  }

  const handleDone = async (prediction: Prediction) => {
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

  const order = PREDICTION_STATUS_ORDER as Record<string, number>
  const sorted = [...predictions].sort(
    (a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0)
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
          onDone={prediction.status === 'Active' ? handleDone : undefined}
          onIgnore={prediction.status === 'Active' ? handleIgnore : undefined}
          onClick={() => navigate(`/vehicles/${vehicleId}/predictions/${prediction.predictionId}`)}
        />
      ))}
    </div>
  )
}
