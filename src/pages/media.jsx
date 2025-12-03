import { useEffect, useRef, useState } from 'react'
import Dialog from '../components/ui/dialog.jsx'
import Button from '../components/ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getNotes, createNote, getMedia, uploadMedia } from '../services/api'

export default function Media() {
  const [tab, setTab] = useState('notes')
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [photos, setPhotos] = useState([])
  const [videos, setVideos] = useState([])
  const [audios, setAudios] = useState([])
  const [newNote, setNewNote] = useState('')
  const fileInput = useRef(null)
  const [loading, setLoading] = useState(true)
  const tabs = ['notes','photos','videos','music']

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      setLoading(true)
      try {
        const [nt, ph, vd, au] = await Promise.all([
          getNotes(user.id),
          getMedia(user.id, 'photo'),
          getMedia(user.id, 'video'),
          getMedia(user.id, 'audio')
        ])
        if (cancelled) return
        setNotes(nt || [])
        setPhotos(ph || [])
        setVideos(vd || [])
        setAudios(au || [])
      } catch (e) {
        console.error('Load media failed', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])
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
        caption: file.name,
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
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-4 gap-2 glass-card p-2">
        {tabs.map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`py-2 rounded-xl ${tab===t?'bg-gradient-to-r from-pink-500 to-purple-500 text-white':'bg-gray-100 text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab==='notes' && (
        <div className="space-y-2">
          {notes.map(n=> (
            <div key={n.id} className="glass-card p-3">
              <div className="text-sm text-gray-500">{n.author} • {n.date}</div>
              <div>{n.content}</div>
            </div>
          ))}
          <Button onClick={()=>setOpen(true)}>Add Note</Button>
        </div>
      )}

      {tab==='photos' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="col-span-2 md:col-span-3">
            <input ref={fileInput} type="file" accept="image/*" onChange={onSelectPhoto} className="block w-full text-sm mb-2" />
          </div>
          {photos.map(p=> (
            <img key={p.id} src={p.url} alt={p.caption} className="rounded-xl shadow"/>
          ))}
        </div>
      )}

      {tab==='videos' && (
        <div className="grid grid-cols-2 gap-2">
          {videos.map(v=> (
            <video key={v.id} src={v.url} controls className="rounded-xl shadow"/>
          ))}
        </div>
      )}

      {tab==='music' && (
        <div className="space-y-2">
          {!audios.length && (
            <div className="text-sm text-gray-500">No audio yet.</div>
          )}
          {audios.map(a=> (
            <div key={a.id} className="glass-card p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{a.caption || 'Audio'}</div>
                <div className="text-sm text-gray-500">{a.date}</div>
              </div>
              <audio controls src={a.url} className="w-48"/>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={()=>setOpen(false)} title="Add Note">
        <div className="space-y-3">
          <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} className="w-full px-3 py-2 rounded-xl border" rows={4} placeholder="Write something sweet…"/>
          <div className="flex justify-end">
            <Button onClick={addNote}>Save Note</Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}