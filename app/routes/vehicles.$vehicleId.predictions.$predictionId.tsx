import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageShell from '@/ui/layout/PageShell'
import DetailCard from '@/ui/DetailCard'
import DetailRow from '@/ui/DetailRow'
import ActionButton from '@/ui/ActionButton'
import PredictionCard from '@/features/predictions/PredictionCard'
import { getPredictionById, updatePrediction } from '@/features/predictions/api'
import type { Prediction } from '@/lib/types'
import { LoadingText } from '@/ui/AsyncStates'
import { backBtnStyle } from '@/styles/pageStyles'
import { formatEnumLabel } from '@/lib/formatters'
import { toConfidencePercent } from '@/lib/confidenceUtils'

export default function PredictionDetail() {
  const { vehicleId, predictionId } = useParams()
  const navigate = useNavigate()
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPredictionById(predictionId!)
      .then((res) => setPrediction(res.data as Prediction))
      .finally(() => setLoading(false))
  }, [predictionId])

  const handleDone = async () => {
    const completedAt = new Date().toISOString()
    await updatePrediction(predictionId!, { status: 'Completed', completedAt })
    setPrediction((prev) => prev ? { ...prev, status: 'Completed', completedAt } : prev)
  }

  const handleIgnore = async () => {
    await updatePrediction(predictionId!, { status: 'Ignored' })
    setPrediction((prev) => prev ? { ...prev, status: 'Ignored' } : prev)
  }

  if (loading) return <PageShell><LoadingText /></PageShell>
  if (!prediction) return <PageShell><div style={{ padding: 22, color: 'var(--text2)' }}>Prediction not found.</div></PageShell>

  const confidencePercent = toConfidencePercent(prediction.confidenceScore)

  return (
    <PageShell>
      <button onClick={() => navigate(`/vehicles/${vehicleId}/predictions`)} style={backBtnStyle}>
        {'<-'} Predictions
      </button>
      <div style={{ padding: '0 22px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Prediction Detail</div>
      </div>

      <PredictionCard
        prediction={prediction}
        onDone={prediction.status === 'Active' ? () => handleDone() : undefined}
        onIgnore={prediction.status === 'Active' ? () => handleIgnore() : undefined}
      />

      <div
        style={{
          margin: '0 22px 10px',
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 10,
          padding: '10px 12px',
        }}
      >
        <div style={{ fontSize: 12, marginBottom: 4 }}>What is confidence?</div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'var(--text2)',
            lineHeight: 1.5,
          }}
        >
          Confidence is not how soon the part will break. It is how certain the AI is about the predicted date.
          Treat predictions as reminders, not guarantees.
        </div>
      </div>

      <DetailCard title="Based On">
        <DetailRow label="Component" value={formatEnumLabel(prediction.componentType)} />
        <DetailRow
          label="Predicted date"
          value={new Date(prediction.predictedServiceDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        />
        <DetailRow label="Confidence" value={`${confidencePercent}%`} />
        <DetailRow label="Status" value={prediction.status} />
        {prediction.completedAt && (
          <DetailRow
            label="Completed"
            value={new Date(prediction.completedAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          />
        )}
      </DetailCard>

      <div style={{ height: 12 }} />
      <ActionButton variant="ghost" onClick={() => navigate(`/vehicles/${vehicleId}/components`)}>
        View Components {'->'}
      </ActionButton>
      <div style={{ height: 24 }} />
    </PageShell>
  )
}
