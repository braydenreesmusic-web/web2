import { useEffect, useRef, useState } from 'react'
import Dialog from '../components/ui/dialog.jsx'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import EmptyState from '../components/EmptyState'
import MusicTab from '../components/MusicTab'
import { Camera, Sparkles, Heart, Search } from 'lucide-react'

export default function Media() {
  const [tab, setTab] = useState('photos')
  const [open, setOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [newNote, setNewNote] = useState('')
  const [caption, setCaption] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef(null)
  const videoInput = useRef(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [sort, setSort] = useState('newest')
  const tabs = ['photos', 'videos', 'notes', 'music']

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const api = await import('../services/api')
        const [nt, ph, vd] = await Promise.all([
          api.getNotes(user.id),
          api.getMedia(user.id, 'photo'),
          api.getMedia(user.id, 'video')
        ])
        if (cancelled) return
        setNotes(nt || [])
        setPhotos(ph || [])
        setVideos(vd || [])
      } catch (e) {
        console.error('Load media failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const generateAIDescription = async () => {
    setLoadingAI(true)
    try {
      const descriptions = [
        "A beautiful moment frozen in time 📸✨",
        "Pure magic captured in pixels 💫",
        "This memory makes my heart smile 💕",
        "Love looks good on you two 💖",
        "Creating memories, one photo at a time 🌟",
      ]
      const random = descriptions[Math.floor(Math.random() * descriptions.length)]
      setAiDescription(random)
    } catch (err) {
      console.error(err)
      setAiDescription("Couldn't generate description")
    } finally {
      setLoadingAI(false)
    }
  }

  const addNote = async () => {
    if (!newNote.trim() || !user) return
    const note = {
      user_id: user.id,
      author: user.user_metadata?.name || user.email,
      content: newNote.trim(),
      date: new Date().toISOString().slice(0,10)
    }
    setNotes(prev => [{ ...note, id: Math.random() }, ...prev])
    setNewNote('')
    setOpen(false)
    try {
      const api = await import('../services/api')
      await api.createNote(note)
    } catch (e) { console.error(e) }
  }

  const onSelectPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const api = await import('../services/api')
      const saved = await api.uploadMedia(file, {
        user_id: user.id,
        type: 'photo',
        caption: '',
        date: new Date().toISOString().slice(0,10),
        favorite: false
      })
      setPhotos(prev => [saved, ...prev])
    } catch (err) {
      console.error('Upload failed', err)
      const msg = err.message || 'Unknown error'
      if (msg.includes('row-level security') || msg.includes('policy')) {
        alert('⚠️ Database permission error!\n\nRun fix-media-rls.sql in your Supabase SQL Editor:\n1. Go to Supabase Dashboard\n2. SQL Editor\n3. Copy contents of fix-media-rls.sql\n4. Run it\n\nError: ' + msg)
      } else {
        alert('Failed to upload photo: ' + msg)
      }
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const onSelectVideo = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    try {
      const api = await import('../services/api')
      const saved = await api.uploadMedia(file, {
        user_id: user.id,
        type: 'video',
        caption: '',
        date: new Date().toISOString().slice(0,10),
        favorite: false
      })
      setVideos(prev => [saved, ...prev])
    } catch (err) {
      console.error('Video upload failed', err)
      const msg = err.message || 'Unknown error'
      if (msg.includes('row-level security') || msg.includes('policy')) {
        alert('⚠️ Database permission error!\n\nRun fix-media-rls.sql in your Supabase SQL Editor:\n1. Go to Supabase Dashboard\n2. SQL Editor\n3. Copy contents of fix-media-rls.sql\n4. Run it\n\nError: ' + msg)
      } else {
        alert('Failed to upload video: ' + msg)
      }
    } finally {
      if (videoInput.current) videoInput.current.value = ''
    }
  }

  const updatePhotoCaption = async (photoId, newCaption) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: newCaption } : p))
    try {
      const api = await import('../services/api')
      await api.updateMedia(photoId, { caption: newCaption })
    } catch (e) {
      console.error('Failed to persist caption', e)
    }
  }

  const toggleFavorite = async (photoId) => {
    // optimistic UI
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, favorite: !p.favorite } : p))
    setSelectedPhoto(prev => prev && prev.id === photoId ? { ...prev, favorite: !(prev.favorite) } : prev)
    try {
      const cur = photos.find(p => p.id === photoId)
      const newFav = !(cur && cur.favorite)
      const api = await import('../services/api')
      await api.toggleMediaFavorite(photoId, newFav)
    } catch (e) {
      console.error('toggleFavorite failed', e)
      // revert on error
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, favorite: !(p.favorite) } : p))
      setSelectedPhoto(prev => prev && prev.id === photoId ? { ...prev, favorite: !(prev.favorite) } : prev)
    }
  }

  // keyboard navigation in dialog (left/right to move between photos, escape to close)
  useEffect(() => {
    if (!selectedPhoto) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null)
        setCaption('')
        setAiDescription('')
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const idx = filteredPhotos.findIndex(x => x.id === selectedPhoto.id)
        if (idx === -1) return
        if (e.key === 'ArrowLeft' && idx > 0) {
          const prev = filteredPhotos[idx - 1]
          setSelectedPhoto(prev)
          setCaption(prev.caption || '')
        }
        if (e.key === 'ArrowRight' && idx < filteredPhotos.length - 1) {
          const nxt = filteredPhotos[idx + 1]
          setSelectedPhoto(nxt)
          setCaption(nxt.caption || '')
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedPhoto, filteredPhotos])

  const downloadPhoto = (url) => {
    const el = document.createElement('a')
    el.href = url
    el.download = `photo-${Date.now()}.jpg`
    document.body.appendChild(el)
    el.click()
    el.remove()
  }

  const filteredPhotos = photos
    .filter(p => (!onlyFavorites || p.favorite))
    .filter(p => (!query || (p.caption || '').toLowerCase().includes(query.toLowerCase())))
    .sort((a,b) => {
      if (sort === 'newest') return new Date(b.date) - new Date(a.date)
      if (sort === 'oldest') return new Date(a.date) - new Date(b.date)
      return 0
    })

  return (
    <section className="space-y-6 pb-6">
      {/* Tabs */}
      <div className="glass-card p-1.5 rounded-2xl">
        <div className="grid grid-cols-4 gap-1.5">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-3 rounded-xl font-semibold text-sm capitalize transition-all ${tab === t ? 'text-white' : 'bg-transparent text-gray-600 hover:bg-gray-100'}`}
              style={ tab === t ? { background: 'linear-gradient(90deg, #334155, #64748b)', boxShadow: 'var(--elev-1)' } : {} }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

        {/* Photos Tab — toolbar + full-width grid */}
        {tab === 'photos' && (
          <div className="space-y-4">
            <input ref={fileInput} type="file" accept="image/*" onChange={onSelectPhoto} className="hidden" />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => fileInput.current?.click()} disabled={uploading} className="flex items-center gap-2" variant="solid">
                <Camera size={16} />
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>

              <div className="flex-1 min-w-[180px] max-w-xl">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    placeholder="Search captions"
                    className="input flex-1"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={() => setOnlyFavorites(prev => !prev)}
                className={`px-3 py-1 rounded-md font-semibold ${onlyFavorites ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                aria-pressed={onlyFavorites}
              >
                <Heart className="w-4 h-4 inline" /> <span className="ml-2 text-sm">Favorites</span>
              </button>

              <select className="input w-40" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>

              <div className="ml-auto text-sm muted">{filteredPhotos.length} photos</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map(p => (
                <div key={p.id} className="relative photo-card overflow-hidden rounded-xl">
                  <button onClick={() => { setSelectedPhoto(p); setCaption(p.caption || '') }} className="block w-full p-0 border-0">
                    <img src={p.url} alt={p.caption || 'Photo'} className="w-full h-56 object-cover" />
                  </button>

                  <div className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.caption || 'No caption'}</div>
                      <div className="text-xs muted mt-1">{p.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleFavorite(p.id)} aria-label="favorite" className={`p-2 rounded ${p.favorite ? 'text-red-600' : 'text-gray-500'}`}>
                        ❤
                      </button>
                      <button onClick={() => downloadPhoto(p.url)} aria-label="download" className="p-2 rounded text-gray-500">↓</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {photos.length === 0 && !loading && (
              <div className="text-center py-12 glass-card rounded-2xl">
                <Camera size={48} className="mx-auto text-gray-300 mb-4" />
                <EmptyState title="No photos" description="Upload photos to preserve memories here." action={<button className="btn">Upload Photo</button>} />
              </div>
            )}
          </div>
        )}

      {/* Videos Tab */}
      {tab === 'videos' && (
        <div className="space-y-4">
          <input ref={videoInput} type="file" accept="video/*" onChange={onSelectVideo} className="hidden" />
          <Button onClick={() => videoInput.current?.click()} className="w-full btn flex items-center justify-center gap-2 py-3">
            <Camera size={20} />
            Add Video
          </Button>

          <div className="grid grid-cols-1 gap-4">
            {videos.map(v => (
              <div key={v.id} className="glass-card p-3 rounded-2xl">
                <video src={v.url} controls className="w-full rounded-xl" />
                {v.caption && <p className="mt-2 text-sm text-gray-600">{v.caption}</p>}
              </div>
            ))}
          </div>

          {videos.length === 0 && !loading && (
            <div className="text-center py-12 glass-card rounded-2xl">
              <Camera size={48} className="mx-auto text-gray-300 mb-4" />
              <EmptyState title="No videos" description="You haven't added any videos yet." action={<button className="btn">Upload Video</button>} />
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div className="space-y-3">
          {notes.length === 0 && !loading && (
            <div className="text-center py-12 glass-card rounded-2xl">
              <EmptyState title="No notes" description="Write a note to capture thoughts or moments." action={<button className="btn">New Note</button>} />
              <Button onClick={() => setOpen(true)} className="btn">✍️ Write First Note</Button>
            </div>
          )}
          {notes.map(n => (
            <div key={n.id} className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-2">{n.author} • {n.date}</div>
              <div className="text-gray-800">{n.content}</div>
            </div>
          ))}
          {notes.length > 0 && (
            <Button onClick={() => setOpen(true)} className="w-full btn">+ Add Note</Button>
          )}
        </div>
      )}

      {/* Music Tab */}
      {tab === 'music' && <MusicTab user={user} />}

      {/* Add Note Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title="Add Note">
        <div className="space-y-3">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition"
            rows={6}
            placeholder="Write something sweet…"
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)} className="bg-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={addNote} className="btn">
              Save Note
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Photo Detail Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onClose={() => {setSelectedPhoto(null); setAiDescription(''); setCaption('')}} title="Photo Details">
          <div className="space-y-4">
            <div className="w-full flex items-center justify-center">
              <img src={selectedPhoto.url} alt="Full size" className="max-h-[60vh] w-auto rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Caption</label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="input"
              />
            </div>

            <Button
              onClick={generateAIDescription}
              disabled={loadingAI}
              className="w-full btn flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {loadingAI ? 'Generating...' : '✨ Get AI Description'}
            </Button>

            {aiDescription && (
              <div className="p-4 rounded-xl border" style={{background: 'linear-gradient(180deg, #f7f8f9, var(--card))', borderColor: 'var(--border)'}}>
                <p className="text-sm" style={{color: 'var(--text)'}}>{aiDescription}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  // prev
                  const idx = filteredPhotos.findIndex(x => x.id === selectedPhoto.id)
                  if (idx > 0) {
                    const prev = filteredPhotos[idx - 1]
                    setSelectedPhoto(prev)
                    setCaption(prev.caption || '')
                    return
                  }
                }}
                className="px-3 py-2 rounded bg-gray-100"
                aria-label="Previous photo"
              >◀</button>

              <Button
                onClick={async () => {
                  // save caption
                  updatePhotoCaption(selectedPhoto.id, caption)
                  setAiDescription('')
                }}
                className="flex-1 btn"
              >
                Save Caption
              </Button>

              <button
                onClick={async () => {
                  // next
                  const idx = filteredPhotos.findIndex(x => x.id === selectedPhoto.id)
                  if (idx >= 0 && idx < filteredPhotos.length - 1) {
                    const nxt = filteredPhotos[idx + 1]
                    setSelectedPhoto(nxt)
                    setCaption(nxt.caption || '')
                  }
                }}
                className="px-3 py-2 rounded bg-gray-100"
                aria-label="Next photo"
              >▶</button>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => toggleFavorite(selectedPhoto.id)}
                className={`px-3 py-2 rounded ${selectedPhoto.favorite ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
              >
                {selectedPhoto.favorite ? '♥ Favorited' : '♡ Favorite'}
              </button>
              <Button onClick={() => downloadPhoto(selectedPhoto.url)} className="flex-1">Download</Button>
              <Button onClick={() => { setSelectedPhoto(null); setCaption(''); setAiDescription('') }} className="bg-gray-200 text-gray-700">Close</Button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  )
}