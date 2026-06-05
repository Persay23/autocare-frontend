import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import BottomNav from '@/ui/layout/BottomNav'
import SideNav from '@/ui/layout/SideNav'
import RightPanel from '@/ui/layout/RightPanel'
import { useIsDesktop } from '@/ui/hooks/useIsDesktop'
import DrivingSurveySheet from '@/ui/DrivingSurveySheet'
import DiagnoseModal from '@/features/vehicles/DiagnoseModal'
import GlobalExpenseModal from '@/features/expenses/GlobalExpenseModal'
import GlobalRecordModal from '@/features/records/GlobalRecordModal'
import GlobalFuelModal from '@/features/fuel/GlobalFuelModal'
import { useDiagnoseModal } from '@/features/vehicles/diagnoseModalStore'
import { useExpenseModal } from '@/features/expenses/expenseModalStore'
import { useRecordModal } from '@/features/records/recordModalStore'
import { useFuelModal } from '@/features/fuel/fuelModalStore'
import { markSkipped, hasSkipped, clearSkipped } from '@/features/drivingProfile/utils'
import type { DrivingProfile } from '@/features/drivingProfile/utils'
import { useDrivingProfileStore } from '@/features/drivingProfile/drivingProfileStore'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const [showSurvey, setShowSurvey] = useState(false)

  const { fetch: fetchProfile, save: saveProfile, exists: profileExists, loadedFor } = useDrivingProfileStore()

  // Trigger fetch — store deduplicates concurrent/duplicate calls
  const isDesktop      = useIsDesktop()
  const diagnoseOpen = useDiagnoseModal((s) => s.isOpen)
  const expenseOpen  = useExpenseModal((s) => s.isOpen)
  const recordOpen   = useRecordModal((s) => s.isOpen)
  const fuelOpen     = useFuelModal((s) => s.isOpen)

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
      {isDesktop && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: 240, height: '100vh', zIndex: 100 }}>
          <SideNav />
        </div>
      )}
      {isDesktop && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: 260, height: '100vh', zIndex: 50 }}>
          <RightPanel />
        </div>
      )}
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
      {diagnoseOpen && <DiagnoseModal />}
      {expenseOpen  && <GlobalExpenseModal />}
      {recordOpen   && <GlobalRecordModal />}
      {fuelOpen     && <GlobalFuelModal />}
      {showSurvey && (
        <DrivingSurveySheet
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </>
  )
}
