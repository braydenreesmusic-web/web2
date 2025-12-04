import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getEvents, createEvent, deleteEvent, getTasks, createTask, updateTask } from '../services/api'

const ownerColors = {
  hers: 'bg-red-500',
  yours: 'bg-blue-500',
  together: 'bg-purple-500',
  other: 'bg-gray-500'
}

const categories = {
  Anniversary: 'bg-red-500',
  Together: 'bg-purple-500',
  Work: 'bg-blue-500',
  Other: 'bg-gray-500'
}

export default function Schedule() {
  const { user } = useAuth()
  const [tab, setTab] = useState('calendar')
  const [goals, setGoals] = useState([
    { id: 1, title: 'Workout 3× a week', progress: 2, target: 3 },
    { id: 2, title: 'Save $200 for a trip', progress: 120, target: 200 },
    { id: 3, title: 'Call at 9pm every night', progress: 5, target: 7 },
  ])
  const [newGoal, setNewGoal] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [cat, setCat] = useState('Other')
  const [owner, setOwner] = useState('together')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    setPhoto(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setPhotoPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setPhotoPreview('')
    }
  }

  const addEvent = async () => {
    if (!title.trim() || !date) return
    let photo_url = ''
    if (photo) {
      photo_url = photoPreview
    }
    const payload = {
      user_id: user.id,
      title: title.trim(),
      date: new Date(date).toISOString(),
      category: cat,
      owner,
      note: note.trim(),
      photo_url,
      is_shared: owner === 'together'
    }
    try {
      const saved = await createEvent(payload)
      setEvents(prev => [...prev, saved])
      setTitle(''); setDate(''); setCat('Other'); setOwner('together'); setNote(''); setPhoto(null); setPhotoPreview('')
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

  const addGoal = (e) => {
    e.preventDefault()
    if (!newGoal.trim() || !newTarget) return
    setGoals(prev => [
      ...prev,
      { id: Date.now(), title: newGoal.trim(), progress: 0, target: parseInt(newTarget) }
    ])
    setNewGoal('')
    setNewTarget('')
  }

  return (
    <section className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-gray-900 tracking-tight">Schedule</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-12 bg-gray-100 p-1 rounded-full w-fit">
          {['calendar','lists','goals'].map(t => (
            <button
              key={t}
              onClick={()=>setTab(t)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                ${tab===t 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"}`}
            >
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* CALENDAR TAB */}
        {tab==='calendar' && (
          <div className="space-y-8">
            {/* Add Event */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">New Event</h2>

              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title"
                    className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"/>
                  <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}
                    className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"/>
                  <select value={cat} onChange={e=>setCat(e.target.value)} className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                    {Object.keys(categories).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <select value={owner} onChange={e=>setOwner(e.target.value)} className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                    <option value="hers">Hers</option>
                    <option value="yours">Yours</option>
                    <option value="together">Together</option>
                  </select>

                  <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note"
                    className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"/>

                  <input type="file" onChange={handlePhotoUpload} className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:cursor-pointer"/>
                </div>

                {photoPreview && <img src={photoPreview} className="h-32 rounded-lg object-cover border border-gray-200"/>}

                <Button onClick={addEvent} className="w-full bg-blue-500 text-white rounded-lg py-3 font-medium hover:bg-blue-600 transition-colors">
                  Add Event
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
              </div>

              <div className="grid grid-cols-7 gap-0 mb-4">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0">
                {Array.from({length: daysInMonth}, (_,i)=>i+1).map(day => (
                  <div
                    key={day}
                    className="aspect-square border border-gray-100 p-2 flex flex-col bg-white hover:bg-gray-50 transition-colors text-sm"
                  >
                    <div className="font-semibold text-gray-900 mb-1">{day}</div>
                    <div className="flex-1 overflow-hidden space-y-0.5">
                      {(eventsByDay[day] || []).slice(0,2).map(e => (
                        <div key={e.id} className={`text-xs px-2 py-1 rounded text-white font-medium ${ownerColors[e.owner]} truncate`} title={e.title}>
                          {e.title}
                        </div>
                      ))}
                      {(eventsByDay[day] || []).length > 2 && (
                        <div className="text-xs text-gray-500 px-2">+{(eventsByDay[day] || []).length - 2}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LISTS TAB */}
        {tab==='lists' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Tasks</h2>
            <div className="flex gap-2 mb-6">
              <input value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 placeholder-gray-500"
                placeholder="Add a task"/>
              <Button onClick={addTask} className="bg-blue-500 text-white px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors">Add</Button>
            </div>

            <div className="space-y-2">
              {tasks.map(t => (
                <label key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <input type="checkbox" checked={t.completed}
                    onChange={e=>toggleTask(t.id, e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 cursor-pointer"/>
                  <span className={t.completed ? "line-through text-gray-400" : "text-gray-900"}>{t.title}</span>
                </label>
              ))}
              {!tasks.length && !loading && (
                <div className="text-center py-8 text-gray-500">No tasks yet</div>
              )}
            </div>
          </div>
        )}

        {/* GOALS TAB */}
        {tab==='goals' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Couple Goals</h2>

            <form className="flex gap-3 mb-8" onSubmit={addGoal}>
              <input className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 placeholder-gray-500" value={newGoal} onChange={e=>setNewGoal(e.target.value)} placeholder="New goal"/>
              <input className="px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-24 placeholder-gray-500" type="number" value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="Target"/>
              <Button type="submit" className="bg-blue-500 text-white px-6 rounded-lg font-medium hover:bg-blue-600 transition-colors">Add</Button>
            </form>

            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-semibold text-gray-900">{goal.title}</div>
                    <div className="text-sm text-gray-500">{goal.progress}/{goal.target}</div>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${Math.min(100, (goal.progress / goal.target) * 100)}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}