import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Dialog from '../components/ui/dialog'
import Input from '../components/ui/input'

export default function AdminPushSubscriptions(){
  const { user } = useAuth()
  const [adminSecret, setAdminSecret] = useState(() => sessionStorage.getItem('admin_secret') || '')
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(()=>{
    if (!adminSecret) return
    sessionStorage.setItem('admin_secret', adminSecret)
  },[adminSecret])

  const load = async ()=>{
    if (!adminSecret) return setError('Provide admin secret to load subscriptions')
    setLoading(true); setError(null)
    try{
      const res = await fetch('/api/admin/push-subscriptions', { headers: { 'x-admin-secret': adminSecret }})
      if (!res.ok) {
        const txt = await res.text().catch(()=>null)
        throw new Error(txt || `status ${res.status}`)
      }
      const rows = await res.json()
      setSubscriptions(rows || [])
    }catch(e){ setError(String(e)); setSubscriptions([]) }
    finally{ setLoading(false) }
  }

  const associate = async (id, userId) => {
    if (!adminSecret) return setError('Admin secret required')
    try{
      const res = await fetch('/api/admin/push-subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id, user_id: userId })
      })
      if (!res.ok) {
        const txt = await res.text().catch(()=>null)
        throw new Error(txt || `status ${res.status}`)
      }
      await load()
    }catch(e){ setError(String(e)) }
  }

  const remove = async (id) => {
    if (!adminSecret) return setError('Admin secret required')
    try{
      const res = await fetch('/api/admin/push-subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify({ id })
      })
      if (!res.ok) throw new Error(await res.text())
      await load()
    }catch(e){ setError(String(e)) }
  }

  return (
    <section className="space-y-4 p-4">
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Admin: Push Subscriptions</div>
          <div className="text-xs text-gray-500">Signed in: {user?.user_metadata?.name || user?.email || '—'}</div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-gray-500">Admin Secret</label>
          <div className="flex gap-2 mt-1">
            <Input value={adminSecret} onChange={e=>setAdminSecret(e.target.value)} placeholder="Paste admin secret for API requests" />
            <button onClick={load} className="btn">Load</button>
          </div>
          {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        </div>
      </div>

      <div>
        {loading ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="space-y-2">
            {subscriptions.length===0 ? <div className="text-sm text-gray-500">No subscriptions</div> : (
              subscriptions.map(s => (
                <div key={s.id} className="p-3 bg-white rounded border">
                  <div className="flex items-center justify-between">
                    <div className="w-3/4">
                      <div className="text-sm font-medium">ID: {s.id}</div>
                      <div className="text-xs truncate">Endpoint: {s.subscription?.endpoint}</div>
                      <div className="text-xs">User ID: {s.user_id || '—'}</div>
                      <div className="text-xs">Created: {new Date(s.created_at).toLocaleString()}</div>
                    </div>
                    <div className="w-1/4 flex flex-col items-end gap-2">
                      <AssociateForm currentUserId={s.user_id} onAssociate={(uid)=>associate(s.id, uid)} onRemove={()=>remove(s.id)} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function AssociateForm({ currentUserId, onAssociate, onRemove }){
  const [val, setVal] = useState(currentUserId||'')
  return (
    <div className="flex flex-col items-end">
      <Input className="text-xs w-40" value={val} onChange={e=>setVal(e.target.value)} placeholder="user id (uuid)" />
      <div className="flex gap-2 mt-2">
        <button className="px-2 py-1 bg-green-600 text-white text-xs rounded" onClick={()=>onAssociate(val)}>Associate</button>
        <button className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded" onClick={onRemove}>Delete</button>
      </div>
    </div>
  )
}
