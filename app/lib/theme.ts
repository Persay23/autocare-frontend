export type Theme = 'dark' | 'light'

export function getTheme(): Theme {
  return (localStorage.getItem('theme') as Theme) ?? 'dark'
}

export function setTheme(t: Theme) {
  localStorage.setItem('theme', t)
  document.documentElement.dataset.theme = t
}

export function initTheme() {
  document.documentElement.dataset.theme = getTheme()
}
