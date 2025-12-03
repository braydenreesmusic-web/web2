import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getBookmarks, createBookmark, updateBookmark } from '../services/api'

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
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(b=> (
          <div key={b.id} className="glass-card p-4">
            <div className="font-semibold">{b.title}</div>
            <div className="text-sm text-gray-500">{b.category}</div>
            <div className="flex gap-3 mt-2 items-center">
              <a href={b.url} target="_blank" rel="noreferrer" className="text-purple-600">Open</a>
              {!b.visited && <button onClick={()=>markVisited(b.id)} className="px-3 py-1 rounded-xl bg-gray-100">Mark visited</button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}