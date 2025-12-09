import { useMemo, useState } from 'react'
import Dialog from '../../components/ui/dialog.jsx'

export default function Memories({ open, onClose, memories }) {
  const [view, setView] = useState('grid')
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() => {
    if (filter === 'favorites') return memories.filter(m => m.favorite)
    if (filter === 'photos') return memories.filter(m => m.type === 'photo')
    if (filter === 'notes') return memories.filter(m => m.type === 'note')
    return memories
  }, [filter, memories])

  return (
    <Dialog open={open} onClose={onClose} title="Memories">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {['all','favorites','photos','notes'].map(f => (
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-xl ${filter===f?'bg-gradient-to-r from-slate-700 to-slate-500 text-white':'bg-gray-100'}`}>{f}</button>
          ))}
          <div className="ml-auto flex gap-2">
            <button onClick={()=>setView('grid')} className={`px-3 py-1 rounded-xl ${view==='grid'?'bg-gray-900 text-white':'bg-gray-100'}`}>Grid</button>
            <button onClick={()=>setView('timeline')} className={`px-3 py-1 rounded-xl ${view==='timeline'?'bg-gray-900 text-white':'bg-gray-100'}`}>Timeline</button>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(m => (
              <div key={m.id} className="glass-card p-2">
                <div className="text-xs text-gray-500 mb-1">{m.date || ''}</div>
                {m.url && <img src={m.url} alt="" className="rounded-lg" />}
                {m.content && <div className="text-sm mt-1">{m.content}</div>}
              </div>
            ))}
            {!filtered.length && (
              <div className="text-sm text-gray-500">No memories yet</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.sort((a,b)=> new Date(b.date||0)-new Date(a.date||0)).map(m => (
              <div key={m.id} className="glass-card p-3">
                <div className="text-xs text-gray-500">{m.date || ''}</div>
                <div className="font-semibold">{m.title || m.caption || 'Memory'}</div>
                {m.url && <img src={m.url} alt="" className="rounded-lg mt-2" />}
                {m.content && <p className="mt-2">{m.content}</p>}
              </div>
            ))}
            {!filtered.length && (
              <div className="text-sm text-gray-500">No memories yet</div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  )
}