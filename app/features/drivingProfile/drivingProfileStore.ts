import { create } from 'zustand'
import { getDrivingProfile, createDrivingProfile, updateDrivingProfile } from './api'
import type { DrivingProfile } from '@/shared/drivingProfile'

interface DrivingProfileState {
  profile:   DrivingProfile | null
  exists:    boolean
  loading:   boolean
  loadedFor: string | null
  fetch: (userId: string) => Promise<void>
  save:  (userId: string, data: DrivingProfile, isUpdate: boolean) => Promise<void>
}

export const useDrivingProfileStore = create<DrivingProfileState>((set, get) => ({
  profile:   null,
  exists:    false,
  loading:   false,
  loadedFor: null,

  fetch: async (userId) => {
    if (get().loadedFor === userId) return  // already loaded for this user
    if (get().loading) return               // fetch already in progress
    set({ loading: true })
    try {
      const res = await getDrivingProfile(userId)
      set({ profile: res.data, exists: true, loadedFor: userId, loading: false })
    } catch {
      set({ profile: null, exists: false, loadedFor: userId, loading: false })
    }
  },

  save: async (userId, data, isUpdate) => {
    if (isUpdate) {
      await updateDrivingProfile(userId, data)
    } else {
      await createDrivingProfile(userId, data)
    }
    set({ profile: data, exists: true })
  },
}))
