import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBookmarks, createBookmark, updateBookmark, deleteBookmark, bulkUpdateBookmarkOrder } from '../services/api'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { motion, AnimatePresence } from 'framer-motion'
import { Icons, IconButton, CategoryBadge } from '../components/Icons'

const cats = ['All','Restaurants','Movies/Shows','Date Ideas','Gift Ideas','Places to Visit','Other']

export default function Bookmarks() {
  const { user } = useAuth()
  const [cat, setCat] = useState('All')
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('Other')
  const [thumbnail, setThumbnail] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showThumbnailModal, setShowThumbnailModal] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try { setItems(await getBookmarks(user.id) || []) } catch (e) { console.error(e) }
    })()
  }, [user])

  const filtered = items.filter(b=> cat==='All' || b.category===cat)

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setThumbnail(file)
      const reader = new FileReader()
      reader.onload = (ev) => setThumbnailPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  const add = async () => {
    if (!title.trim()) return
    const data = { 
      user_id: user.id, 
      title: title.trim(), 
      url, 
      category, 
      visited: false,
      custom_thumbnail: thumbnailPreview || null
    }
    try {
      const saved = await createBookmark(data)
      setItems(prev => [saved, ...prev])
      setTitle(''); setUrl(''); setCategory('Other'); setThumbnail(null); setThumbnailPreview('')
      alert('Bookmark saved!')
    } catch (e) { 
      console.error('Error creating bookmark:', e)
      alert(`Failed to save bookmark: ${e.message || 'Unknown error'}`)
    }
  }

  const updateThumbnail = async (id, newThumbnail) => {
    try {
      await updateBookmark(id, { custom_thumbnail: newThumbnail })
      setItems(prev => prev.map(b => b.id === id ? { ...b, custom_thumbnail: newThumbnail } : b))
      setEditingId(null); setShowThumbnailModal(false); setThumbnail(null); setThumbnailPreview('')
      alert('Thumbnail updated!')
    } catch (e) { 
      console.error('Error updating thumbnail:', e)
      alert(`Failed to update thumbnail: ${e.message || 'Unknown error'}`)
    }
  }

  const markVisited = async (id) => {
    try { 
      await updateBookmark(id, { visited: true })
      setItems(prev => prev.map(b => b.id === id ? { ...b, visited: true } : b))
    } catch (e) { 
      console.error('Error marking visited:', e)
      alert(`Failed to mark visited: ${e.message || 'Unknown error'}`)
    }
  }

  const remove = async (id) => {
    try {
      const deleted = await deleteBookmark(id)
      if (!deleted) {
        // Deletion didn't return a deleted row — refetch to show current state and surface an error
        const refreshed = await getBookmarks(user.id)
        setItems(refreshed || [])
        alert('Failed to delete bookmark (no confirmation). Check permissions.')
        return
      }
      // Success — refresh authoritative list
      const refreshed = await getBookmarks(user.id)
      setItems(refreshed || [])
      alert('Bookmark deleted!')
    } catch (e) {
      // Surface detailed error info for RLS/permission issues
      console.error('Error deleting bookmark:', e)
      let body = ''
      try { body = JSON.stringify(e, Object.getOwnPropertyNames(e), 2) } catch (_) { body = String(e) }
      alert(`Failed to delete bookmark. Error: ${e?.message || e?.error || ''}\nDetails: ${body}`)
      // refetch to ensure UI matches DB
      try { const refreshed = await getBookmarks(user.id); setItems(refreshed || []) } catch (_err) { /* ignore */ }
    }
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
    <section className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Icons.Bookmark className="w-8 h-8 text-slate-600" />
          <h1 className="text-4xl font-bold text-gray-900">Saved Bookmarks</h1>
        </div>
        <p className="text-gray-600">Organize and save your favorite places, ideas, and inspiration</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {cats.map(c=> (
          <motion.button 
            key={c} 
            onClick={()=>setCat(c)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
              cat===c
                ? 'bg-gradient-to-r from-slate-700 to-slate-500 text-white shadow-lg' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {c}
          </motion.button>
        ))}
      </div>

      {/* Add Bookmark Form */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200"
      >
        <div className="flex items-center gap-2 mb-4">
          <Icons.Add className="w-6 h-6 text-slate-600" />
          <h2 className="text-xl font-semibold text-gray-900">Add New Bookmark</h2>
        </div>
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <input 
              value={title} 
              onChange={e=>setTitle(e.target.value)} 
              placeholder="Bookmark title" 
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 text-gray-900 placeholder-gray-500"
            />
            <input 
              value={url} 
              onChange={e=>setUrl(e.target.value)} 
              placeholder="https://example.com" 
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 text-gray-900 placeholder-gray-500 md:col-span-2"
            />
            <select 
              value={category} 
              onChange={e=>setCategory(e.target.value)} 
              className="px-4 py-3 rounded-lg border border-gray-300 bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 text-gray-900"
            >
              {cats.filter(c=>c!=='All').map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="flex gap-3">
            <label className="flex-1 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-slate-600 cursor-pointer transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-slate-600">
              <Icons.Image className="w-4 h-4" />
              <span>Add thumbnail</span>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleThumbnailUpload} 
                className="hidden"
              />
            </label>
            <motion.button 
              onClick={add}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-slate-700 to-slate-500 text-white font-semibold hover:shadow-lg transition-all"
            >
              Save Bookmark
            </motion.button>
          </div>

          {thumbnailPreview && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-600"
            >
              <img src={thumbnailPreview} alt="preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => { setThumbnail(null); setThumbnailPreview('') }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600"
              >
                ✕
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Bookmarks Grid */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="bookmarks-list">
          {(provided) => (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps} 
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((b, idx)=> {
                  let favicon = ''
                  try { 
                    favicon = b.url ? `https://www.google.com/s2/favicons?sz=64&domain=${new URL(b.url).hostname}` : '' 
                  } catch (e) { favicon = '' }
                  
                  // Use custom thumbnail if available, otherwise thum.io
                  const thumb = b.custom_thumbnail || (b.url ? `https://image.thum.io/get/width/600/crop/400/${encodeURIComponent(b.url)}` : null)

                  return (
                    <Draggable key={b.id} draggableId={`${b.id}`} index={idx}>
                      {(provided, snapshot) => (
                        <motion.div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => { if (b.url) window.open(b.url, '_blank', 'noopener'); }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (b.url) window.open(b.url, '_blank', 'noopener'); } }}
                          className={`cursor-pointer relative group rounded-2xl overflow-hidden transition-all h-full
                            ${snapshot.isDragging 
                              ? 'shadow-2xl ring-2 ring-slate-600 scale-105' 
                              : 'shadow-md hover:shadow-xl hover:-translate-y-1'
                            }
                          `}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          layout
                        >
                          {/* Thumbnail Background */}
                          <div className="absolute inset-0 bg-gray-100">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt="thumb"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  try {
                                    const img = e.target;
                                    // prevent infinite onerror loop
                                    img.onerror = null;
                                    const fallback = b?.url
                                      ? `https://image.thum.io/get/width/600/crop/400/${encodeURIComponent(b.url)}`
                                      : (favicon || '/fallback-thumbnail.png');
                                    if (img.src !== fallback) img.src = fallback;
                                  } catch (_err) {
                                    e.target.style.display = 'none';
                                  }
                                }}
                              />
                            ) : null}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-100 transition-opacity"></div>
                          </div>

                          {/* Content Overlay (transparent so thumbnail remains visible) */}
                          <div className="relative h-full flex flex-col p-4">
                            {/* Drag Handle */}
                            <div 
                              {...provided.dragHandleProps}
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-200 mb-2 text-lg cursor-grab active:cursor-grabbing flex justify-center"
                            >
                              <Icons.Drag className="w-4 h-4" />
                            </div>

                            <div className="flex-1">
                              <h3 className="font-bold text-white line-clamp-2 mb-1">{b.title}</h3>
                              <p className="text-xs text-gray-200 line-clamp-1">{b.url}</p>
                            </div>

                            {/* Tags */}
                            <div className="flex gap-2 mb-3 flex-wrap">
                              <CategoryBadge category={b.category} />
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                b.visited 
                                  ? 'bg-slate-50 text-slate-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {b.visited ? (
                                  <>
                                    <Icons.CheckBadge className="w-3.5 h-3.5" />
                                    Visited
                                  </>
                                ) : (
                                  <>
                                    <Icons.Star className="w-3.5 h-3.5" />
                                    New
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <motion.button 
                                onClick={(e) => { e.stopPropagation(); copyLink(b.url) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-all"
                                title="Copy link"
                              >
                                <Icons.Copy className="w-4 h-4" />
                              </motion.button>
                            </div>

                            {/* More Actions */}
                            <div className="flex gap-2 mt-2">
                              {!b.visited && (
                                <motion.button 
                                  onClick={(e) => { e.stopPropagation(); markVisited(b.id) }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex-1 px-2 py-1.5 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-1"
                                >
                                  <Icons.Eye className="w-3.5 h-3.5" />
                                  Visited
                                </motion.button>
                              )}
                              <motion.button 
                                onClick={(e) => { e.stopPropagation(); setEditingId(b.id); setShowThumbnailModal(true) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium hover:bg-blue-200 transition-all flex items-center justify-center gap-1"
                              >
                                <Icons.Image className="w-3.5 h-3.5" />
                                Thumb
                              </motion.button>
                              <motion.button 
                                onClick={(e) => { e.stopPropagation(); remove(b.id) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200 transition-all"
                              >
                                <Icons.Trash className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Empty State */}
      {filtered.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Icons.Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No bookmarks yet in this category</p>
          <p className="text-gray-400 text-sm">Add one above to get started</p>
        </motion.div>
      )}

      {/* Thumbnail Modal */}
      <AnimatePresence>
        {showThumbnailModal && editingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowThumbnailModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Icons.Image className="w-6 h-6 text-slate-600" />
                <h3 className="text-xl font-bold text-gray-900">Change Thumbnail</h3>
              </div>
              
              <label className="block w-full px-4 py-8 rounded-lg border-2 border-dashed border-gray-300 hover:border-slate-600 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-slate-600 mb-4">
                <Icons.Image className="w-8 h-8" />
                <span className="font-medium">Click to upload or drag</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleThumbnailUpload} 
                  className="hidden"
                />
              </label>

              {thumbnailPreview && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 rounded-lg overflow-hidden border-2 border-slate-600"
                >
                  <img src={thumbnailPreview} alt="preview" className="w-full h-auto" />
                </motion.div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowThumbnailModal(false); setThumbnail(null); setThumbnailPreview('') }}
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-100 text-gray-900 font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => updateThumbnail(editingId, thumbnailPreview)}
                  disabled={!thumbnailPreview}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-slate-700 to-slate-500 text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}