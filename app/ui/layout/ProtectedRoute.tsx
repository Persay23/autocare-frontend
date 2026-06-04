import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import BottomNav from '@/ui/layout/BottomNav'
import { useIsDesktop } from '@/lib/useIsDesktop'
import DrivingSurveySheet from '@/ui/DrivingSurveySheet'
import { markSkipped, hasSkipped, clearSkipped } from '@/lib/drivingProfile'
import type { DrivingProfile } from '@/lib/drivingProfile'
import { useDrivingProfileStore } from '@/features/drivingProfile/drivingProfileStore'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const [showSurvey, setShowSurvey] = useState(false)

  const { fetch: fetchProfile, save: saveProfile, exists: profileExists, loadedFor } = useDrivingProfileStore()

  // Trigger fetch — store deduplicates concurrent/duplicate calls
  const isDesktop = useIsDesktop()

  useEffect(() => {
    if (!user || hasSkipped(user.id)) return
    fetchProfile(user.id)
  }, [user?.id, fetchProfile])

  // Show survey once the fetch resolves and profile doesn't exist
  useEffect(() => {
    if (!user || loadedFor !== user.id) return
    if (!profileExists && !hasSkipped(user.id)) setShowSurvey(true)
  }, [loadedFor, profileExists, user?.id])

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

  const handleComplete = async (profile: DrivingProfile) => {
    try {
      await saveProfile(user.id, profile, false)
      clearSkipped(user.id)
    } catch {
      // proceed regardless
    }
    setShowSurvey(false)
  }

  const handleSkip = () => {
    markSkipped(user.id)
    setShowSurvey(false)
  }

  return (
    <>
      <Outlet />
      {!isDesktop && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 400,
          zIndex: 100,
        }}>
          <BottomNav />
        </div>
      )}
      {showSurvey && (
        <DrivingSurveySheet
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </>
  )
}
