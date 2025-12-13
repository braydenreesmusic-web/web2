import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/button.jsx'
import { supabase } from '../lib/supabase'
import Dialog from '../components/ui/dialog'
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
  const [partnerDisplayName, setPartnerDisplayName] = useState('')
  const [showDaysModal, setShowDaysModal] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    if (!relationship?.partner_user_id) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, full_name')
          .eq('id', relationship.partner_user_id)
          .maybeSingle()
        if (error) throw error
        if (cancelled) return
        const name = data?.display_name || data?.full_name || ''
        setPartnerDisplayName(name)
      } catch (e) {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [relationship])

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
        <button onClick={() => setShowDaysModal(true)} className="expensive-card p-4 text-left">
          <div className="text-sm muted">Days Together</div>
          <div className="text-3xl font-semibold">{relationship?.start_date ? Math.floor((Date.now() - new Date(relationship.start_date)) / (1000*60*60*24)) : 512}</div>
        </button>
        <Link to="/savings" className="expensive-card p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-[var(--accent-600)]" />
            <div className="text-sm muted">Savings Goals</div>
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
        <div className="expensive-card p-4">
          <div className="text-sm muted mb-2">Presence</div>
          {presence.filter(p => p.is_online).length > 0 ? (
            <div className="flex flex-col gap-3">
              {presence.filter(p => p.is_online).map(p => {
                const isMe = p.user_id === user.id
                const myName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'You'
                const fallbackPartner = relationship?.partner_a || relationship?.partner_b || relationship?.display_name || 'Partner'
                const partnerName = partnerDisplayName || fallbackPartner
                const name = isMe ? myName : partnerName
                return (
                  <div key={p.user_id} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 shadow-sm"/>
                      <span className="text-sm font-medium">{name}{isMe ? ' (you)' : ''}</span>
                      <span className="text-xs muted"> • {p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : ''}</span>
                    </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm muted">No one online</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={()=>setShowCheckIn(true)} className="expensive-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Check-In</div>
          <div className="text-sm muted">Daily mood & energy</div>
        </button>
        <button onClick={()=>setShowGalaxy(true)} className="expensive-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Memories</div>
          <div className="text-sm muted">Timeline & grid</div>
        </button>
        <button onClick={()=>setShowInsights(true)} className="expensive-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Insights</div>
          <div className="text-sm muted">Tips for you two</div>
        </button>
        <button onClick={()=>setShowChat(true)} className="expensive-card p-4 text-left hover:scale-[1.02] transition">
          <div className="text-lg font-semibold gradient-text">Love Notes</div>
          <div className="text-sm muted">Chat with suggestions</div>
        </button>
      </div>

      <div className="expensive-card p-4">
        <div className="text-sm muted mb-2">Recent Check-Ins</div>
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
            <EmptyState title="No check-ins yet" description="Log a check-in to track your progress and feelings over time." action={<Button onClick={()=>setShowCheckIn(true)}>Log Check-In</Button>} />
          </div>
        )}
      </div>

      <DailyCheckIn open={showCheckIn} onClose={()=>setShowCheckIn(false)} onSubmit={(data)=>{ setCheckIns(prev=> [data, ...prev]) }} />
      <Memories open={showGalaxy} onClose={()=>setShowGalaxy(false)} memories={memories} />
      <RelationshipInsights open={showInsights} onClose={()=>setShowInsights(false)} />
      <EnhancedChat open={showChat} onClose={()=>setShowChat(false)} />
      <Dialog open={showDaysModal} onClose={() => setShowDaysModal(false)} title="Time Together">
        <div className="space-y-4">
          {relationship?.start_date ? (
            (() => {
              const start = new Date(relationship.start_date)
              const diff = Math.max(0, Date.now() - start.getTime())
              const secondsTotal = Math.floor(diff / 1000)
              const years = Math.floor(secondsTotal / (365.25 * 24 * 3600))
              const weeks = Math.floor((secondsTotal % (365.25 * 24 * 3600)) / (7 * 24 * 3600))
              const days = Math.floor((secondsTotal % (7 * 24 * 3600)) / (24 * 3600))
              const seconds = secondsTotal % 60
              return (
                <div>
                  <div className="text-lg font-semibold">Since {new Date(relationship.start_date).toLocaleDateString()}</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="expensive-card p-3 text-center">
                      <div className="text-2xl font-bold">{years}</div>
                      <div className="text-sm muted">Years</div>
                    </div>
                    <div className="expensive-card p-3 text-center">
                      <div className="text-2xl font-bold">{weeks}</div>
                      <div className="text-sm muted">Weeks</div>
                    </div>
                    <div className="expensive-card p-3 text-center">
                      <div className="text-2xl font-bold">{days}</div>
                      <div className="text-sm muted">Days</div>
                    </div>
                    <div className="expensive-card p-3 text-center">
                      <div className="text-2xl font-bold">{seconds}</div>
                      <div className="text-sm muted">Seconds</div>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="text-sm muted">Start date not set for your relationship.</div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setShowDaysModal(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}