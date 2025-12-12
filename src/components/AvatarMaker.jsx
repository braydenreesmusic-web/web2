import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AvatarMaker({ initialAvatar, onSaved }) {
  const [avatarType, setAvatarType] = useState('initials') // 'initials' | 'emoji' | 'color' | 'upload'
  const [avatarStyle, setAvatarStyle] = useState('flat') // 'flat' | 'geometric' | 'gloss' | 'pattern'
  const [color, setColor] = useState('#6b21a8')
  const [initials, setInitials] = useState('')
  const [emoji, setEmoji] = useState('🙂')
  const [uploadPreview, setUploadPreview] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!initialAvatar) return
    if (initialAvatar.startsWith('data:') || initialAvatar.startsWith('http')) {
      setUploadPreview(initialAvatar)
      setAvatarType('upload')
    } else if (initialAvatar.length === 1 || /\p{Emoji}/u.test(initialAvatar)) {
      setEmoji(initialAvatar)
      setAvatarType('emoji')
    } else if (initialAvatar.length <= 3) {
      setInitials(initialAvatar.toUpperCase())
      setAvatarType('initials')
    }
  }, [initialAvatar])

  const colors = ['#6b21a8','#0ea5a4','#ef4444','#f59e0b','#10b981','#3b82f6','#7c3aed','#f97316','#ef6aa6']

  const handleFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadPreview(e.target.result)
      setAvatarType('upload')
    }
    reader.readAsDataURL(file)
  }

  const clearAvatar = async () => {
    try {
      await supabase.auth.updateUser({ data: { avatar: null } })
      onSaved && onSaved(null)
    } catch (e) {
      console.error('clear avatar failed', e)
      alert('Failed to clear avatar')
    }
  }

  // Helper to produce a pleasant two-stop gradient from a base color
  const makeGradientPair = (c) => {
    try {
      const hex = c.replace('#','')
      const r = parseInt(hex.slice(0,2),16)
      const g = parseInt(hex.slice(2,4),16)
      const b = parseInt(hex.slice(4,6),16)
      const shift = (n, amt) => Math.max(0, Math.min(255, Math.floor(n * 0.7 + amt)))
      const r2 = shift(r, 40)
      const g2 = shift(g, 30)
      const b2 = shift(b, 20)
      const toHex = (n) => n.toString(16).padStart(2,'0')
      return [`#${hex}`, `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`]
    } catch (e) {
      return [c, c]
    }
  }

  const saveAvatar = async () => {
    const payload = await generatePayload()
    if (!payload) return

    try {
      const { data, error } = await supabase.auth.updateUser({ data: { avatar: payload } })
      if (error) throw error
      onSaved && onSaved(payload)
    } catch (e) {
      console.error('save avatar failed', e)
      alert('Failed to save avatar')
    }

  }
  // Generate the avatar payload (data URL) without saving.
  const generatePayload = async () => {
    if (avatarType === 'upload' && uploadPreview) return uploadPreview
    const size = 512
    const content = avatarType === 'emoji' ? (emoji || '🙂') : (initials || '').slice(0,3).toUpperCase()
    let base = color
    if (avatarType === 'initials' && !color) {
      const seed = (content || 'A').charCodeAt(0)
      base = colors[seed % colors.length]
    }
    const [bg1, bg2] = makeGradientPair(base || '#6b21a8')

    let svg = ''
    if (avatarStyle === 'flat') {
      const fontSize = avatarType === 'emoji' ? Math.floor(size * 0.5) : Math.floor(size * 0.34)
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>\n  <defs>\n    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>\n      <stop offset='0%' stop-color='${bg1}' />\n      <stop offset='100%' stop-color='${bg2}' />\n    </linearGradient>\n  </defs>\n  <rect width='100%' height='100%' fill='url(#g)' rx='60' />\n  <text x='50%' y='50%' text-anchor='middle' dy='0.35em' font-family='Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-weight='800' font-size='${fontSize}' fill='#fff'>${content}</text>\n</svg>`
    } else if (avatarStyle === 'geometric') {
      const fontSize = avatarType === 'emoji' ? Math.floor(size * 0.44) : Math.floor(size * 0.26)
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>\n  <defs>\n    <linearGradient id='g1' x1='0' x2='1' y1='0' y2='1'>\n      <stop offset='0%' stop-color='${bg1}' />\n      <stop offset='100%' stop-color='${bg2}' />\n    </linearGradient>\n  </defs>\n  <rect width='100%' height='100%' fill='url(#g1)' rx='64' />\n  <g fill='rgba(255,255,255,0.06)'>\n    <rect x='-40' y='-20' width='260' height='260' transform='rotate(22 0 0)' rx='40'/>\n    <rect x='220' y='180' width='260' height='260' transform='rotate(-22 400 300)' rx='40'/>\n  </g>\n  <circle cx='86' cy='86' r='48' fill='rgba(255,255,255,0.04)' />\n  <text x='50%' y='56%' text-anchor='middle' dy='0.35em' font-family='Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-weight='800' font-size='${fontSize}' fill='#fff'>${content}</text>\n</svg>`
    } else if (avatarStyle === 'gloss') {
      const fontSize = avatarType === 'emoji' ? Math.floor(size * 0.5) : Math.floor(size * 0.34)
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>\n  <defs>\n    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>\n      <stop offset='0%' stop-color='${bg1}' />\n      <stop offset='100%' stop-color='${bg2}' />\n    </linearGradient>\n    <linearGradient id='shine' x1='0' x2='0' y1='0' y2='1'>\n      <stop offset='0%' stop-color='rgba(255,255,255,0.5)' />\n      <stop offset='60%' stop-color='rgba(255,255,255,0.12)' />\n      <stop offset='100%' stop-color='rgba(255,255,255,0)' />\n    </linearGradient>\n  </defs>\n  <rect width='100%' height='100%' fill='url(#g)' rx='72' />\n  <path d='M0 0 L512 0 L512 180 C340 120 172 160 0 120 Z' fill='url(#shine)' opacity='0.9' />\n  <text x='50%' y='56%' text-anchor='middle' dy='0.35em' font-family='Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-weight='800' font-size='${fontSize}' fill='#fff'>${content}</text>\n</svg>`
    } else {
      const fontSize = avatarType === 'emoji' ? Math.floor(size * 0.48) : Math.floor(size * 0.32)
      svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>\n  <defs>\n    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>\n      <stop offset='0%' stop-color='${bg1}' />\n      <stop offset='100%' stop-color='${bg2}' />\n    </linearGradient>\n    <pattern id='p' width='16' height='16' patternUnits='userSpaceOnUse'>\n      <circle cx='4' cy='4' r='2' fill='rgba(255,255,255,0.06)' />\n    </pattern>\n  </defs>\n  <rect width='100%' height='100%' fill='url(#g)' rx='56' />\n  <rect width='100%' height='100%' fill='url(#p)' opacity='0.6' rx='56' />\n  <text x='50%' y='52%' text-anchor='middle' dy='0.35em' font-family='Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-weight='800' font-size='${fontSize}' fill='#fff'>${content}</text>\n</svg>`
    }

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }

  const randomizeAvatar = () => {
    const types = ['initials','emoji','color']
    const styles = ['flat','geometric','gloss','pattern']
    const pick = (arr) => arr[Math.floor(Math.random()*arr.length)]
    setAvatarType(pick(types))
    setAvatarStyle(pick(styles))
    setColor(colors[Math.floor(Math.random()*colors.length)])
    // random initials or emoji
    if (Math.random() > 0.6) {
      const a = String.fromCharCode(65 + Math.floor(Math.random()*26))
      const b = String.fromCharCode(65 + Math.floor(Math.random()*26))
      setInitials(`${a}${b}`)
    } else {
      const emojis = ['🙂','🥰','😎','🌟','🎵','🔥','🌸','🍀']
      setEmoji(emojis[Math.floor(Math.random()*emojis.length)])
    }
  }

  const exportAvatar = async () => {
    const payload = await generatePayload()
    if (!payload) return
    // payload is data URL; convert to blob
    const res = await fetch(payload)
    const blob = await res.blob()
    const el = document.createElement('a')
    el.href = URL.createObjectURL(blob)
    el.download = `avatar-${Date.now()}.png`
    document.body.appendChild(el)
    el.click()
    el.remove()
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-lg font-semibold shadow-lg" style={{background: avatarType === 'upload' && uploadPreview ? 'transparent' : `linear-gradient(135deg, ${makeGradientPair(color)[0]}, ${makeGradientPair(color)[1]})`}}>
          {avatarType === 'upload' && uploadPreview ? (
            <img src={uploadPreview} alt="avatar preview" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            avatarType === 'emoji' ? <span style={{fontSize: '26px'}}>{emoji}</span> : <span style={{fontSize: '18px'}}>{(initials || '').slice(0,2)}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex gap-2 mb-2">
            <button className={`px-2 py-1 rounded ${avatarType==='initials' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarType('initials')}>Initials</button>
            <button className={`px-2 py-1 rounded ${avatarType==='emoji' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarType('emoji')}>Emoji</button>
            <button className={`px-2 py-1 rounded ${avatarType==='color' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarType('color')}>Color</button>
            <button className={`px-2 py-1 rounded ${avatarType==='upload' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>fileRef.current && fileRef.current.click()}>Upload</button>
          </div>

          <div className="flex gap-2 mb-2">
            <button className={`px-2 py-1 rounded ${avatarStyle==='flat' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarStyle('flat')}>Flat</button>
            <button className={`px-2 py-1 rounded ${avatarStyle==='geometric' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarStyle('geometric')}>Geometric</button>
            <button className={`px-2 py-1 rounded ${avatarStyle==='gloss' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarStyle('gloss')}>Gloss</button>
            <button className={`px-2 py-1 rounded ${avatarStyle==='pattern' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarStyle('pattern')}>Pattern</button>
          </div>

          {avatarType === 'initials' && (
            <input value={initials} onChange={e=>setInitials(e.target.value.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,3))} placeholder="AB" className="input" />
          )}

          {avatarType === 'emoji' && (
            <input value={emoji} onChange={e=>setEmoji(e.target.value.slice(0,2))} placeholder="🙂" className="input" />
          )}

          {avatarType === 'color' && (
            <div className="flex gap-2">
              {colors.map(c=> (
                <button key={c} onClick={()=>setColor(c)} style={{background:c}} className={`w-8 h-8 rounded-full ${color===c ? 'ring-2 ring-offset-1' : ''}`} />
              ))}
              <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} className="ml-2 w-10 h-8 p-0 border-0" />
            </div>
          )}

          {avatarType === 'upload' && (
            <div>
              <input type="file" accept="image/*" ref={fileRef} style={{display:'none'}} onChange={(e)=>handleFile(e.target.files?.[0])} />
              <div className="text-xs text-gray-600">Upload an avatar image (will be saved to your profile)</div>
              {uploadPreview && <div className="mt-2"><img src={uploadPreview} alt="preview" className="w-28 h-28 rounded-full object-cover" /></div>}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button onClick={saveAvatar} className="btn">Save Avatar</button>
            <button onClick={clearAvatar} className="btn-secondary">Clear</button>
          </div>
        </div>
      </div>
    </div>
  )
}
