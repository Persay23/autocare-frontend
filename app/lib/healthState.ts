export function healthPctToState(pct: number): string {
  if (pct >= 75) return 'Perfect'
  if (pct >= 51) return 'Good'
  if (pct >= 31) return 'Normal'
  if (pct >= 16) return 'Repair'
  return 'Critical'
}

export function stateColor(state: string): string {
  switch (state) {
    case 'Perfect':  return 'var(--accent4)'
    case 'Good':     return 'var(--green)'
    case 'Normal':   return 'var(--yellow)'
    case 'Repair':   return 'var(--orange)'
    case 'Critical': return 'var(--red)'
    default:         return 'var(--text2)'
  }
}
