import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AvatarMaker({ initialAvatar, onSaved }) {
  const [avatarType, setAvatarType] = useState('initials') // 'initials' | 'emoji' | 'color' | 'upload'
  const [color, setColor] = useState('#6b21a8')
  const [initials, setInitials] = useState('')
  const [emoji, setEmoji] = useState('🙂')
  const [uploadPreview, setUploadPreview] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!initialAvatar) return
    // if initialAvatar is a data URL or structured value, try to prefill
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

  const colors = ['#6b21a8','#0ea5a4','#ef4444','#f59e0b','#10b981','#3b82f6','#7c3aed']

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

  const saveAvatar = async () => {
    // Create a rich SVG data-url for initials / emoji / color so avatars render
    // consistently across the app (and show up as `data:` everywhere).
    let payload = ''
    if (avatarType === 'upload' && uploadPreview) {
      payload = uploadPreview
    } else {
      // Generate an SVG with a subtle gradient background and centered content
      const size = 256
      const getGradient = (c) => {
        // derive a second hue from base color for nicer gradients
        try {
          // simple hue shift: convert hex -> numeric and mix
          const hex = c.replace('#','')
          const r = parseInt(hex.slice(0,2),16)
          const g = parseInt(hex.slice(2,4),16)
          const b = parseInt(hex.slice(4,6),16)
          const r2 = Math.min(255, Math.floor(r * 0.85 + 30))
          const g2 = Math.min(255, Math.floor(g * 0.85 + 20))
          const b2 = Math.min(255, Math.floor(b * 0.85 + 10))
          const toHex = (n) => n.toString(16).padStart(2,'0')
          return [ `#${hex}`, `#${toHex(r2)}${toHex(g2)}${toHex(b2)}` ]
        } catch (e) {
          return [c, c]
        }
      }

      let fg = '#ffffff'
      let bg1 = '#6b21a8'
      let bg2 = '#7c3aed'
      let content = ''
      if (avatarType === 'emoji') {
        content = emoji || '🙂'
        bg1 = color
        const gpair = getGradient(bg1)
        bg1 = gpair[0]; bg2 = gpair[1]
      } else if (avatarType === 'initials') {
        content = (initials || '').slice(0,3).toUpperCase() || ''
        // choose a color based on initials
        const seed = (content || 'A').charCodeAt(0)
        const palette = ['#6b21a8','#0ea5a4','#ef4444','#f59e0b','#10b981','#3b82f6','#7c3aed']
        bg1 = palette[seed % palette.length]
        const gpair = getGradient(bg1)
        bg1 = gpair[0]; bg2 = gpair[1]
      } else if (avatarType === 'color') {
        content = (initials || '').slice(0,3).toUpperCase() || ''
        bg1 = color
        const gpair = getGradient(bg1)
        bg1 = gpair[0]; bg2 = gpair[1]
      }

      const fontSize = avatarType === 'emoji' ? Math.floor(size * 0.5) : Math.floor(size * 0.36)
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
  <defs>
    <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
      <stop offset='0%' stop-color='${bg1}' />
      <stop offset='100%' stop-color='${bg2}' />
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#g)' rx='40' />
  <text x='50%' y='50%' text-anchor='middle' dy='0.35em' font-family='Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-weight='700' font-size='${fontSize}' fill='${fg}'>${content}</text>
</svg>`
      payload = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    }

    try {
      const { data, error } = await supabase.auth.updateUser({ data: { avatar: payload } })
      if (error) throw error
      onSaved && onSaved(payload)
    } catch (e) {
      console.error('save avatar failed', e)
      alert('Failed to save avatar')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-semibold" style={{background: avatarType === 'upload' && uploadPreview ? 'transparent' : color}}>
          {avatarType === 'upload' && uploadPreview ? (
            <img src={uploadPreview} alt="avatar preview" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            avatarType === 'emoji' ? <span style={{fontSize: '20px'}}>{emoji}</span> : <span>{(initials || '').slice(0,2)}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex gap-2 mb-2">
            <button className={`px-2 py-1 rounded ${avatarType==='initials' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarType('initials')}>Initials</button>
            <button className={`px-2 py-1 rounded ${avatarType==='emoji' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarType('emoji')}>Emoji</button>
            <button className={`px-2 py-1 rounded ${avatarType==='color' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>setAvatarType('color')}>Color</button>
            <button className={`px-2 py-1 rounded ${avatarType==='upload' ? 'bg-slate-200' : 'bg-white'}`} onClick={()=>fileRef.current && fileRef.current.click()}>Upload</button>
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
            </div>
          )}

          {avatarType === 'upload' && (
            <div>
              <input type="file" accept="image/*" ref={fileRef} style={{display:'none'}} onChange={(e)=>handleFile(e.target.files?.[0])} />
              <div className="text-xs text-gray-600">Upload an avatar image (will be saved to your profile)</div>
              {uploadPreview && <div className="mt-2"><img src={uploadPreview} alt="preview" className="w-24 h-24 rounded-full object-cover" /></div>}
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
