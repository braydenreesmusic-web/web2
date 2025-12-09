import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import EmptyState from '../components/EmptyState'
import { getCheckIns, getNotes, getMedia, getSavingsGoals, getPresence, getRelationshipData } from '../services/api'
import DailyCheckIn from '../components/modals/DailyCheckIn.jsx'
import Memories from '../components/modals/Memories.jsx'
import RelationshipInsights from '../components/modals/RelationshipInsights.jsx'
import EnhancedChat from '../components/modals/EnhancedChat.jsx'
import { PiggyBank } from 'lucide-react'

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
  const [savings, setSavings] = useState([])
  const [presence, setPresence] = useState([])
  const [relationship, setRelationship] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const [ci, nt, ph, sv, pr, rel] = await Promise.all([
          getCheckIns(user.id),
          getNotes(user.id),
          getMedia(user.id, 'photo'),
          getSavingsGoals(user.id),
          getPresence(),
          getRelationshipData(user.id)
        ])
        if (cancelled) return
        setCheckIns(ci || [])
        setNotes(nt || [])
        setPhotos(ph || [])
        setSavings(sv || [])
        setPresence(pr || [])
        setRelationship(rel || null)
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
        <Link to="/savings" className="glass-card p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-slate-600" />
            <div className="text-sm text-gray-500">Savings Goals</div>
          </div>
          {savings.length > 0 ? (
            <>
              <div className="text-xs text-gray-400 mb-1">{savings[0].title}</div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-to-r from-slate-700 to-slate-500" 
                  style={{width: `${Math.min((savings[0].current_amount / savings[0].target_amount) * 100, 100)}%`}}
                />
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400">No goals yet</div>
          )}
        </Link>
        <div className="glass-card p-4">
          <div className="text-sm text-gray-500 mb-2">Presence</div>
          {presence.filter(p => p.is_online).length > 0 ? (
            <div className="flex flex-col gap-1">
              {presence.filter(p => p.is_online).map(p => {
                const isMe = p.user_id === user.id
                const myName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'You'
                const partnerName = relationship?.display_name 
                  || relationship?.partner_b 
                  || relationship?.partner_a 
                  || 'Partner'
                const name = isMe ? myName : partnerName
                return (
                  <div key={p.user_id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"/>
                    <span className="text-sm font-medium">{name}{isMe ? ' (you)' : ''}</span>
                    <span className="text-xs text-gray-400"> • {p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : ''}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400">No one online</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={()=>setShowCheckIn(true)} className="glass-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Check-In</div>
          <div className="text-sm text-gray-500">Daily mood & energy</div>
        </button>
        <button onClick={()=>setShowGalaxy(true)} className="glass-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Memories</div>
          <div className="text-sm text-gray-500">Timeline & grid</div>
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
        <div className="text-sm text-gray-500 mb-2">Recent Check-Ins</div>
        {checkIns.slice(0, 3).map(ci => (
          <div key={ci.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center text-white text-xs font-semibold">
                {ci.author_name?.[0] || 'U'}
              </div>
              <div>
                <div className="text-sm font-medium">{ci.author_name || 'User'}</div>
                <div className="text-xs text-gray-500">{ci.emotion} • energy {ci.energy}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">{new Date(ci.date).toLocaleDateString()}</div>
          </div>
        ))}
        {!checkIns.length && (
          <div className="py-4">
            <EmptyState title="No check-ins yet" description="Log a check-in to track your progress and feelings over time." action={<button className="btn">Log Check-In</button>} />
          </div>
        )}
      </div>

      <DailyCheckIn open={showCheckIn} onClose={()=>setShowCheckIn(false)} onSubmit={(data)=>{ setCheckIns(prev=> [data, ...prev]) }} />
      <Memories open={showGalaxy} onClose={()=>setShowGalaxy(false)} memories={memories} />
      <RelationshipInsights open={showInsights} onClose={()=>setShowInsights(false)} />
      <EnhancedChat open={showChat} onClose={()=>setShowChat(false)} />
    </section>
  )
}