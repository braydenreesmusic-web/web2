import { useEffect, useMemo, useState, useRef } from 'react'

/*
  Countdown component

  Props:
    - target: string | Date | number (ISO string, Date or epoch millis) - REQUIRED
    - title: string (optional) - shown in notifications
    - milestones: optional array of seconds thresholds (e.g. [604800,259200,172800,86400,0])

  Behavior:
    - shows large remaining time and a list of milestone badges
    - requests Notification permission when user clicks "Enable notifications"
    - triggers in-page browser Notification for each milestone once (tracked in localStorage)

  Notes:
    - Browser notifications only work while page is open (or if the app has a service worker + push setup).
    - For persistent scheduled notifications (device-level) you should use a server push or PWA + service worker.
*/

function secs(n) { return Math.round(n) }

function formatRemaining(ms) {
  if (ms <= 0) return 'Today!'
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (days > 0) return `${days}d ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
  return `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
}

function defaultMilestones() {
  // seconds: 7 days, 3 days, 2 days, 1 day, today (0)
  return [7*24*3600, 3*24*3600, 2*24*3600, 1*24*3600, 0]
}

export default function Countdown({ target, title = 'Next meetup', milestones }) {
  const targetDate = useMemo(() => {
    if (!target) return null
    if (target instanceof Date) return target
    if (typeof target === 'number') return new Date(target)
    try { return new Date(target) } catch (e) { return null }
  }, [target])

  const msUntil = (targetDate ? targetDate.getTime() - Date.now() : 0)
  const [nowMs, setNowMs] = useState(Date.now())
  const [permission, setPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'default'))
  const notifiedRef = useRef(new Set())

  const msRemaining = targetDate ? Math.max(0, targetDate.getTime() - nowMs) : 0

  const marks = milestones && milestones.length ? milestones : defaultMilestones()

  // localStorage key for this target date so we don't re-notify between sessions
  const storageKey = targetDate ? `countdown-notified:${targetDate.toISOString()}` : null

  useEffect(() => {
    // load already-notified set from localStorage
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const arr = JSON.parse(raw)
        notifiedRef.current = new Set(arr || [])
      }
    } catch (e) {}
  }, [storageKey])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!targetDate) return
    // Check milestones each second and notify once when crossed
    for (const m of marks) {
      const whenMs = m * 1000
      if (msRemaining <= whenMs) {
        if (!notifiedRef.current.has(String(m))) {
          // notify
          try {
            if (permission === 'granted') {
              const label = milestoneLabel(m)
              new Notification(title, {
                body: label,
                badge: '/logo-192.png'
              })
            }
          } catch (e) {
            // ignore
          }
          notifiedRef.current.add(String(m))
          try { localStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedRef.current))) } catch (e) {}
        }
      }
    }
  }, [msRemaining, marks, permission, storageKey, targetDate, title])

  function requestPermission() {
    if (!('Notification' in window)) return
    Notification.requestPermission().then(p => setPermission(p))
  }

  function milestoneLabel(seconds) {
    if (seconds === 0) return 'Today! 🎉'
    const days = Math.floor(seconds / 86400)
    if (days >= 7) return `${Math.round(days / 7)} week${Math.round(days/7) === 1 ? '' : 's'} away`
    if (days >= 1) return `${days} day${days===1?'':'s'} away`
    const hours = Math.floor(seconds / 3600)
    if (hours >= 1) return `${hours} hour${hours===1?'':'s'} away`
    const mins = Math.floor(seconds / 60)
    if (mins >= 1) return `${mins} minute${mins===1?'':'s'} away`
    return 'Soon'
  }

  if (!targetDate) {
    return <div className="glass-card p-4">No target date supplied.</div>
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{title}</div>
          <div className="text-2xl font-semibold mt-1">{formatRemaining(msRemaining)}</div>
          <div className="text-xs text-gray-400 mt-1">{targetDate.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="text-sm muted">Notifications</div>
          <div className="mt-2">
            {permission === 'granted' ? (
              <span className="text-sm text-green-600">Enabled</span>
            ) : (
              <button onClick={requestPermission} className="btn">Enable</button>
            )}
          </div>
          <div className="mt-2">
            <button
              onClick={() => {
                // test notification
                try {
                  if (Notification.permission === 'granted') new Notification(title, { body: 'Test notification' })
                  else alert('Notifications not allowed — click Enable first')
                } catch (e) { alert('Notification failed: ' + e.message) }
              }}
              className="btn-ghost"
            >Test</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {marks.map(m => {
          const passed = msRemaining <= m*1000
          return (
            <div key={m} className={`p-2 rounded-md text-center ${passed ? 'bg-gradient-to-r from-accent-700 to-accent-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <div className="text-sm font-semibold">{milestoneLabel(m)}</div>
              <div className="text-xs mt-1">{passed ? 'Reached' : 'Upcoming'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
