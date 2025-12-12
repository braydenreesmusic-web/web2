import { useEffect, useState } from 'react'

export default function SchedulePresets({ current = {}, onApply, onActivate, activePresetId }) {
  const KEY = 'schedule_presets_v1'
  const [presets, setPresets] = useState([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [weekdays, setWeekdays] = useState([])
  const [quickTitle, setQuickTitle] = useState('')
  const [quickTime, setQuickTime] = useState('09:00')
  const [quickCategory, setQuickCategory] = useState('Other')
  const [quickOwner, setQuickOwner] = useState('together')
  const [quickNote, setQuickNote] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setPresets(JSON.parse(raw))
    } catch (e) {
      console.warn('load presets', e)
    }
  }, [])

  const persist = (next) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch (e) {
      console.warn('persist presets', e)
    }
  }

  const toggleWeekday = (d) => {
    setWeekdays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])
  }

  const savePreset = () => {
    const id = Date.now()
    const p = {
      id,
      name: name || `Preset ${new Date(id).toLocaleTimeString()}`,
      category: current.category || current.cat || 'Other',
      owner: current.owner || 'together',
      note: current.note || '',
      time: (current.date || '').slice(11,16) || '',
      weekdays: weekdays.sort()
    }
    const next = [p, ...presets]
    setPresets(next)
    persist(next)
    setSaving(false)
    setName('')
    setWeekdays([])
  }

  const deletePreset = (id) => {
    const next = presets.filter(p=>p.id!==id)
    setPresets(next)
    persist(next)
  }

  const apply = (p) => {
    if (onApply) onApply(p)
  }

  const activate = (p) => {
    if (onActivate) onActivate(p)
  }

  const activateQuick = () => {
    const p = {
      id: 'quick',
      name: quickTitle || 'Quick Event',
      category: quickCategory,
      owner: quickOwner,
      note: quickNote,
      time: quickTime,
      weekdays: []
    }
    if (onActivate) onActivate(p)
  }

  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="px-3 py-2 rounded-md border bg-white text-sm">Presets {presets.length>0 && <span className="ml-2 text-xs text-gray-500">{presets.length}</span>}</button>
      {open && (
        <div className="mt-2 p-3 w-[420px] bg-white border rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-3 mb-2">
            <select onChange={(e)=>{ const id = Number(e.target.value); const p = presets.find(x=>x.id===id); if(p) apply(p) }} defaultValue="" className="px-3 py-2 rounded-md border bg-white flex-1">
              <option value="">Apply preset…</option>
              {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={()=>setSaving(true)} className="px-3 py-2 rounded-md bg-slate-700 text-white">Save</button>
            <button onClick={()=>setOpen(false)} className="px-2 py-2 text-sm text-gray-500">Close</button>
          </div>

          {/* Quick preset inline inputs (non-persistent) */}
          <div className="mt-2 p-3 border rounded bg-white">
            <div className="flex gap-2 items-center mb-2">
              <input value={quickTitle} onChange={e=>setQuickTitle(e.target.value)} placeholder="Title (e.g. Work)" className="px-2 py-1 rounded border flex-1" />
              <input type="time" value={quickTime} onChange={e=>setQuickTime(e.target.value)} className="px-2 py-1 rounded border" />
            </div>
            <div className="flex gap-2 items-center mb-2">
              <select value={quickCategory} onChange={e=>setQuickCategory(e.target.value)} className="px-2 py-1 rounded border">
                <option>Other</option>
                <option>Work</option>
                <option>Together</option>
                <option>Anniversary</option>
              </select>
              <select value={quickOwner} onChange={e=>setQuickOwner(e.target.value)} className="px-2 py-1 rounded border">
                <option value="together">Together</option>
                <option value="hers">Hers</option>
                <option value="yours">Yours</option>
              </select>
              <input value={quickNote} onChange={e=>setQuickNote(e.target.value)} placeholder="Note" className="px-2 py-1 rounded border flex-1" />
            </div>
              <div className="flex gap-2">
              <button onClick={activateQuick} className="px-3 py-1 rounded bg-slate-700 text-white">Activate Quick</button>
              <button onClick={()=>{ setQuickTitle(''); setQuickNote(''); setQuickTime('09:00') }} className="px-3 py-1 rounded border">Clear</button>
            </div>
          </div>

          {saving && (
            <div className="flex items-center gap-2 mt-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Preset name" className="px-3 py-2 rounded-md border flex-1" />
              <div className="flex items-center gap-1 text-sm">
                {[1,2,3,4,5,6,0].map(d=> (
                  <button key={d} onClick={()=>toggleWeekday(d)} className={`px-2 py-1 rounded ${weekdays.includes(d)?'bg-slate-700 text-white':'border'}`}>{['S','M','T','W','T','F','S'][d]}</button>
                ))}
              </div>
              <button onClick={savePreset} className="px-3 py-2 rounded-md bg-slate-700 text-white">Save</button>
              <button onClick={()=>{ setSaving(false); setName(''); setWeekdays([]) }} className="px-3 py-2 rounded-md border">Cancel</button>
            </div>
          )}

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {presets.map(p => (
                <div key={p.id} className="px-3 py-1 rounded-full border bg-white flex items-center gap-2 text-sm">
                  <button onClick={()=>apply(p)} className="font-medium text-gray-800">{p.name}</button>
                  <button onClick={()=>activate(p)} className={`px-2 py-1 rounded ${activePresetId===p.id ? 'bg-slate-700 text-white' : 'border'}`}>{activePresetId===p.id ? 'Active' : 'Use'}</button>
                  <button onClick={()=>deletePreset(p.id)} className="text-red-500">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
