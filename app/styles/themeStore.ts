import { create } from 'zustand'
import { getTheme, setTheme, type Theme } from '@/styles/theme'

interface ThemeStore {
  mode: Theme
  toggle: () => void
  setMode: (m: Theme) => void
}

// Single source of truth for the active theme. `setTheme` keeps the
// `data-theme` attribute and localStorage in sync so the CSS-variable UI
// flips, while subscribers (the MUI ThemeProvider in main.tsx) re-render
// so MUI surfaces flip too.
export const useThemeStore = create<ThemeStore>((set) => ({
  mode: getTheme(),
  toggle: () => set((s) => {
    const next: Theme = s.mode === 'dark' ? 'light' : 'dark'
    setTheme(next)
    return { mode: next }
  }),
  setMode: (m) => { setTheme(m); set({ mode: m }) },
}))
