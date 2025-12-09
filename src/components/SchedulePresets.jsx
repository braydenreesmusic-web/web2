import { useEffect, useState } from 'react'

export default function SchedulePresets({ current = {}, onApply, onActivate, activePresetId }) {
  const KEY = 'schedule_presets_v1'
  const [presets, setPresets] = useState([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [weekdays, setWeekdays] = useState([])

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select onChange={(e)=>{ const id = Number(e.target.value); const p = presets.find(x=>x.id===id); if(p) apply(p) }} defaultValue="" className="px-3 py-2 rounded-xl border bg-white">
          <option value="">Apply preset…</option>
          {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={()=>setSaving(true)} className="px-3 py-2 rounded-xl bg-slate-700 text-white">Save as preset</button>
        <div className="text-sm text-gray-500">Templates for quick event setup</div>
      </div>

      {saving && (
        <div className="flex items-center gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Preset name" className="px-3 py-2 rounded-xl border flex-1" />
          <div className="flex items-center gap-1 text-sm">
            {[1,2,3,4,5,6,0].map(d=> (
              <button key={d} onClick={()=>toggleWeekday(d)} className={`px-2 py-1 rounded ${weekdays.includes(d)?'bg-slate-700 text-white':'border'}`}>{['S','M','T','W','T','F','S'][d]}</button>
            ))}
          </div>
          <button onClick={savePreset} className="px-3 py-2 rounded-xl bg-green-600 text-white">Save</button>
          <button onClick={()=>{ setSaving(false); setName(''); setWeekdays([]) }} className="px-3 py-2 rounded-xl border">Cancel</button>
        </div>
      )}

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <div key={p.id} className="px-3 py-1 rounded-full border bg-white flex items-center gap-2 text-sm">
              <button onClick={()=>apply(p)} className="font-medium text-gray-800">{p.name}</button>
              <button onClick={()=>activate(p)} className={`px-2 py-1 rounded ${activePresetId===p.id ? 'bg-slate-700 text-white' : 'border'}`}>{activePresetId===p.id ? 'Active' : 'Use on calendar'}</button>
              <button onClick={()=>deletePreset(p.id)} className="text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
