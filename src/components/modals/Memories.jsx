import { useMemo, useState } from 'react'
import Dialog from '../../components/ui/dialog.jsx'

export default function Memories({ open, onClose, memories }) {
  const [view, setView] = useState('grid')
  const [filter, setFilter] = useState('all')
  const filtered = useMemo(() => {
    // Exclude legacy/game invites (TICTACTOE_) that may have been stored in memories
    const cleaned = (memories || []).filter(m => !(m.content && typeof m.content === 'string' && m.content.startsWith('TICTACTOE_')))
    if (filter === 'favorites') return cleaned.filter(m => m.favorite)
    if (filter === 'photos') return cleaned.filter(m => m.type === 'photo')
    if (filter === 'notes') return cleaned.filter(m => m.type === 'note')
    return cleaned
  }, [filter, memories])

  return (
    <Dialog open={open} onClose={onClose} title="Memories">
      <div className="space-y-4">
        <div className="memories-header">
          <div>
            <div className="memories-title">Memories</div>
            <div className="memories-sub">A timeline of moments, photos and notes you want to keep</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex gap-2 bg-gray-50 rounded-full p-1">
              {['all','favorites','photos','notes'].map(f => (
                <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-full text-sm font-semibold ${filter===f?'bg-gradient-to-r from-slate-700 to-slate-500 text-white':'text-[var(--muted)] hover:bg-gray-100'}`}>{f}</button>
              ))}
            </div>
            <div className="inline-flex gap-2 bg-transparent rounded-full p-1">
              <button onClick={()=>setView('grid')} className={`px-3 py-1 rounded-full text-sm font-semibold ${view==='grid'?'bg-[var(--accent-700)] text-white':'text-[var(--muted)] hover:bg-gray-100'}`}>Grid</button>
              <button onClick={()=>setView('timeline')} className={`px-3 py-1 rounded-full text-sm font-semibold ${view==='timeline'?'bg-[var(--accent-700)] text-white':'text-[var(--muted)] hover:bg-gray-100'}`}>Timeline</button>
            </div>
          </div>
        </div>

        {view === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(m => (
              <div key={m.id} className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-transform transform hover:-translate-y-1 bg-white">
                <div className="text-xs text-gray-400 absolute top-3 left-3 bg-black/40 text-white px-2 py-1 rounded-md">{m.date || ''}</div>
                {m.url ? (
                  <img src={m.url} alt={m.caption || m.title || 'Memory'} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 flex items-center justify-center bg-gray-50">
                    <div className="text-sm text-gray-500 px-4">{m.content || m.caption || m.title || 'Memory'}</div>
                  </div>
                )}
                <div className="p-3">
                  <div className="text-sm font-semibold truncate">{m.caption || m.title || (m.content && (m.content.length > 80 ? m.content.slice(0,77) + '...' : m.content)) || 'Memory'}</div>
                  <div className="text-xs text-gray-400 mt-1">{m.type}</div>
                </div>
              </div>
            ))}
            {!filtered.length && (
              <div className="text-sm text-gray-500">No memories yet</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
              {filtered.sort((a,b)=> new Date(b.date||0)-new Date(a.date||0)).map(m => (
                <div key={m.id} className="flex items-start gap-4 mb-4">
                  <div className="w-3 h-3 rounded-full bg-white border border-gray-300 -mt-1" />
                  <div>
                    <div className="text-xs text-gray-400">{m.date || ''}</div>
                    <div className="font-semibold">{m.title || m.caption || 'Memory'}</div>
                    {m.url && <img src={m.url} alt="" className="rounded-lg mt-2 max-h-56 object-cover" />}
                    {m.content && <p className="mt-2 text-sm text-gray-700">{m.content}</p>}
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <div className="text-sm text-gray-500">No memories yet</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}