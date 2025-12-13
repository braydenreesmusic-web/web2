import { useEffect, useState } from 'react'

export default function PresenceIndicatorWrapper(props) {
  const [Comp, setComp] = useState(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import('./PresenceIndicator')
        if (cancelled) return
        setComp(() => mod.default || null)
      } catch (e) {
        console.warn('Failed to dynamically load PresenceIndicator', e)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!Comp) return null
  return <Comp {...props} />
}
