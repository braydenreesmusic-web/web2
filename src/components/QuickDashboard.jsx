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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Progress</h3>
              <span className="text-xs text-gray-500">Weekly</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-gradient-to-r from-slate-700 to-slate-500" style={{width:'45%'}}/></div>
            <p className="mt-2 text-xs text-gray-600">On track · 45%</p>
          </div>
          <div className="card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Today</h3>
              <span className="text-xs text-gray-500">Agenda</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center justify-between"><span>Workout</span><span className="text-gray-500">7:30</span></li>
              <li className="flex items-center justify-between"><span>Lunch</span><span className="text-gray-500">12:00</span></li>
              <li className="flex items-center justify-between"><span>Practice</span><span className="text-gray-500">17:00</span></li>
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