import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import DrivingSurveySheet from '@/ui/DrivingSurveySheet'
import { loadProfile, saveProfile, markSkipped, hasSkipped } from '@/lib/drivingProfile'
import type { DrivingProfile } from '@/lib/drivingProfile'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  // Lazy initial state — only reads localStorage once user is known
  const [showSurvey, setShowSurvey] = useState(() => {
    if (!user) return false
    return !loadProfile(user.id) && !hasSkipped(user.id)
  })

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--text3)',
        letterSpacing: '0.1em',
      }}>
        LOADING...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleComplete = (profile: DrivingProfile) => {
    saveProfile(user.id, profile)
    setShowSurvey(false)
  }

  const handleSkip = () => {
    markSkipped(user.id)
    setShowSurvey(false)
  }

  return (
    <>
      <Outlet />
      {showSurvey && (
        <DrivingSurveySheet
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </>
  )
}
