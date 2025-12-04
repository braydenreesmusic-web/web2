import { useEffect, useRef, useState } from 'react'
import Dialog from '../components/ui/dialog.jsx'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getNotes, createNote, getMedia, uploadMedia } from '../services/api'
import MusicTab from '../components/MusicTab'
import { Camera, Sparkles } from 'lucide-react'

export default function Media() {
  const [tab, setTab] = useState('photos')
  const [open, setOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const { user} = useAuth()
  const [notes, setNotes] = useState([])
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [newNote, setNewNote] = useState('')
  const [caption, setCaption] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const fileInput = useRef(null)
  const [loading, setLoading] = useState(true)
  const tabs = ['photos','videos','notes','music']

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
    setNotes(prev => [{...note, id: Math.random()}, ...prev])
    setNewNote('')
    setOpen(false)
    try { await createNote(note) } catch (e) { console.error(e) }
  }

  const onSelectPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
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
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const updatePhotoCaption = async (photoId, newCaption) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption: newCaption } : p))
    // Caption is updated locally
  }
  return (
    <section className="space-y-6 pb-6">
      {/* Tabs */}
      <div className="glass-card p-1.5 rounded-2xl">
        <div className="grid grid-cols-4 gap-1.5">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-3 rounded-xl font-semibold text-sm capitalize transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                  : 'bg-transparent text-gray-600 hover:bg-gray-100'
              }`}
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
          <Button
            onClick={() => fileInput.current?.click()}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center justify-center gap-2 py-3"
          >
            <Camera size={20} />
            Add Photo
          </Button>

          <div className="grid grid-cols-2 gap-4">
            {photos.map(p => (
              <div
                key={p.id}
                onClick={() => {setSelectedPhoto(p); setCaption(p.caption || '')}}
                className="cursor-pointer transform hover:scale-105 transition-transform"
              >
                <div className="bg-white p-3 pb-12 rounded-lg shadow-xl">
                  <img src={p.url} alt={p.caption || 'Photo'} className="w-full aspect-square object-cover rounded" />
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {p.caption || 'Tap to add caption'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {photos.length === 0 && !loading && (
            <div className="text-center py-12 glass-card rounded-2xl">
              <Camera size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No photos yet</p>
            </div>
          )}
        </div>
      )}

      {/* Videos Tab */}
      {tab === 'videos' && (
        <div className="grid grid-cols-1 gap-4">
          {videos.map(v => (
            <div key={v.id} className="glass-card p-3 rounded-2xl">
              <video src={v.url} controls className="w-full rounded-xl" />
              {v.caption && <p className="mt-2 text-sm text-gray-600">{v.caption}</p>}
            </div>
          ))}
          {videos.length === 0 && !loading && (
            <div className="text-center py-12 glass-card rounded-2xl">
              <p className="text-gray-500">No videos yet</p>
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div className="space-y-3">
          {notes.length === 0 && !loading && (
            <div className="text-center py-12 glass-card rounded-2xl">
              <p className="text-gray-500 mb-4">No notes yet</p>
              <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">✍️ Write First Note</Button>
            </div>
          )}
          {notes.map(n => (
            <div key={n.id} className="glass-card p-4 rounded-2xl">
              <div className="text-sm text-gray-500 mb-2">{n.author} • {n.date}</div>
              <div className="text-gray-800">{n.content}</div>
            </div>
          ))}
          {notes.length > 0 && (
            <Button onClick={() => setOpen(true)} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">+ Add Note</Button>
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
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
            rows={6}
            placeholder="Write something sweet…"
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setOpen(false)} className="bg-gray-200 text-gray-700">
              Cancel
            </Button>
            <Button onClick={addNote} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
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
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
              />
            </div>

            <Button
              onClick={generateAIDescription}
              disabled={loadingAI}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center gap-2"
            >
              <Sparkles size={18} />
              {loadingAI ? 'Generating...' : '✨ Get AI Description'}
            </Button>

            {aiDescription && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                <p className="text-sm text-gray-700">{aiDescription}</p>
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
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
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