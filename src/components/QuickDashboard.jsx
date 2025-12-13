import { useEffect, useState } from 'react'
import Dialog from './ui/dialog.jsx'
import Button from './ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import AIInsights from './modals/AIInsights'

export default function QuickDashboard() {
  const [open, setOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const { user } = useAuth()
  const [latest, setLatest] = useState(null)
  const [presence, setPresence] = useState([])
  const [stats, setStats] = useState({ upcomingEvents: 0, unreadNotes: 0, savingsPct: 0, recentPhotos: 0 })
  
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-quick-dashboard', handler)
    return () => window.removeEventListener('open-quick-dashboard', handler)
  }, [])
  
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const api = await import('../services/api')
        const [checkIns, presenceData, notes, photos, savings, events] = await Promise.all([
          api.getCheckIns(user.id),
          api.getPresence(),
          api.getNotes(user.id),
          api.getMedia(user.id, 'photo'),
          api.getSavingsGoals(user.id),
          api.getEvents(user.id)
        ])
        setLatest(checkIns?.[0] || null)
        setPresence(presenceData || [])
        const unread = (notes || []).filter(n => !n.read).length
        const pct = (() => {
          if (!savings?.length) return 0
          const s = savings[0]
          return Math.min(Math.round((s.current_amount / s.target_amount) * 100), 100)
        })()
        const upcoming = (events || []).filter(e => {
          const d = new Date(e.date)
          return d.getTime() >= Date.now()
        }).length
        setStats({
          upcomingEvents: upcoming,
          unreadNotes: unread,
          savingsPct: pct,
          recentPhotos: (photos || []).length
        })
      } catch (e) { console.error(e) }
    })()
  }, [user])
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Quick Dashboard">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Savings Progress</h3>
              <span className="text-xs text-gray-500">Goal 1</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-gradient-to-r from-slate-700 to-slate-500" style={{width:`${stats.savingsPct}%`}}/></div>
            <p className="mt-2 text-xs text-gray-600">On track · {stats.savingsPct}%</p>
          </div>
          <div className="card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
              <span className="text-xs text-gray-500">Now</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center justify-between"><span>Unread Love Notes</span><span className="text-gray-500">{stats.unreadNotes}</span></li>
              <li className="flex items-center justify-between"><span>Recent Photos</span><span className="text-gray-500">{stats.recentPhotos}</span></li>
              <li className="flex items-center justify-between"><span>Online Now</span><span className="text-gray-500">{presence.filter(p=>p.is_online).length}</span></li>
              <li className="flex items-center justify-between"><span>Upcoming Events</span><span className="text-gray-500">{stats.upcomingEvents}</span></li>
            </ul>
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <Button onClick={() => setAiOpen(true)} variant="solid" className="flex-1">✨ AI Insights</Button>
            <Button variant="outline" className="flex-1">Open Schedule</Button>
          </div>
        </div>
        <AIInsights user={user} isOpen={aiOpen} onClose={() => setAiOpen(false)} />
      </div>
    </Dialog>
  )
}