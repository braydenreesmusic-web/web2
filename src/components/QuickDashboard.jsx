import { useEffect, useState } from 'react'
import Dialog from './ui/dialog.jsx'
import Button from './ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getCheckIns, getPresence } from '../services/api'
import AIInsights from './modals/AIInsights'

export default function QuickDashboard() {
  const [open, setOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const { user } = useAuth()
  const [latest, setLatest] = useState(null)
  const [presence, setPresence] = useState([])
  
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-quick-dashboard', handler)
    return () => window.removeEventListener('open-quick-dashboard', handler)
  }, [])
  
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [checkIns, presenceData] = await Promise.all([
          getCheckIns(user.id),
          getPresence()
        ])
        setLatest(checkIns?.[0] || null)
        setPresence(presenceData || [])
      } catch (e) { console.error(e) }
    })()
  }, [user])
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Quick Dashboard">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="expensive-card p-3">
            <div className="text-xs text-gray-500">Days Together</div>
            <div className="text-xl font-semibold">512</div>
          </div>
          <div className="expensive-card p-3">
            <div className="text-xs text-gray-500">Savings</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{width:'45%'}}/></div>
          </div>
          <div className="expensive-card p-3">
            <div className="text-xs text-gray-500">Presence</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {presence.filter(p => p.is_online).length === 0 && (
                <span className="text-xs text-gray-400">No one online</span>
              )}
              {presence.filter(p => p.is_online).map(p => (
                <div key={p.user_id} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"/>
                  <span className="text-xs">Online</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['Check-In','Galaxy','Love Notes'].map(l => (
            <Button key={l}>{l}</Button>
          ))}
          <Button onClick={() => setAiOpen(true)} className="col-span-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">✨ AI Insights</Button>
        </div>
        <div className="expensive-card p-3">
          <div className="text-xs text-gray-500">Latest Check-In</div>
          <div>{latest ? `${latest.emotion} • energy ${latest.energy}` : 'No check-ins yet'}</div>
        </div>
      </div>
      <AIInsights user={user} isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </Dialog>
  )
}