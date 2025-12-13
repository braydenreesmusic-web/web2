import { useEffect, useRef, useState } from 'react'
import Dialog from '../components/ui/dialog.jsx'
import Button from '../components/ui/button.jsx'
import Input from '../components/ui/input'
import { useAuth } from '../contexts/AuthContext'
import EmptyState from '../components/EmptyState'
import { getNotes, createNote, getMedia, uploadMedia } from '../services/api'
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
        const [nt, ph, vd] = await Promise.all([
          getNotes(user.id),
          getMedia(user.id, 'photo'),
          getMedia(user.id, 'video')
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
    try { await createNote(note) } catch (e) { console.error(e) }
  }

  const onSelectPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const saved = await uploadMedia(file, {
        user_id: user.id,
        type: 'photo',
        caption: '',
        date: new Date().toISOString().slice(0,10),
        favorite: false
      import { useEffect, useRef, useState } from 'react'
      import Dialog from '../components/ui/dialog.jsx'
      import Button from '../components/ui/button.jsx'
      import { useAuth } from '../contexts/AuthContext'
      import EmptyState from '../components/EmptyState'
      import { getNotes, createNote, getMedia, uploadMedia } from '../services/api'
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
              const [nt, ph, vd] = await Promise.all([
                getNotes(user.id),
                getMedia(user.id, 'photo'),
                getMedia(user.id, 'video')
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
          try { await createNote(note) } catch (e) { console.error(e) }
        }

        const onSelectPhoto = async (e) => {
          const file = e.target.files?.[0]
          if (!file || !user) return
          setUploading(true)
          try {
            const saved = await uploadMedia(file, {
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
            const saved = await uploadMedia(file, {
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
        }

        const toggleFavorite = (photoId) => {
          setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, favorite: !p.favorite } : p))
        }

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

            {/* Photos Tab - Polaroid Style */}
            {tab === 'photos' && (
              <div className="space-y-4">
                <input ref={fileInput} type="file" accept="image/*" onChange={onSelectPhoto} className="hidden" />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Button onClick={() => fileInput.current?.click()} disabled={uploading} className="w-full btn flex items-center justify-center gap-2 py-3">
                      <Camera size={20} />
                      {uploading ? 'Uploading...' : 'Add Photo'}
                    </Button>

                    <div className="mt-3 p-3 bg-white rounded-lg shadow">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input placeholder="Search captions" className="input flex-1" value={query} onChange={e=>setQuery(e.target.value)} />
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button className={`px-3 py-1 rounded ${onlyFavorites ? 'bg-red-600 text-white' : 'bg-gray-100'}`} onClick={()=>setOnlyFavorites(prev=>!prev)}>
                          <Heart className="w-4 h-4 inline" /> <span className="ml-2 text-sm">Favorites</span>
                        </button>
                        <select className="input w-36" value={sort} onChange={e=>setSort(e.target.value)}>
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                        </select>
                        <div className="ml-auto text-sm text-gray-500">{filteredPhotos.length} photos</div>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                      {filteredPhotos.map(p => (
                        <div key={p.id} className="relative bg-white p-2 rounded-lg shadow">
                          <img src={p.url} alt={p.caption || 'Photo'} className="w-full aspect-square object-cover rounded cursor-pointer" onClick={() => {setSelectedPhoto(p); setCaption(p.caption || '')}} />
                          <div className="mt-2 flex items-start gap-2">
                            <div className="flex-1">
                              <input className="input text-sm" value={p.caption || ''} onChange={e=>updatePhotoCaption(p.id, e.target.value)} placeholder="Add a caption..." />
                              <div className="text-xs text-gray-400 mt-1">{p.date}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <button onClick={()=>toggleFavorite(p.id)} className={`p-2 rounded ${p.favorite ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`} aria-label="favorite">
                                <Heart className="w-4 h-4" />
                              </button>
                              <button onClick={()=>downloadPhoto(p.url)} className="p-2 rounded bg-gray-100 text-gray-600" aria-label="download">↓</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <img src={selectedPhoto.url} alt="Full size" className="w-full rounded-xl" />

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

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        updatePhotoCaption(selectedPhoto.id, caption)
                        setSelectedPhoto(null)
                        setCaption('')
                        setAiDescription('')
                      }}
                      className="flex-1 btn"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedPhoto(null)
                        setCaption('')
                        setAiDescription('')
                      }}
                      className="flex-1 bg-gray-200 text-gray-700"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </Dialog>
            )}
          </section>
        )
      }