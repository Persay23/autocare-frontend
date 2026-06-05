import { create } from 'zustand'

export interface NotificationPrefs {
  componentHealth:   boolean
  serviceReminders:  boolean
  recurringExpenses: boolean
  aiInsights:        boolean
  diagnosisFollowup: boolean
  alertBeforeLimit:  boolean
}

const STORAGE_KEY = 'autocare_notification_prefs'

const DEFAULTS: NotificationPrefs = {
  componentHealth:   true,
  serviceReminders:  true,
  recurringExpenses: true,
  aiInsights:        false,
  diagnosisFollowup: false,
  alertBeforeLimit:  true,
}

function load(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

interface NotificationsStore {
  prefs:  NotificationPrefs
  toggle: (key: keyof NotificationPrefs) => void
  setAll: (value: boolean) => void
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  prefs: load(),
  toggle: (key) => set((s) => {
    const prefs = { ...s.prefs, [key]: !s.prefs[key] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    return { prefs }
  }),
  setAll: (value) => set((s) => {
    const prefs = Object.fromEntries(Object.keys(s.prefs).map((k) => [k, value])) as NotificationPrefs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    return { prefs }
  }),
}))
