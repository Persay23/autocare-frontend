import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#6c63ff' },
    secondary:  { main: '#4f8fff' },
    error:      { main: '#f87171' },
    warning:    { main: '#fb923c' },
    success:    { main: '#34d399' },
    background: { default: '#07080f', paper: '#0d0f1c' },
    text:       { primary: '#e8eaf6', secondary: '#7b80a8' },
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
