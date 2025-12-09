import { useEffect, useRef, useState } from 'react'
import Dialog from '../../components/ui/dialog.jsx'
import Button from '../../components/ui/button.jsx'
import { useAuth } from '../../contexts/AuthContext'
import { getNotes, createNote, subscribeToNotes, getCheckIns } from '../../services/api'
import { usePresence } from '../../hooks/usePresence'

function suggestionFromEmotion(emotion) {
  if (!emotion) return 'Thinking of you ❤️'
  const map = {
    tired: "Rest up tonight—I've got dinner. 💕",
    happy: "So happy for us! Let's celebrate small wins today.",
    stressed: "I'm here for you. Want a walk later?",
    loved: "You make my day brighter. ✨",
  }
  return map[emotion] || 'You’ve got this—and I’ve got you. 💗'
}

export default function EnhancedChat({ open, onClose }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const timer = useRef(null)
  const [latestEmotion, setLatestEmotion] = useState('')
  const { isPartnerOnline, partnerPresence } = usePresence()
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeout = useRef(null)

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const [nt, ci] = await Promise.all([
          getNotes(user.id),
          getCheckIns(user.id)
        ])
        if (cancelled) return
        setMessages((nt || []).map(n => ({ author: n.author, content: n.content, date: n.date })))
        setLatestEmotion(ci?.[0]?.emotion || '')
      } catch (e) {
        console.error('Load chat failed', e)
      }
    })()

    const sub = subscribeToNotes(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const n = payload.new
        setMessages(prev => [{ author: n.author, content: n.content, date: n.date }, ...prev])
      }
    })

    return () => {
      sub.unsubscribe()
      if (timer.current) clearInterval(timer.current)
    }
  }, [open, user])

  const send = async () => {
    if (!input.trim() || !user) return
    const note = { 
      user_id: user.id, 
      author: user.user_metadata?.name || user.email, 
      content: input.trim(), 
      date: new Date().toISOString().slice(0,10) 
    }
    // Optimistic update
    setMessages(prev => [{ author: note.author, content: note.content, date: note.date }, ...prev])
    setInput('')
    try {
      await createNote(note)
    } catch (e) {
      console.error('Send failed', e)
    }
  }

  const onInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    // local typing indicator; in a fuller implementation we'd emit presence typing events
    setIsTyping(true)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => setIsTyping(false), 1200)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Love Notes">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-green-500' : 'bg-gray-300'}`}/>
            <span>{isPartnerOnline ? 'Partner active now' : 'Partner offline'}</span>
          </div>
          <div className="text-gray-500">{isTyping ? 'typing…' : ''}</div>
        </div>
        <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
          {messages.map((m, i) => (
            <div key={i} className="glass-card p-2">
              <div className="text-xs text-gray-500">{m.author} • {m.date}</div>
              <div>{m.content}</div>
            </div>
          ))}
        </div>
        <div className="glass-card p-2">
          <div className="text-sm text-gray-600 mb-1">Suggestion</div>
          <div className="text-gray-800">{suggestionFromEmotion(latestEmotion)}</div>
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={onInputChange} placeholder="Send a love note…" className="flex-1 px-3 py-2 rounded-xl border"/>
          <Button onClick={send}>Send</Button>
        </div>
      </div>
    </Dialog>
  )
}