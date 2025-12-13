import { useEffect, useState } from 'react'
import Dialog from '../../components/ui/dialog.jsx'
import Button from '../../components/ui/button.jsx'
import { useAuth } from '../../contexts/AuthContext'
import { getInsights, markInsightAsRead } from '../../lib/lazyApi'

export default function RelationshipInsights({ open, onClose }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const color = (t)=> t==='communication' ? 'bg-blue-100 text-blue-700' : t==='dates' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await getInsights(user.id)
        if (!cancelled) setItems(data || [])
      } catch (e) {
        console.error('Load insights failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [open, user])

  const markReadLocal = async (index, insightId) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, read: true } : it))
    try { await markInsightAsRead(insightId) } catch {}
  }

  return (
    <Dialog open={open} onClose={onClose} title="Relationship Insights">
      <div className="space-y-3">
        {items.map((ins,i)=> (
          <div key={i} className="glass-card p-3">
            <div className={`text-xs inline-block px-2 py-0.5 rounded-full mr-2 align-middle ${color(ins.type)}`}>{ins.type}</div>
            <div className="font-semibold">{ins.title}</div>
            <div className="text-sm text-gray-600">{ins.content}</div>
            <div className="mt-2 flex gap-2">
              {!ins.read && <button className="px-3 py-1 rounded-xl bg-gray-100" onClick={()=>markReadLocal(i, ins.id)}>Mark read</button>}
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="text-sm text-gray-500">No insights yet.</div>
        )}
      </div>
    </Dialog>
  )
}