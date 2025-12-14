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

  // custom milestones persisted per target
  const customKey = targetDate ? `countdown-custom-milestones:${targetDate.toISOString()}` : null
  const [customInputDays, setCustomInputDays] = useState('')
  const [customMilestones, setCustomMilestones] = useState(() => {
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
            <div className="text-sm muted">Calendar</div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  // download .ics
                  try {
                    const ics = buildICS(targetDate, title)
                    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${title.replace(/\s+/g,'-') || 'event'}.ics`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  } catch (e) { alert('Failed to create .ics: ' + e.message) }
                }}
                className="btn"
              >Download .ics</button>

              <button
                onClick={() => {
                  // open Google Calendar create
                  try {
                    const g = googleCalendarUrl(targetDate, title)
                    window.open(g, '_blank')
                  } catch (e) { alert('Failed to open Google Calendar: ' + e.message) }
                }}
                className="btn-ghost"
              >Open in Google Calendar</button>
            </div>
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

      {/* Custom milestone editor */}
      <div className="mt-3">
        <div className="text-sm font-semibold mb-2">Custom Milestones</div>
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
              <div key={m} className="flex items-center justify-between p-2 bg-gray-50 rounded">
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
