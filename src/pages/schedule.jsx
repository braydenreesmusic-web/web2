import { useEffect, useMemo, useState } from 'react'
import Dialog from '../components/ui/dialog.jsx'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getEvents, createEvent, deleteEvent, getTasks, createTask, updateTask } from '../services/api'

// Color codes for event owners/types
const ownerColors = {
  hers: 'bg-pink-400',
  yours: 'bg-blue-400',
  together: 'bg-purple-400',
  other: 'bg-amber-400'
}

const categories = {
  Anniversary: 'bg-pink-400',
  Together: 'bg-purple-400',
  Work: 'bg-blue-400',
  Other: 'bg-amber-400'
}

export default function Schedule() {
  const { user } = useAuth()
  const [tab, setTab] = useState('calendar')
  // Couple goals state (local for now)
  const [goals, setGoals] = useState([
    { id: 1, title: 'Workout 3× a week', progress: 2, target: 3 },
    { id: 2, title: 'Save $200 for a trip', progress: 120, target: 200 },
    { id: 3, title: 'Call at 9pm every night', progress: 5, target: 7 },
  ])
  const [newGoal, setNewGoal] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [openJar, setOpenJar] = useState(false)
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // new event form
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [cat, setCat] = useState('Other')
  const [owner, setOwner] = useState('together') // hers, yours, together
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')

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
    let photo_url = ''
    // Handle photo upload if present
    if (photo) {
      // For demo: just use a local preview, in production upload to storage and get URL
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
  return (
    <section className="max-w-5xl mx-auto py-8 px-2 md:px-0">
      {/* Navigation Tabs */}
      <div className="flex justify-center mb-6">
        {['calendar','lists','goals'].map(t => (
          <button
            key={t}
            onClick={()=>setTab(t)}
            className={`px-6 py-2 mx-1 rounded-full shadow transition-all duration-200 font-semibold text-lg 
              ${tab===t ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white scale-105 shadow-lg' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
            {/* Goals Tab */}
            {tab==='goals' && (
              <div className="space-y-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Couple Goals</h2>
                    <form className="flex gap-2" onSubmit={e=>{e.preventDefault();
                      if (!newGoal.trim() || !newTarget) return;
                      setGoals(prev => [
                        ...prev,
                        { id: Date.now(), title: newGoal.trim(), progress: 0, target: parseInt(newTarget) }
                      ]);
                      setNewGoal(''); setNewTarget('');
                    }}>
                      <input value={newGoal} onChange={e=>setNewGoal(e.target.value)} placeholder="New goal (e.g. Read together)" className="px-3 py-2 rounded-xl border"/>
                      <input value={newTarget} onChange={e=>setNewTarget(e.target.value)} placeholder="Target" type="number" min="1" className="w-20 px-3 py-2 rounded-xl border"/>
                      <Button type="submit">Add</Button>
                    </form>
                  </div>
                  <div className="space-y-6">
                    {goals.map(goal => (
                      <div key={goal.id} className="p-4 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 shadow flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-gray-700">{goal.title}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div className="bg-gradient-to-r from-pink-400 to-purple-400 h-3 rounded-full transition-all" style={{width: `${Math.min(100, Math.round((goal.progress/goal.target)*100))}%`}}></div>
                            </div>
                            <span className="text-xs font-bold text-pink-500">{goal.progress}/{goal.target}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Button onClick={()=>setGoals(gs=>gs.map(g=>g.id===goal.id?{...g,progress:Math.max(0,g.progress-1)}:g))} disabled={goal.progress<=0} className="px-3 py-1 rounded-full bg-gray-100 text-gray-500">-</Button>
                          <Button onClick={()=>setGoals(gs=>gs.map(g=>g.id===goal.id?{...g,progress:Math.min(g.target,g.progress+1)}:g))} disabled={goal.progress>=goal.target} className="px-3 py-1 rounded-full bg-pink-400 text-white">+</Button>
                        </div>
                      </div>
                    ))}
                    {!goals.length && <div className="text-gray-400 text-center py-8">No couple goals yet. Add one above!</div>}
                  </div>
                </div>
              </div>
            )}
      </div>

      {/* Calendar Tab */}
      {tab==='calendar' && (
        <div className="space-y-8">
          {/* Event Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 grid md:grid-cols-6 gap-4 border border-gray-100">
            <div className="md:col-span-2 col-span-6 flex flex-col gap-2">
              <label className="font-medium text-gray-700 flex items-center gap-2"><span>Title</span> <span className="text-pink-400">★</span></label>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Dinner at Olive Garden" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-pink-200"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Date & Time</label>
              <input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-200"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Category</label>
              <select value={cat} onChange={e=>setCat(e.target.value)} className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-200">
                {Object.keys(categories).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700">Owner</label>
              <select value={owner} onChange={e=>setOwner(e.target.value)} className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-pink-200">
                <option value="hers">Hers</option>
                <option value="yours">Yours</option>
                <option value="together">Together</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="md:col-span-2 col-span-6 flex flex-col gap-2">
              <label className="font-medium text-gray-700">Love Note <span className="text-xs text-gray-400">(optional)</span></label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Wear something warm 💛" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-pink-100"/>
            </div>
            <div className="md:col-span-2 col-span-6 flex flex-col gap-2">
              <label className="font-medium text-gray-700">Memory Photo <span className="text-xs text-gray-400">(optional)</span></label>
              <input type="file" accept="image/*" onChange={e=>{
                const file = e.target.files[0];
                setPhoto(file);
                if (file) {
                  const reader = new FileReader();
                  reader.onload = ev => setPhotoPreview(ev.target.result);
                  reader.readAsDataURL(file);
                } else {
                  setPhotoPreview('');
                }
              }} className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-100"/>
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="h-20 rounded-xl object-cover mt-2 border border-gray-200 shadow" />
              )}
            </div>
            <div className="flex items-end">
              <Button onClick={addEvent} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-105 transition">Add Event</Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="grid grid-cols-7 gap-4">
              {Array.from({length: daysInMonth}, (_,i)=>i+1).map(day => {
                // Heatmap: count events for this day
                const eventCount = (eventsByDay[day]||[]).length;
                let heatColor = '';
                if (eventCount >= 4) heatColor = 'bg-red-200';
                else if (eventCount === 3) heatColor = 'bg-orange-200';
                else if (eventCount === 2) heatColor = 'bg-yellow-100';
                else if (eventCount === 1) heatColor = 'bg-green-100';
                else heatColor = 'bg-gray-50';
                return (
                  <div key={day} className={`rounded-xl p-3 min-h-[90px] flex flex-col shadow-sm border border-gray-100 ${heatColor}`}>
                    <div className="font-bold text-gray-700 mb-1">{day}</div>
                    <div className="flex flex-col gap-1 mt-1">
                      {(eventsByDay[day]||[]).slice(0,3).map(e => (
                        <div key={e.id} className={`flex items-center gap-2 px-2 py-1 rounded-lg shadow-sm ${ownerColors[e.owner]||'bg-gray-200'} bg-opacity-80`}> 
                          <span className="w-2 h-2 rounded-full bg-white border border-gray-300"/>
                          <span className="truncate font-semibold text-white drop-shadow" title={e.title}>{e.title}</span>
                          {e.note && <span className="text-xs text-pink-100" title={e.note}>💌</span>}
                          {e.photo_url && <span className="text-xs" title="Memory photo">📸</span>}
                          <button onClick={()=>removeEvent(e.id)} className="ml-auto text-xs text-white/70 hover:text-white">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Date Jar */}
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl shadow p-4 flex items-center justify-between border border-pink-200">
            <div className="text-sm text-gray-600 font-medium flex items-center gap-2">Date Jar <span>💡</span></div>
            <Button onClick={()=>setOpenJar(true)} className="bg-pink-400 text-white rounded-full px-4 py-2 shadow hover:scale-105 transition">Pull idea</Button>
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