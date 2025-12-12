import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AdminPresence(){
  const { user } = useAuth()
  const [adminSecret, setAdminSecret] = useState(() => sessionStorage.getItem('admin_secret') || '')
  const [loadingSignals, setLoadingSignals] = useState(false)
  const [signals, setSignals] = useState([])
  const [presenceUserId, setPresenceUserId] = useState('')
  const [presenceMeta, setPresenceMeta] = useState('{}')
  const [error, setError] = useState(null)

  useEffect(()=>{
    if (!adminSecret) return
    sessionStorage.setItem('admin_secret', adminSecret)
  },[adminSecret])

  const loadSignals = async ()=>{
    if (!adminSecret) return setError('Provide admin secret to load signals')
    setLoadingSignals(true); setError(null)
    try{
      const res = await fetch('/api/admin/signals', { headers: { 'x-admin-secret': adminSecret }})
      if (!res.ok) {
        const txt = await res.text().catch(()=>null)
        throw new Error(txt || `status ${res.status}`)
      }
      const rows = await res.json()
      setSignals(rows || [])
    }catch(e){ setError(String(e)); setSignals([]) }
    finally{ setLoadingSignals(false) }
  }

  const upsertPresence = async () => {
    if (!adminSecret) return setError('Provide admin secret')
    if (!presenceUserId) return setError('Provide user id')
    setError(null)
    try{
      let meta = {};
      try{ meta = JSON.parse(presenceMeta || '{}') }catch(e){ throw new Error('Invalid JSON for meta') }
      const res = await fetch('/api/admin/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ user_id: presenceUserId, online: true, meta })
      })
      if (!res.ok) throw new Error(await res.text())
      await res.json()
      setError(null)
    }catch(e){ setError(String(e)) }
  }

  const deletePresence = async ()=>{
    if (!adminSecret) return setError('Provide admin secret')
    if (!presenceUserId) return setError('Provide user id')
    setError(null)
    try{
      const res = await fetch('/api/admin/presence', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ user_id: presenceUserId })
      })
      if (!res.ok) throw new Error(await res.text())
      await res.json()
    }catch(e){ setError(String(e)) }
  }

  return (
    <section className="space-y-4 p-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Admin: Presence & Signals</div>
          <div className="text-xs text-gray-500">Signed in: {user?.user_metadata?.name || user?.email || '—'}</div>
        </div>

        <div className="mt-3">
          <label className="text-xs text-gray-500">Admin Secret</label>
          <div className="flex gap-2 mt-1">
            <input value={adminSecret} onChange={e=>setAdminSecret(e.target.value)} className="input" placeholder="Paste admin secret for API requests" />
            <button onClick={loadSignals} className="btn">Load Signals</button>
          </div>
          {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="font-medium">Manage Presence</div>
        <div className="mt-3 space-y-2">
          <input className="input" placeholder="user_id (UUID)" value={presenceUserId} onChange={e=>setPresenceUserId(e.target.value)} />
          <label className="text-xs text-gray-500">Meta (JSON)</label>
          <textarea className="input" rows={3} value={presenceMeta} onChange={e=>setPresenceMeta(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn" onClick={upsertPresence}>Upsert Presence</button>
            <button className="btn" onClick={deletePresence}>Delete Presence</button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Recent Signals</div>
          <div className="text-xs text-gray-500">Count: {signals.length}</div>
        </div>

        <div className="mt-3">
          {loadingSignals ? <div className="text-sm text-gray-500">Loading…</div> : (
            <div className="space-y-2 max-h-[60vh] overflow-auto text-sm">
              {signals.length===0 ? <div className="text-sm text-gray-500">No signals</div> : (
                signals.map(s => (
                  <div key={s.id} className="p-2 bg-white rounded border">
                    <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()} — {s.user_id} → {s.target_user_id || 'public'}</div>
                    <div className="mt-1 font-mono text-sm break-words">{s.type} — {JSON.stringify(s.payload)}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
