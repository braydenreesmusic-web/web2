import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBookmarks, createBookmark, updateBookmark, deleteBookmark, bulkUpdateBookmarkOrder } from '../services/api'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { motion, AnimatePresence } from 'framer-motion'

const cats = ['All','Restaurants','Movies/Shows','Date Ideas','Gift Ideas','Places to Visit','Other']

export default function Bookmarks() {
  const { user } = useAuth()
  const [cat, setCat] = useState('All')
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('Other')

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try { setItems(await getBookmarks(user.id) || []) } catch (e) { console.error(e) }
    })()
  }, [user])

  const filtered = items.filter(b=> cat==='All' || b.category===cat)

  const add = async () => {
    if (!title.trim()) return
    const data = { user_id: user.id, title: title.trim(), url, category, visited: false }
    try {
      const saved = await createBookmark(data)
      setItems(prev => [saved, ...prev])
      setTitle(''); setUrl(''); setCategory('Other')
    } catch (e) { console.error(e) }
  }

  const markVisited = async (id) => {
    try { 
      await updateBookmark(id, { visited: true })
      setItems(prev => prev.map(b => b.id === id ? { ...b, visited: true } : b))
    } catch (e) { console.error(e) }
  }

  const remove = async (id) => {
    try {
      await deleteBookmark(id)
      setItems(prev => prev.filter(b => b.id !== id))
    } catch (e) { console.error(e) }
  }

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  // Drag & drop reordering (react-friendly via react-beautiful-dnd). If your bookmarks table
  // has an `order` integer column this will attempt to persist it; otherwise order is local.
  const onDragEnd = async (result) => {
    if (!result.destination) return
    const from = result.source.index
    const to = result.destination.index
    if (from === to) return
    const next = Array.from(items)
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setItems(next)

    // best-effort persist order via a single bulk upsert (more efficient)
    try {
      const payload = next.map((b, i) => ({ id: b.id, order: i }))
      await bulkUpdateBookmarkOrder(payload)
    } catch (e) {
      // fallback: try per-item updates if bulk fails (best-effort)
      try {
        await Promise.all(next.map((b, i) => {
          if (b.order !== i) return updateBookmark(b.id, { order: i }).catch(()=>null)
          return Promise.resolve(null)
        }))
      } catch (err) {
        console.error('Failed to persist bookmark order', err)
      }
    }
  }
  return (
    <section className="space-y-6">
      <div className="flex gap-2 overflow-auto">
        {cats.map(c=> (
          <button key={c} onClick={()=>setCat(c)} className={`px-3 py-2 rounded-xl ${cat===c?'bg-gradient-to-r from-pink-500 to-purple-500 text-white':'bg-gray-100'}`}>{c}</button>
        ))}
      </div>
      <div className="glass-card p-4 grid md:grid-cols-4 gap-2">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="px-3 py-2 rounded-xl border md:col-span-1 col-span-2"/>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://" className="px-3 py-2 rounded-xl border md:col-span-2 col-span-2"/>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="px-3 py-2 rounded-xl border">
          {cats.filter(c=>c!=='All').map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={add} className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white">Add</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="bookmarks-list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="grid md:grid-cols-2 gap-4">
              {filtered.map((b, idx)=> {
          let favicon = ''
          try { favicon = b.url ? `https://www.google.com/s2/favicons?sz=64&domain=${new URL(b.url).hostname}` : '' } catch (e) { favicon = '' }
          // thumbnail (best-effort) from thum.io; fallback to favicon
          const thumb = b.url ? `https://image.thum.io/get/width/600/crop/320/${encodeURIComponent(b.url)}` : null

          return (
            <Draggable key={b.id} draggableId={`${b.id}`} index={idx}>
              {(provided, snapshot) => (
                <motion.div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  layout
                  className={`glass-card p-4 transition-shadow relative ${snapshot.isDragging ? 'shadow-2xl' : ''}`}
                >
              <div className="flex items-start gap-3">
                <div className="w-24 h-16 rounded-md overflow-hidden bg-gray-50 flex-shrink-0">
                  {thumb ? <img src={thumb} alt="thumb" className="w-full h-full object-cover" onError={(e)=>{e.target.src=favicon}} /> : <img src={favicon} alt="favicon" className="w-10 h-10 rounded-md" onError={(e)=>e.target.style.display='none'} />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg truncate">{b.title}</div>
                  <div className="text-sm text-gray-500 truncate">{b.url}</div>
                </div>
                <div className="ml-2 text-right">
                  <div className="text-xs text-gray-400">{b.category}</div>
                  {b.visited ? <div className="text-xs text-green-600">Visited</div> : <div className="text-xs text-yellow-600">New</div>}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <a href={b.url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-purple-50 text-purple-600">Open</a>
                <button onClick={()=>copyLink(b.url)} className="px-3 py-2 rounded-lg bg-gray-100">Copy</button>
                {!b.visited && <button onClick={()=>markVisited(b.id)} className="px-3 py-2 rounded-lg bg-gradient-to-r from-green-400 to-teal-400 text-white">Mark visited</button>}
                <button onClick={()=>remove(b.id)} className="ml-auto px-3 py-2 rounded-lg bg-red-100 text-red-600">Delete</button>
              </div>
                </motion.div>
              )}
            </Draggable>
          )
        })}
        {provided.placeholder}
      </div>
          )}
        </Droppable>
      </DragDropContext>
    </section>
  )
}