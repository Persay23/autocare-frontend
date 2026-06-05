import { useState, useEffect } from 'react'

const QUERY = '(min-width: 1200px)'

export function useIsWideDesktop(): boolean {
  const [isWide, setIsWide] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isWide
}
