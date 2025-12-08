import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getEvents, createEvent, deleteEvent, getTasks, createTask, updateTask } from '../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../contexts/ToastContext'
import { Icons, OwnerBadge } from '../components/Icons'

const ownerColors = {
  hers: 'bg-red-500',
  yours: 'bg-blue-500',
  together: 'bg-purple-500',
  other: 'bg-gray-500'
}

const ownerEmojis = {
  hers: '👩',
  yours: '👨',
  together: '💑',
  other: '📌'
}

const categories = {
  Anniversary: 'bg-red-500',
  Together: 'bg-purple-500',
  Work: 'bg-blue-500',
  Other: 'bg-gray-500'
}

const categoryEmojis = {
  Anniversary: '💕',
  Together: '👫',
  Work: '💼',
  Other: '📌'
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

  const { showToast } = useToast()
  const [scanning, setScanning] = useState(false)
  const [parsedEvents, setParsedEvents] = useState([])
  const [lastDebug, setLastDebug] = useState(null)

  const scanImageForSchedule = async () => {
    if (!photoPreview) return
    setScanning(true)
    setParsedEvents([])
    try {
      showToast && showToast('Scanning image…', { type: 'info' })
      setLastDebug({ startedAt: Date.now(), payloadSize: (photoPreview || '').length })
      console.log('Scan request: sending image to /api/parse-schedule')
      const res = await fetch('/api/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photoPreview })
      })
      let json
      try {
        json = await res.json()
      } catch (e) {
        const text = await res.text().catch(() => null)
        throw new Error('Invalid JSON response from server: ' + (text || e.message))
      }
      setLastDebug(prev => ({ ...(prev||{}), receivedAt: Date.now(), status: res.status, body: json, raw_text: json?.raw_text }))
      if (!res.ok) {
        console.error('Scan server error', res.status, json)
        throw new Error(json?.error || JSON.stringify(json) || 'Scan failed')
      }
      console.log('Scan response', json)
      const events = json.events || []
      setParsedEvents(events)
      if (events.length) {
        showToast && showToast(`Scan complete — ${events.length} event(s) found`, { type: 'success' })
      } else {
        showToast && showToast('Scan complete — no events detected', { type: 'info' })
        console.debug('OCR raw text:', json.raw_text)
      }
    } catch (err) {
      console.error('Scan error', err)
      showToast && showToast('Failed to parse schedule image: ' + (err.message || err), { type: 'error' })
    } finally {
      setScanning(false)
    }
  }

  const importParsedEvents = async () => {
    if (!parsedEvents.length) return
    try {
      for (const ev of parsedEvents) {
        const payload = {
          user_id: user.id,
          title: ev.title || 'Imported event',
          date: ev.date ? new Date(ev.date).toISOString() : new Date().toISOString(),
          category: ev.category || 'Other',
          owner: 'together',
          note: ev.note || ''
        }
        const saved = await createEvent(payload)
        setEvents(prev => [...prev, saved])
      }
      setParsedEvents([])
      setPhoto(null)
      setPhotoPreview('')
      showToast && showToast('Imported events', { type: 'success' })
    } catch (err) {
      console.error('Import error', err)
      showToast && showToast('Failed to import events: ' + (err.message || err), { type: 'error' })
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
    <section className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {scanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white/90 p-6 rounded-xl shadow-lg flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-t-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium">Scanning image — this may take a few seconds…</div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <Icons.Calendar className="w-8 h-8 text-purple-600" />
            <h1 className="text-5xl font-bold text-gray-900">Schedule & Planning</h1>
          </div>
          <p className="text-gray-600">Keep track of events, tasks, and couple goals together</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-full w-fit shadow-sm border border-gray-200">
          {['calendar','lists','goals'].map((t, i) => (
            <motion.button
              key={t}
              onClick={()=>setTab(t)}
              layout
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                tab===t 
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* CALENDAR TAB */}
        <AnimatePresence mode="wait">
          {tab==='calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Add Event Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Icons.Add className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input 
                      value={title} 
                      onChange={e=>setTitle(e.target.value)} 
                      placeholder="Event title"
                      className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
                    />
                    <input 
                      type="datetime-local" 
                      value={date} 
                      onChange={e=>setDate(e.target.value)}
                      className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <select 
                      value={cat} 
                      onChange={e=>setCat(e.target.value)} 
                      className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    >
                      {Object.keys(categories).map(c => (
                        <option key={c} value={c}>{categoryEmojis[c]} {c}</option>
                      ))}
                    </select>

                    <select 
                      value={owner} 
                      onChange={e=>setOwner(e.target.value)} 
                      className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="hers">{ownerEmojis.hers} Hers</option>
                      <option value="yours">{ownerEmojis.yours} Yours</option>
                      <option value="together">{ownerEmojis.together} Together</option>
                    </select>

                    <input 
                      value={note} 
                      onChange={e=>setNote(e.target.value)} 
                      placeholder="Add a note"
                      className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <label className="flex-1 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-500 cursor-pointer transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600">
                      <Icons.Image className="w-4 h-4" />
                      <span>Photo</span>
                      <input type="file" onChange={handlePhotoUpload} className="hidden"/>
                    </label>
                    <motion.button 
                      onClick={addEvent}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all"
                    >
                      Add Event
                    </motion.button>
                    <motion.button
                      onClick={scanImageForSchedule}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={!photoPreview || scanning}
                      className="px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold hover:shadow-sm transition-all disabled:opacity-50"
                    >
                      {scanning ? 'Scanning…' : 'Scan Image'}
                    </motion.button>
                  </div>

                  {photoPreview && (
                    <motion.img 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={photoPreview} 
                      className="h-40 rounded-xl object-cover border-2 border-purple-500 w-full"
                    />
                  )}
                  {parsedEvents.length > 0 && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Parsed events</div>
                        <div className="text-sm text-gray-500">{parsedEvents.length} found</div>
                      </div>
                      <div className="space-y-2">
                        {parsedEvents.map((pe, idx) => {
                          const localDt = pe.date ? new Date(pe.date) : null
                          const dtValue = localDt ? new Date(localDt.getTime() - localDt.getTimezoneOffset()*60000).toISOString().slice(0,16) : ''
                          return (
                          <div key={idx} className="p-3 rounded-lg border border-gray-100 bg-white">
                            <div className="grid md:grid-cols-3 gap-3">
                              <input
                                value={pe.title || ''}
                                onChange={(e) => setParsedEvents(prev => prev.map((p,i)=> i===idx ? {...p, title: e.target.value} : p))}
                                className="px-3 py-2 rounded-md border w-full"
                                placeholder="Event title"
                              />
                              <input
                                type="datetime-local"
                                value={dtValue}
                                onChange={(e) => {
                                  const val = e.target.value
                                  const iso = val ? new Date(val).toISOString() : null
                                  setParsedEvents(prev => prev.map((p,i)=> i===idx ? {...p, date: iso} : p))
                                }}
                                className="px-3 py-2 rounded-md border w-full"
                              />
                              <select
                                value={pe.category || 'Other'}
                                onChange={(e) => setParsedEvents(prev => prev.map((p,i)=> i===idx ? {...p, category: e.target.value} : p))}
                                className="px-3 py-2 rounded-md border w-full"
                              >
                                {Object.keys(categories).map(c => (
                                  <option key={c} value={c}>{categoryEmojis[c]} {c}</option>
                                ))}
                              </select>
                            </div>
                            <div className="mt-2 grid md:grid-cols-2 gap-3">
                              <input
                                value={pe.note || ''}
                                onChange={(e) => setParsedEvents(prev => prev.map((p,i)=> i===idx ? {...p, note: e.target.value} : p))}
                                className="px-3 py-2 rounded-md border w-full"
                                placeholder="Note (optional)"
                              />
                              <div className="flex items-center gap-2">
                                <button onClick={() => {
                                  // import single parsed event
                                  const ev = parsedEvents[idx]
                                  const payload = {
                                    user_id: user.id,
                                    title: ev.title || 'Imported event',
                                    date: ev.date ? new Date(ev.date).toISOString() : new Date().toISOString(),
                                    category: ev.category || 'Other',
                                    owner: 'together',
                                    note: ev.note || ''
                                  }
                                  createEvent(payload).then(saved => {
                                    setEvents(prev => [...prev, saved])
                                    setParsedEvents(prev => prev.filter((_, i) => i !== idx))
                                    showToast && showToast('Event imported', { type: 'success' })
                                  }).catch(err => {
                                    console.error('Import single error', err)
                                    showToast && showToast('Failed to import event', { type: 'error' })
                                  })
                                }} className="px-3 py-2 rounded-md bg-purple-600 text-white">Import</button>
                                <button onClick={() => setParsedEvents(prev => prev.filter((_, i) => i !== idx))} className="px-3 py-2 rounded-md border">Remove</button>
                              </div>
                            </div>
                          </div>
                        )})}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={importParsedEvents} className="px-4 py-2 rounded-lg bg-purple-600 text-white">Import all</button>
                        <button onClick={() => setParsedEvents([])} className="px-4 py-2 rounded-lg bg-white border">Clear</button>
                      </div>
                      {lastDebug && (
                        <div className="mt-3 p-3 bg-white border rounded text-xs text-gray-700">
                          <div className="font-semibold mb-1">Scan debug</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><strong>Started:</strong> {new Date(lastDebug.startedAt).toLocaleString()}</div>
                            <div><strong>Received:</strong> {lastDebug.receivedAt ? new Date(lastDebug.receivedAt).toLocaleString() : '—'}</div>
                            <div><strong>Payload size:</strong> {lastDebug.payloadSize}</div>
                            <div><strong>Status:</strong> {lastDebug.status ?? '—'}</div>
                            <div className="col-span-2"><strong>OCR text (excerpt):</strong>
                              <pre className="whitespace-pre-wrap max-h-36 overflow-auto text-xs bg-gray-50 p-2 rounded mt-1">{(lastDebug.raw_text || '').slice(0, 1000)}</pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Calendar View */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl p-8 shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Icons.Calendar className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                </div>

                <div className="grid grid-cols-7 gap-0 mb-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-2">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className="text-center text-xs font-bold text-gray-600 py-3">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5 bg-gray-100 p-0.5 rounded-xl overflow-hidden">
                  {Array.from({length: daysInMonth}, (_,i)=>i+1).map(day => (
                    <div
                      key={day}
                      className="aspect-square bg-white p-2 flex flex-col hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all text-sm cursor-pointer"
                    >
                      <div className="font-bold text-gray-700 text-xs mb-1">{day}</div>
                      <div className="flex-1 overflow-hidden space-y-0.5">
                        {(eventsByDay[day] || []).slice(0,3).map(e => (
                          <motion.div 
                            key={e.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`text-xs px-1.5 py-0.5 rounded font-semibold text-white truncate ${ownerColors[e.owner]}`} 
                            title={e.title}
                          >
                            {e.title}
                          </motion.div>
                        ))}
                        {(eventsByDay[day] || []).length > 3 && (
                          <div className="text-xs text-gray-500 px-1.5 font-semibold">+{(eventsByDay[day] || []).length - 3}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Events List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl p-8 shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Icons.Link className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {events.slice(0, 10).map((e, i) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-xl border-2 flex items-start justify-between gap-4 group hover:shadow-md transition-all ${
                          ownerColors[e.owner].replace('bg-', 'border-').replace('-500', '-300') + ' bg-gradient-to-br'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {e.title}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {new Date(e.date).toLocaleString()} • <OwnerBadge owner={e.owner} />
                          </div>
                          {e.note && <div className="text-xs text-gray-700 mt-2 italic">{e.note}</div>}
                        </div>
                        <motion.button 
                          onClick={() => removeEvent(e.id)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="px-3 py-2 rounded-lg bg-red-100 text-red-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {!events.length && <div className="text-center py-6 text-gray-500">No events scheduled yet</div>}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* LISTS TAB */}
          {tab==='lists' && (
            <motion.div
              key="lists"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-8 shadow-md border border-gray-200"
            >
              <div className="flex items-center gap-2 mb-6">
                <Icons.CheckCircle className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Tasks & To-Dos</h2>
              </div>
              
              <div className="flex gap-3 mb-6">
                <input 
                  value={taskTitle} 
                  onChange={e=>setTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                  className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1 placeholder-gray-500"
                  placeholder="Add a task..."
                />
                <motion.button 
                  onClick={addTask}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all"
                >
                  Add
                </motion.button>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {tasks.map((t, i) => (
                    <motion.label
                      key={t.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group border border-gray-100"
                    >
                      <input 
                        type="checkbox" 
                        checked={t.completed}
                        onChange={e=>toggleTask(t.id, e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-purple-500 cursor-pointer"
                      />
                      <span className={`flex-1 font-medium transition-all ${t.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
                        {t.title}
                      </span>
                      {t.completed && <span className="text-green-500 text-lg">✓</span>}
                    </motion.label>
                  ))}
                </AnimatePresence>
                {!tasks.length && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">📝</div>
                    <p>No tasks yet - add one to get started!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* GOALS TAB */}
          {tab==='goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Add Goal */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-md border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Icons.Target className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Add a New Goal</h2>
                </div>
                
                <form className="flex gap-3" onSubmit={addGoal}>
                  <input 
                    className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1 placeholder-gray-500" 
                    value={newGoal} 
                    onChange={e=>setNewGoal(e.target.value)} 
                    placeholder="What's your goal?"
                  />
                  <input 
                    className="px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-24 placeholder-gray-500" 
                    type="number" 
                    value={newTarget} 
                    onChange={e=>setNewTarget(e.target.value)} 
                    placeholder="Target"
                  />
                  <motion.button 
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transition-all"
                  >
                    Add
                  </motion.button>
                </form>
              </motion.div>

              {/* Goals List */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid md:grid-cols-2 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {goals.map((goal, i) => {
                    const progress = Math.min(100, (goal.progress / goal.target) * 100)
                    return (
                      <motion.div 
                        key={goal.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-md border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="font-bold text-gray-900 text-lg flex-1">{goal.title}</div>
                          <div className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            {goal.progress}/{goal.target}
                          </div>
                        </div>
                        
                        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          />
                        </div>

                        <div className="text-xs text-gray-600 flex items-center justify-between">
                          <span>{Math.round(progress)}% complete</span>
                          <span>{progress === 100 ? '🎉' : <Icons.Target className="w-4 h-4" />}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>

              {!goals.length && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Icons.Target className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-lg">No goals yet - set one to inspire each other!</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}