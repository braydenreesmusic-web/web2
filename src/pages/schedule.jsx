import { useEffect, useMemo, useState } from 'react'
import Dialog from '../components/ui/dialog.jsx'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getEvents, createEvent, deleteEvent, getTasks, createTask, updateTask } from '../services/api'

const categories = {
  Anniversary: 'bg-pink-400',
  Together: 'bg-purple-400',
  Work: 'bg-blue-400',
  Other: 'bg-amber-400'
}

export default function Schedule() {
  const { user } = useAuth()
  const [tab, setTab] = useState('calendar')
  const [openJar, setOpenJar] = useState(false)
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // new event form
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [cat, setCat] = useState('Other')

  // new task form
  const [taskTitle, setTaskTitle] = useState('')

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [ev, tk] = await Promise.all([
          getEvents(user.id),
          getTasks(user.id)
        ])
        setEvents(ev || [])
        setTasks(tk || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [user])

  const daysInMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }, [])

  const eventsByDay = useMemo(() => {
    const map = {}
    for (let d = 1; d <= daysInMonth; d++) map[d] = []
    events.forEach(e => {
      const dt = new Date(e.date)
      const day = dt.getDate()
      if (map[day]) map[day].push(e)
    })
    return map
  }, [events, daysInMonth])

  const addEvent = async () => {
    if (!title.trim() || !date) return
    const payload = { user_id: user.id, title: title.trim(), date: new Date(date).toISOString(), category: cat }
    try {
      const saved = await createEvent(payload)
      setEvents(prev => [...prev, saved])
      setTitle(''); setDate(''); setCat('Other')
    } catch (e) { console.error(e) }
  }

  const removeEvent = async (id) => {
    try {
      await deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (e) { console.error(e) }
  }

  const addTask = async () => {
    if (!taskTitle.trim()) return
    const payload = { user_id: user.id, title: taskTitle.trim(), completed: false }
    try {
      const saved = await createTask(payload)
      setTasks(prev => [saved, ...prev])
      setTaskTitle('')
    } catch (e) { console.error(e) }
  }

  const toggleTask = async (id, completed) => {
    try {
      await updateTask(id, { completed })
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
    } catch (e) { console.error(e) }
  }
  return (
    <section className="space-y-6">
      <div className="glass-card p-2 flex gap-2">
        {['calendar','lists'].map(t => (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-xl ${tab===t?'bg-gradient-to-r from-pink-500 to-purple-500 text-white':'bg-gray-100'}`}>{t}</button>
        ))}
      </div>

      {tab==='calendar' && (
        <div className="space-y-4">
          <div className="glass-card p-4 grid md:grid-cols-4 gap-2">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Dinner at Olive Garden" className="w-full px-4 py-3 rounded-xl border md:col-span-2 col-span-4"/>
            <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border"/>
            <select value={cat} onChange={e=>setCat(e.target.value)} className="w-full px-4 py-3 rounded-xl border">
              {Object.keys(categories).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button onClick={addEvent}>Add Event</Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({length: daysInMonth}, (_,i)=>i+1).map(day => (
              <div key={day} className="glass-card p-2 text-sm">
                <div className="font-medium">{day}</div>
                <div className="flex flex-col gap-1 mt-1">
                  {(eventsByDay[day]||[]).slice(0,3).map(e => (
                    <div key={e.id} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${categories[e.category]||'bg-gray-300'}`}/>
                      <span className="truncate" title={e.title}>{e.title}</span>
                      <button onClick={()=>removeEvent(e.id)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">Date Jar</div>
            <Button onClick={()=>setOpenJar(true)}>Pull idea</Button>
          </div>
          <Dialog open={openJar} onClose={()=>setOpenJar(false)} title="Date Jar">
            <p>Try: Picnic in the park 🌿</p>
          </Dialog>
        </div>
      )}

      {tab==='lists' && (
        <div className="space-y-4">
          <div className="glass-card p-4 grid md:grid-cols-6 gap-2">
            <input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Add a task" className="px-4 py-3 rounded-xl border md:col-span-5"/>
            <Button onClick={addTask}>Add</Button>
          </div>
          <div className="glass-card p-4">
            <div className="font-semibold mb-2">Tasks</div>
            {loading && <div className="text-sm text-gray-500">Loading…</div>}
            <div className="space-y-2">
              {tasks.map(t => (
                <label key={t.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!t.completed} onChange={e=>toggleTask(t.id, e.target.checked)}/>
                  <span className={t.completed? 'line-through text-gray-400' : ''}>{t.title}</span>
                </label>
              ))}
              {!tasks.length && !loading && (
                <div className="text-sm text-gray-500">No tasks yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}