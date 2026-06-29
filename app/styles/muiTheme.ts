import { createTheme } from '@mui/material/styles'

// Palette values mirror the CSS variables in global.css so MUI surfaces
// (dialogs, selects, menus, the snackbar, CssBaseline) match the custom
// inline-styled UI in both themes.
const palettes = {
  dark: {
    bg: '#0e0f14', paper: '#181a22',
    text: '#f4f5f7', text2: '#8990a0',
    primary: '#6c63ff',
    success: '#34d399', warning: '#fb923c', error: '#f87171',
  },
  light: {
    bg: '#f5f6f8', paper: '#ffffff',
    text: '#14161b', text2: '#6b7280',
    primary: '#5a55e0',
    success: '#059669', warning: '#ea580c', error: '#dc2626',
  },
} as const

export function createAppTheme(mode: 'dark' | 'light') {
  const c = palettes[mode]
  return createTheme({
    palette: {
      mode,
      primary:    { main: c.primary },
      secondary:  { main: '#4f8fff' },
      success:    { main: c.success },
      warning:    { main: c.warning },
      error:      { main: c.error },
      background: { default: c.bg, paper: c.paper },
      text:       { primary: c.text, secondary: c.text2 },
    },
    typography: {
      fontFamily: "'Outfit', 'JetBrains Mono', sans-serif",
    },
    components: {
      MuiSvgIcon: {
        defaultProps: { fontSize: 'small' },
      },
    },
  })
}

// Backwards-compatible default (dark) for any static importer.
export const theme = createAppTheme('dark')
