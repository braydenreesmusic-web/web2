import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getCheckIns, getNotes, getMedia } from '../services/api'
import DailyCheckIn from '../components/modals/DailyCheckIn.jsx'
import MemoryConstellation from '../components/modals/MemoryConstellation.jsx'
import RelationshipInsights from '../components/modals/RelationshipInsights.jsx'
import EnhancedChat from '../components/modals/EnhancedChat.jsx'

export default function Dashboard() {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showGalaxy, setShowGalaxy] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [checkIns, setCheckIns] = useState([])
  const [notes, setNotes] = useState([])
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const [ci, nt, ph] = await Promise.all([
          getCheckIns(user.id),
          getNotes(user.id),
          getMedia(user.id, 'photo')
        ])
        if (cancelled) return
        setCheckIns(ci || [])
        setNotes(nt || [])
        setPhotos(ph || [])
      } catch (e) {
        console.error('Dashboard load failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const latestCheckIn = useMemo(() => checkIns?.[0] || null, [checkIns])
  const memories = useMemo(() => {
    return [
      ...photos.map(p=> ({ id:p.id, type:'photo', url:p.url, caption:p.caption, date:p.date, favorite:p.favorite })),
      ...notes.map(n=> ({ id:n.id, type:'note', content:n.content, date:n.date, favorite:false })),
    ]
  }, [photos, notes])

  return (
    <section className="space-y-6">
      {loading && (
        <div className="glass-card p-4">Loading your overview…</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <div className="text-sm text-gray-500">Days Together</div>
          <div className="text-3xl font-semibold">512</div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-500">Savings Goal</div>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2"><div className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{width:'45%'}}/></div>
        </div>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-500">Presence</div>
          <div className="flex gap-2 mt-2"><span className="w-2 h-2 rounded-full bg-green-500"/> Alex <span className="w-2 h-2 rounded-full bg-gray-400"/> Sam</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={()=>setShowCheckIn(true)} className="glass-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Check-In</div>
          <div className="text-sm text-gray-500">Daily mood & energy</div>
        </button>
        <button onClick={()=>setShowGalaxy(true)} className="glass-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Memory Galaxy</div>
          <div className="text-sm text-gray-500">Explore memories</div>
        </button>
        <button onClick={()=>setShowInsights(true)} className="glass-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Insights</div>
          <div className="text-sm text-gray-500">Tips for you two</div>
        </button>
        <button onClick={()=>setShowChat(true)} className="glass-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Love Notes</div>
          <div className="text-sm text-gray-500">Chat with suggestions</div>
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="text-sm text-gray-500">Latest Check-In</div>
        <div className="mt-2">{latestCheckIn ? `${latestCheckIn.emotion} • energy ${latestCheckIn.energy}` : 'No check-ins yet'}</div>
      </div>

      <DailyCheckIn open={showCheckIn} onClose={()=>setShowCheckIn(false)} onSubmit={(data)=>{ setCheckIns(prev=> [data, ...prev]) }} />
      <MemoryConstellation open={showGalaxy} onClose={()=>setShowGalaxy(false)} memories={memories} />
      <RelationshipInsights open={showInsights} onClose={()=>setShowInsights(false)} />
      <EnhancedChat open={showChat} onClose={()=>setShowChat(false)} />
    </section>
  )
}