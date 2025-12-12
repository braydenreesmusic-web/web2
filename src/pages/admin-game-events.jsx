import { useState } from 'react'
import Button from '../components/ui/button'

export default function AdminGameEvents() {
  const [userId, setUserId] = useState('')
  const [secret, setSecret] = useState('')
  const [limit, setLimit] = useState(200)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    setRows(null)
    try {
      const q = new URLSearchParams({ user_id: userId, limit: String(limit), secret })
      const res = await fetch(`/api/admin/game-events-debug?${q.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || JSON.stringify(json))
      setRows(json.rows || [])
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="glass-card p-4">
        <h2 className="font-semibold text-lg">Game Events Debug</h2>
        <div className="mt-3 space-y-2">
          <input className="input" placeholder="user_id (UUID)" value={userId} onChange={e=>setUserId(e.target.value)} />
          <input className="input" placeholder="debug secret" value={secret} onChange={e=>setSecret(e.target.value)} />
          <div className="flex items-center gap-2">
            <input type="number" className="input w-24" value={limit} onChange={e=>setLimit(Number(e.target.value||0))} />
            <Button onClick={fetchEvents} disabled={!userId || loading}>{loading ? 'Loading…' : 'Fetch Events'}</Button>
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">Error: {error}</div>}

      {rows && (
        <div className="glass-card p-3">
          <div className="font-medium mb-2">Events ({rows.length})</div>
          <div className="space-y-2 max-h-[60vh] overflow-auto text-sm">
            {rows.map((r,i) => (
              <div key={i} className="p-2 bg-white rounded border">
                <div className="text-xs text-gray-500">{r.date} — {r.author} — {r.user_id}</div>
                <div className="mt-1 font-mono text-sm break-words">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
