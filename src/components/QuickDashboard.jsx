import { useEffect, useState } from 'react'
import Dialog from './ui/dialog.jsx'
import Button from './ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getCheckIns } from '../services/api'

export default function QuickDashboard() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const [latest, setLatest] = useState(null)
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-quick-dashboard', handler)
    return () => window.removeEventListener('open-quick-dashboard', handler)
  }, [])
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const list = await getCheckIns(user.id)
        setLatest(list?.[0] || null)
      } catch (e) { console.error(e) }
    })()
  }, [user])
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Quick Dashboard">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3">
            <div className="text-xs text-gray-500">Days Together</div>
            <div className="text-xl font-semibold">512</div>
          </div>
          <div className="glass-card p-3">
            <div className="text-xs text-gray-500">Savings</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1"><div className="h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" style={{width:'45%'}}/></div>
          </div>
          <div className="glass-card p-3">
            <div className="text-xs text-gray-500">Presence</div>
            <div className="flex items-center gap-2 mt-1"><span className="w-2 h-2 rounded-full bg-green-500"/>Alex <span className="w-2 h-2 rounded-full bg-gray-400"/>Sam</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {['Check-In','Galaxy','Insights','Love Notes'].map(l => (
            <Button key={l}>{l}</Button>
          ))}
        </div>
        <div className="glass-card p-3">
          <div className="text-xs text-gray-500">Latest Check-In</div>
          <div>{latest ? `${latest.emotion} • energy ${latest.energy}` : 'No check-ins yet'}</div>
        </div>
      </div>
    </Dialog>
  )
}