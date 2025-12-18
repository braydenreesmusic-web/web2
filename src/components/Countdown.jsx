import { useEffect, useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'

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

export default function Countdown({ target, title = 'Next meetup', milestones, initialCustomMilestones = null, onMilestonesChange = null, compact = false, calendarRoute = null }) {
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

  // custom milestones persisted per target
  const customKey = targetDate ? `countdown-custom-milestones:${targetDate.toISOString()}` : null
  const [customInputDays, setCustomInputDays] = useState('')
  const [customMilestones, setCustomMilestones] = useState(() => {
    // If an initial list is provided via props, prefer that.
    if (Array.isArray(initialCustomMilestones)) return initialCustomMilestones.slice()
    if (!customKey) return []
    try {
      const raw = localStorage.getItem(customKey)
      if (!raw) return []
      return JSON.parse(raw)
    } catch (e) { return [] }
  })

  const mergedMarks = useMemo(() => {
    const base = (milestones && milestones.length) ? milestones.slice() : defaultMilestones()
    const combined = Array.from(new Set([...(base || []), ...(customMilestones || [])]))
    return combined.sort((a,b) => b - a)
  }, [milestones, customMilestones])

  // helper: days until (ceil to next whole day), 0 => today
  const daysUntil = useMemo(() => {
    if (!targetDate) return null
    const ms = Math.max(0, targetDate.getTime() - Date.now())
    return Math.ceil(ms / (24 * 3600 * 1000))
  }, [targetDate, nowMs])

  // Convert mergedMarks (seconds) to days for banner matching
  const mergedDays = useMemo(() => {
    return Array.from(new Set((mergedMarks || []).map(s => Math.round(s / 86400)))).sort((a,b)=>a-b)
  }, [mergedMarks])

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
    // Inform parent about custom milestone changes so callers can persist them.
    try {
      if (typeof onMilestonesChange === 'function') onMilestonesChange(customMilestones.slice())
    } catch (e) {}
  }, [customMilestones, onMilestonesChange])

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
    for (const m of mergedMarks) {
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
  }, [msRemaining, mergedMarks, permission, storageKey, targetDate, title])

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

  // Compact/banner mode: only show a simple milestone banner when today matches a milestone
  if (compact) {
    const days = daysUntil
    const dayMatches = mergedDays.includes(days)
    const isToday = days === 0
    const label = isToday ? 'Today! 🎉' : `${days} day${days===1?'':'s'}`

    // snooze/dismiss persistence per-target
    const snoozeKey = targetDate ? `countdown-snooze:${targetDate.toISOString()}` : null
    const [snoozedUntil, setSnoozedUntil] = useState(() => {
      if (!snoozeKey) return 0
      try {
        const raw = localStorage.getItem(snoozeKey)
        return raw ? Number(raw) : 0
      } catch (e) { return 0 }
    })

    useEffect(() => {
      if (!snoozeKey) return
      try {
        const raw = localStorage.getItem(snoozeKey)
        const num = raw ? Number(raw) : 0
        setSnoozedUntil(num || 0)
      } catch (e) {}
    }, [snoozeKey])

    if (snoozedUntil && snoozedUntil > Date.now()) return null

    const setSnooze = (days) => {
      if (!snoozeKey) return
      const until = Date.now() + (days * 24 * 3600 * 1000)
      try { localStorage.setItem(snoozeKey, String(until)) } catch (e) {}
      setSnoozedUntil(until)
    }

    return (
      <motion.div whileHover={{ y: -3 }} className={`w-full rounded-2xl p-4 flex items-center justify-between shadow-xl transition-all relative overflow-hidden ${dayMatches ? 'bg-gradient-to-r from-accent-800 to-accent-600 text-white' : 'bg-white border border-gray-100'}`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
          {/* subtle diagonal stripes */}
          <svg width="100%" height="100%" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="rgba(255,255,255,0.06)"/><stop offset="1" stopColor="rgba(0,0,0,0.06)"/></linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>
        </div>

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${dayMatches ? 'bg-white/20' : 'bg-indigo-50'}`} aria-hidden>
            <span className="leading-none">💫</span>
          </div>
          <div>
            <div className={`text-xs font-semibold ${dayMatches ? 'uppercase tracking-wider text-white/90' : 'text-gray-600'}`}>{title}</div>
            <div className={`mt-1 text-2xl font-extrabold ${dayMatches ? 'text-white' : 'text-slate-900'}`}>{isToday ? 'Today' : `${days} day${days===1 ? '' : 's'}`}</div>
            <div className={`text-sm mt-1 ${dayMatches ? 'text-white/90' : 'text-gray-500'}`}>{targetDate.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {calendarRoute ? (
            <a href={calendarRoute} className={`px-4 py-2 rounded-md font-semibold ${dayMatches ? 'bg-white text-accent-700 shadow-sm' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`} aria-label={`Open calendar on ${targetDate.toLocaleDateString()}`}>
              Open calendar
            </a>
          ) : null}

          <div className="flex items-center gap-2">
            <button onClick={() => setSnooze(1)} className={`px-3 py-1 text-sm rounded-md ${dayMatches ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>Snooze 1d</button>
            <button onClick={() => setSnooze(7)} className={`px-3 py-1 text-sm rounded-md ${dayMatches ? 'bg-white/10 text-white/90' : 'bg-gray-50 text-gray-600'}`}>Dismiss 7d</button>
          </div>

          <button aria-label="close" onClick={() => setSnooze(7)} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      </motion.div>
    )
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
          <div className="mt-3">
            {/* Calendar: internal route only. External download / Google Calendar removed per UI request. */}
            {calendarRoute ? (
              <div className="mt-3">
                <a href={calendarRoute} className="btn">Open calendar</a>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {mergedMarks.map(m => {
          const passed = msRemaining <= m*1000
          return (
            <div key={m} className={`p-2 rounded-md text-center ${passed ? 'bg-gradient-to-r from-accent-700 to-accent-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <div className="text-sm font-semibold">{milestoneLabel(m)}</div>
              <div className="text-xs mt-1">{passed ? 'Reached' : 'Upcoming'}</div>
            </div>
          )
        })}
      </div>

      {/* Custom milestone editor hidden behind a small toggle to reduce UI clutter */}
      <div className="mt-3">
        <details className="bg-gray-50 rounded p-2">
          <summary className="cursor-pointer text-sm font-semibold">Edit custom milestones</summary>
          <div className="mt-2">
            <div className="flex gap-2 items-center">
              <input type="number" min={0} value={customInputDays} onChange={e => setCustomInputDays(e.target.value)} className="input w-32" placeholder="Days before" />
              <button className="btn" onClick={() => {
                const days = Number(customInputDays)
                if (!Number.isFinite(days) || days < 0) return alert('Enter a valid non-negative number of days')
                const seconds = Math.round(days * 24 * 3600)
                if (!customKey) return
                const next = Array.from(new Set([...(customMilestones || []), seconds]))
                setCustomMilestones(next)
                try { localStorage.setItem(customKey, JSON.stringify(next)) } catch (e) {}
                setCustomInputDays('')
              }}>Add</button>
            </div>

            <div className="mt-3 space-y-2">
              {(customMilestones || []).length === 0 ? (
                <div className="text-sm muted">No custom milestones</div>
              ) : (
                (customMilestones || []).map(m => (
                  <div key={m} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>{milestoneLabel(m)}</div>
                    <div><button className="btn-ghost" onClick={() => {
                      const next = (customMilestones || []).filter(x => x !== m)
                      setCustomMilestones(next)
                      try { localStorage.setItem(customKey, JSON.stringify(next)) } catch (e) {}
                    }}>Remove</button></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}

// helpers
function pad(n, len=2) { return String(n).padStart(len,'0') }
function formatDateForICS(d) {
  const YYYY = d.getUTCFullYear()
  const MM = pad(d.getUTCMonth()+1)
  const DD = pad(d.getUTCDate())
  const hh = pad(d.getUTCHours())
  const mm = pad(d.getUTCMinutes())
  const ss = pad(d.getUTCSeconds())
  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`
}

function buildICS(date, title) {
  const dt = formatDateForICS(date)
  const dtend = formatDateForICS(new Date(date.getTime() + 60*60*1000))
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Your App//EN\nBEGIN:VEVENT\nUID:${Date.now()}@yourapp\nDTSTAMP:${dt}\nDTSTART:${dt}\nDTEND:${dtend}\nSUMMARY:${escapeICalText(title)}\nEND:VEVENT\nEND:VCALENDAR`
}

function escapeICalText(s) { return (s || '').replace(/\n/g,'\\n').replace(/,/g,'\,') }

function googleCalendarUrl(date, title) {
  const start = formatDateForICS(date)
  const end = formatDateForICS(new Date(date.getTime() + 60*60*1000))
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const params = new URLSearchParams({ text: title, dates: `${start}/${end}` })
  return `${base}&${params.toString()}`
}
