import { useEffect, useMemo, useState } from 'react'
import Dialog from '../../components/ui/dialog.jsx'

function randomPos(id) {
  // deterministic-ish using id
  const seed = (id * 9301 + 49297) % 233280
  return { x: (seed % 100) / 100, y: ((seed / 100) % 100) / 100 }
}

export default function MemoryConstellation({ open, onClose, memories }) {
  const [filter, setFilter] = useState('all')
  const [index, setIndex] = useState(0)
  const filtered = useMemo(() => {
    if (filter === 'favorites') return memories.filter(m => m.favorite)
    if (filter === 'photos') return memories.filter(m => m.type === 'photo')
    if (filter === 'notes') return memories.filter(m => m.type === 'note')
    return memories
  }, [filter, memories])
  useEffect(()=>{ setIndex(0) }, [filter])
  const next = () => setIndex((i)=> (i+1) % Math.max(filtered.length,1))
  const prev = () => setIndex((i)=> (i-1+Math.max(filtered.length,1)) % Math.max(filtered.length,1))

  return (
    <Dialog open={open} onClose={onClose} title="Memory Galaxy">
      <div className="space-y-3">
        <div className="flex gap-2">
          {['all','favorites','photos','notes'].map(f => (
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-xl ${filter===f?'bg-gradient-to-r from-pink-500 to-purple-500 text-white':'bg-gray-100'}`}>{f}</button>
          ))}
        </div>
        <div className="relative h-64 rounded-2xl overflow-hidden" style={{background:'radial-gradient(ellipse at center, rgba(20,10,40,1) 0%, rgba(10,5,20,1) 100%)'}}>
          {filtered.map(m => {
            const p = randomPos(m.id)
            return (
              <div key={m.id} title={m.title||m.caption}
                   style={{ left: `${p.x*100}%`, top: `${p.y*100}%`, transform: 'translate(-50%, -50%)' }}
                   className="absolute w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
            )
          })}
        </div>
        <div className="glass-card p-3">
          {filtered.length ? (
            <div>
              <div className="font-semibold">{filtered[index].title || filtered[index].caption || 'Memory'}</div>
              <div className="text-sm text-gray-500">{filtered[index].date || ''}</div>
              {filtered[index].url && <img src={filtered[index].url} alt="" className="rounded-xl mt-2"/>}
              {filtered[index].content && <p className="mt-2">{filtered[index].content}</p>}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No memories in this filter</div>
          )}
          <div className="flex justify-between mt-3">
            <button className="px-3 py-1 rounded-xl bg-gray-100" onClick={prev}>Prev</button>
            <button className="px-3 py-1 rounded-xl bg-gray-100" onClick={next}>Next</button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}