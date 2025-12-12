import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import Dialog from '../../components/ui/dialog.jsx'
import Button from '../../components/ui/button.jsx'
import { useAuth } from '../../contexts/AuthContext'
import { getNotes, createNote, subscribeToNotes, getCheckIns, createGameEvent, getGameEvents, subscribeToGameEvents } from '../../services/api'
import { supabase } from '../../lib/supabase'
import { usePresence } from '../../hooks/usePresence'
import { timeAgo } from '../../lib/time'
import { useToast } from '../../contexts/ToastContext'
import { replayGameEvents } from '../../services/game'

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
  const [gameMessages, setGameMessages] = useState([])
  const [input, setInput] = useState('')
  const [gameInput, setGameInput] = useState('')
  const timer = useRef(null)
  const [latestEmotion, setLatestEmotion] = useState('')
  const { isPartnerOnline, partnerPresence, partnerUserId, presenceEvents, partnerListeningSession } = usePresence()
  const { showToast } = useToast()
  const [showPresenceDebug, setShowPresenceDebug] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState({})
  const [allExpanded, setAllExpanded] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeout = useRef(null)
  const [mode, setMode] = useState('chat') // 'chat' or 'play'

  // Tic-tac-toe state (local-only)
  const emptyBoard = Array(9).fill(null)
  const [board, setBoard] = useState(emptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState('X')
  const [winner, setWinner] = useState(null)
  const [winningLine, setWinningLine] = useState(null)
  const [playersMap, setPlayersMap] = useState({}) // e.g. { X: 'Alice', O: 'Bob' }
  const [myPlayer, setMyPlayer] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [turnMessage, setTurnMessage] = useState('')
  const turnMessageTimeout = useRef(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const [pendingRematch, setPendingRematch] = useState(null)
  const [uiDebugEvents, setUiDebugEvents] = useState(null)
  const [relationshipDebug, setRelationshipDebug] = useState(null)
  const [lastReplayParsed, setLastReplayParsed] = useState(null)

  // Allow DEV controls to be shown either in dev builds or when the
  // `?debug_game_events=1` query param is present. This makes it easier
  // to inspect server canonical rows on preview/staging builds.
  let showDevControls = false
  try {
    showDevControls = (typeof window !== 'undefined') && (import.meta.env?.DEV || new URLSearchParams(window.location.search).has('debug_game_events'))
  } catch (e) {
    showDevControls = !!(typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug_game_events'))
  }

  // Expose a simple debug indicator when debug_game_events flag is present
  const showSignedInDebug = showDevControls && !!user

  // Utility: deterministic avatar gradient from a name
  const avatarGradientFor = (name) => {
    const s = String(name || '')
    let h = 0
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) % 360
    }
    const h1 = h
    const h2 = (h + 45) % 360
    return `linear-gradient(135deg, hsl(${h1} 60% 36%), hsl(${h2} 55% 44%))`
  }
  // Create a small SVG data URL avatar for use as notification icon
  const avatarDataUrlFor = (name) => {
    try {
      const s = String(name || 'U')
      const initial = s.slice(0,1).toUpperCase()
      let h = 0
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360
      const h1 = h
      const h2 = (h + 45) % 360
      const bg1 = `hsl(${h1} 60% 36%)`
      const bg2 = `hsl(${h2} 55% 44%)`
      const size = 128
      const fontSize = Math.floor(size * 0.48)
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
        <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stop-color='${bg1}'/><stop offset='100%' stop-color='${bg2}'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='url(#g)' rx='24'/>
        <text x='50%' y='50%' text-anchor='middle' dy='0.35em' font-family='Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial' font-weight='700' font-size='${fontSize}' fill='#fff'>${initial}</text>
      </svg>`
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    } catch (e) {
      return ''
    }
  }
  const rematchTimer = useRef(null)
  const REMATCH_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes

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
        // Apply historical notes to messages and reconstruct any tic-tac-toe moves
        const notes = nt || []
        // sort ascending by date to replay moves
        notes.sort((a,b) => new Date(a.date) - new Date(b.date))
        const msgs = []
        const gmsgs = []
        let replayBoard = Array(9).fill(null)
        let replayCurrent = 'X'
        let replayWinner = null
        const applyMoveNote = (note) => {
          const content = note.content || ''
          if (!content || !content.startsWith('TICTACTOE_MOVE|')) return false
          const parts = content.split('|')
          if (parts.length < 3) return false
          const idx = parseInt(parts[1], 10)
          const player = parts[2]
          if (Number.isFinite(idx) && idx >= 0 && idx < 9) {
            replayBoard[idx] = player
            // map player to user_id if not already set (more deterministic than display name)
            if (!replayPlayers[player]) replayPlayers[player] = note.user_id
            replayWinner = checkWinner(replayBoard)
            replayCurrent = player === 'X' ? 'O' : 'X'
            replayHistory.push({ idx, player, author: note.author, user_id: note.user_id, date: note.date })
            return true
          }
          return false
        }

        // replay players mapping and history
        const replayPlayers = {}
        const replayHistory = []

        for (const n of notes) {
          const content = n.content || ''
          // Ignore any game-related events stored in `notes` — game events are now
          // stored in the dedicated `game_events` table so the chat remains purely
          // conversational.
          if (content.startsWith('TICTACTOE_')) continue

          // Non-game note: add to chat history
          msgs.push({ author: n.author, content: n.content, date: n.date })
        }

        setMessages(msgs)
        setGameMessages(gmsgs)
        setBoard(replayBoard)
        setCurrentPlayer(replayCurrent)
        setWinner(replayWinner)
        const proposal = replayPlayers.__proposal || null
        if (proposal) delete replayPlayers.__proposal
        setPlayersMap(replayPlayers)
        setPendingProposal(proposal)
        const rem = replayPlayers.__rematch || null
        if (rem) delete replayPlayers.__rematch
        setPendingRematch(rem)
        setMoveHistory(replayHistory)
        // determine myPlayer based on playersMap
        const me = user.user_metadata?.name || user.email
        const myAssigned = Object.keys(replayPlayers).find(p => replayPlayers[p] === me)
        setMyPlayer(myAssigned || null)
        setLatestEmotion(ci?.[0]?.emotion || '')
      } catch (e) {
        console.error('Load chat failed', e)
      }
    })()

    const sub = subscribeToNotes(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const n = payload.new
        if (!n) return
        const content = n.content || ''
        // Ignore all game events in the main notes subscription — those belong to
        // the `game_events` table now. Only surface regular notes here.
        if (content.startsWith('TICTACTOE_')) return

        // Only show messages authored by me or the partner
        const mine = n.user_id === user.id
        const partnerRow = partnerUserId && n.user_id === partnerUserId
        if (!mine && !partnerRow) return

        setMessages(prev => [{ author: n.author, content: n.content, date: n.date }, ...prev])
        // show a browser notification for partner messages / game events (best-effort)
        try {
          const me = user.user_metadata?.name || user.email
          if (Notification && Notification.permission === 'granted') {
            const from = n.author || 'Partner'
            if (from !== me) {
              new Notification(from, { body: n.content || 'New note', icon: avatarDataUrlFor(from) })
            }
          }
        } catch (e) {
          console.warn('notify failed', e)
        }

        // update myPlayer if needed (compute from latest changes)
        const me = user.user_metadata?.name || user.email
        // If playersMap was updated above via setPlayersMap, we should set myPlayer
        // based on the recent assignment. For safety, check the relevant branches
        // where players are assigned and set myPlayer there. As a fallback, try
        // to derive from the current playersMap state value.
        setMyPlayer(prev => {
          if (prev) return prev
          try {
            const found = Object.keys(playersMap).find(p => playersMap[p] === me)
            return found || prev
          } catch (e) {
            return prev
          }
        })
      }
    })

    // Subscribe to canonical game_events so invites/start are visible here too
    const gsub = subscribeToGameEvents(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const n = payload.new
        if (!n) return
        const content = n.content || ''
        if ((content || '').startsWith('TICTACTOE_')) {
          // Re-fetch and replay canonical game events
          getGameEvents(user.id).then(ev => {
            const events = (ev || []).sort((a,b) => new Date(a.date) - new Date(b.date))
            const parsed = replayGameEvents(events)
            if (import.meta.env.DEV) {
              try { console.debug && console.debug('EnhancedChat: replay parsed', parsed) } catch (e) {}
            }
            setLastReplayParsed(parsed)
            setGameMessages(parsed.gameMessages)
            setBoard(parsed.board)
            setCurrentPlayer(parsed.currentPlayer)
            setWinner(parsed.winner)
            setWinningLine(parsed.winningLine)
            setPlayersMap(parsed.playersMap)
            // Normalize pending proposal so it always exposes an author_id.
            // If the server duplicated rows for partner visibility it includes
            // the original inviter id as `parts[3]`, and we store the row owner
            // as `row_user_id` in the replay. If for some reason `author_id`
            // is missing, fall back to `row_user_id` so UI decisions remain
            // deterministic.
            try {
              // Prefer the proposal row that belongs to the current user (so
              // the incoming-invite banner is evaluated against the row that
              // actually appears in this user's feed). Fall back to the last
              // parsed proposal for backward compatibility. As a final
              // defensive step, pick any proposal authored by someone else.
              const meId = user?.id
              let pp = null
              try {
                if (parsed.pendingProposalMap && meId) {
                  pp = parsed.pendingProposalMap[meId] || null
                }
                if (!pp && parsed.pendingProposal) pp = { ...parsed.pendingProposal }
                if (!pp && parsed.pendingProposalMap) {
                  for (const k of Object.keys(parsed.pendingProposalMap)) {
                    const candidate = parsed.pendingProposalMap[k]
                    if (candidate && candidate.author_id && candidate.author_id !== meId) {
                      pp = candidate
                      break
                    }
                  }
                }
                if (pp && !pp.author_id && pp.row_user_id) pp.author_id = pp.row_user_id
                if (import.meta.env.DEV) {
                  try { console.debug && console.debug('EnhancedChat: pendingProposal chosen', pp) } catch (e) {}
                }
              } catch (e) {
                pp = parsed.pendingProposal
              }
              setPendingProposal(pp)
            } catch (e) {
              setPendingProposal(parsed.pendingProposal)
            }
            setPendingRematch(parsed.pendingRematch)
            setMoveHistory(parsed.moveHistory)
            setLastReplayParsed(parsed)
          }).catch(e => console.error('EnhancedChat: failed to replay game_events', e))
        }
      }
    })

    return () => {
      sub.unsubscribe()
      try { gsub.unsubscribe() } catch (e) {}
      if (timer.current) clearInterval(timer.current)
    }
  }, [open, user])

  useEffect(() => {
    if (pendingProposal && pendingProposal.author_id !== user?.id) {
      showToast && showToast(`${pendingProposal.author} invited you to play as ${pendingProposal.side}`, { type: 'info', duration: 6000 })
    }
  }, [pendingProposal, user])

  const send = async () => {
    if (!input.trim() || !user) return
    const note = { 
      user_id: user.id, 
      author: user.user_metadata?.name || user.email, 
      content: input.trim(), 
      date: new Date().toISOString() 
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

  // Tic-tac-toe helpers
  const checkWinner = (b) => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ]
    for (const [a,b1,c] of lines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a]
    }
    if (b.every(Boolean)) return 'draw'
    return null
  }

  function findWinningLine(b) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ]
    for (const line of lines) {
      if (b[line[0]] && b[line[0]] === b[line[1]] && b[line[0]] === b[line[2]]) return line
    }
    return null
  }

  const handleCellClick = (idx) => {
    if (board[idx] || winner || mode !== 'play' || !user) return
    // Enforce turn: if myPlayer is assigned and it's not my turn, block
    if (myPlayer && myPlayer !== currentPlayer) {
      setTurnMessage("Not your turn")
      if (turnMessageTimeout.current) clearTimeout(turnMessageTimeout.current)
      turnMessageTimeout.current = setTimeout(() => setTurnMessage(''), 1500)
      return
    }
    // optimistic local update
    const nb = board.slice()
    nb[idx] = currentPlayer
    setBoard(nb)
    const w = checkWinner(nb)
    if (w) {
      setWinner(w)
      const line = findWinningLine(nb)
      setWinningLine(line)
    } else {
      setWinningLine(null)
    }
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X'
    setCurrentPlayer(nextPlayer)

    // send move as a special note so partner receives it
    const moveContent = `TICTACTOE_MOVE|${idx}|${board[idx] || currentPlayer}`
    const note = {
      user_id: user.id,
      author: user.user_metadata?.name || user.email,
      content: moveContent,
      date: new Date().toISOString()
    }
    // post move (fire-and-forget) into the dedicated game_events table
    createGameEvent(note).catch(() => {})
  }

  const startGame = (side) => {
    // backward-compatible start: immediately claim and send START
    if (!user) return
    const me = user.user_metadata?.name || user.email
    setPlayersMap(prev => ({ ...prev, [side]: me }))
    setMyPlayer(side)
    setBoard(emptyBoard)
    setCurrentPlayer('X')
    setWinner(null)
    setMoveHistory([])
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_START|${side}|${me}`,
      date: new Date().toISOString()
    }
    setMessages(prev => [{ author: note.author, content: `Started game as ${side}`, date: note.date }, ...prev])
    createGameEvent(note).then(() => {
      showToast && showToast(`Game started as ${side}`, { type: 'success' })
    }).catch(() => {
      showToast && showToast('Failed to start game', { type: 'error' })
    })
  }

  const proposeStart = (side) => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    if (process.env.NODE_ENV === 'development') {
      try { console.debug('proposeStart', { user_id: user.id, partnerUserId, side }) } catch (e) {}
    }
    const note = {
      user_id: user.id,
      author: me,
      // include author id in content for consistency with server-side invites
      content: `TICTACTOE_PROPOSE|${side}|${me}|${user.id}`,
      date: new Date().toISOString()
    }
    // Include author_id in optimistic state so the local user doesn't
    // incorrectly see the incoming-invite banner for their own proposal.
    setPendingProposal({ side, author: me, author_id: user.id, date: note.date })
    setMessages(prev => [{ author: note.author, content: `Proposed: ${me} as ${side}`, date: note.date }, ...prev])

    // If we have a partnerUserId, use server endpoint to create an invite row for both
    // inviter and partner (so partner can read it even if relationship row isn't set).
    if (partnerUserId) {
      (async () => {
        try {
          const { data } = await supabase.auth.getSession()
          const token = data?.session?.access_token
          const res = await fetch('/api/send-game-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            body: JSON.stringify({ user_id: user.id, author: me, side, partnerUserId })
          })
              const json = await res.json().catch(()=>null)
              if (!res.ok) {
                const txt = (json && (json.detail || json.error)) || await res.text().catch(()=>null)
                showToast && showToast('Invite failed', { type: 'error' })
                console.error('send-game-invite failed', res.status, txt, json)
                return
              }
              // Log server response so we can confirm which rows were inserted
              try { console.debug('send-game-invite response', JSON.stringify(json, null, 2)) } catch (e) {}
              try { console.debug('send-game-invite compact', json.inserted_user_ids || json.inserted_contents) } catch (e) {}
              showToast && showToast(`Invite sent — ${me} proposed ${side}`, { type: 'success' })
        } catch (e) {
          console.error('send-game-invite error', e)
          showToast && showToast('Invite failed', { type: 'error' })
        }
      })()
    } else {
      createGameEvent(note).then(() => {
        showToast && showToast(`Invite sent — ${me} proposed ${side}`, { type: 'success' })
      }).catch(() => {
        showToast && showToast('Invite failed', { type: 'error' })
      })
    }
  }

  const proposeRematch = () => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_REMATCH|PROPOSE|${me}`,
      date: new Date().toISOString()
    }
    setPendingRematch({ author: me, date: note.date })
    // start/refresh local expiry timer
    if (rematchTimer.current) clearTimeout(rematchTimer.current)
    rematchTimer.current = setTimeout(() => {
      setPendingRematch(null)
      setMessages(prev => [{ author: 'System', content: `Rematch proposal from ${me} expired`, date: new Date().toISOString() }, ...prev])
    }, REMATCH_TIMEOUT_MS)
    setMessages(prev => [{ author: me, content: 'Proposed a rematch', date: note.date }, ...prev])
    createGameEvent(note).catch(() => {})
  }

  const acceptRematch = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_REMATCH|ACCEPT|${proposal.author}|${me}`,
      date: new Date().toISOString()
    }
    // assign local rematch acceptance
    setPendingRematch(null)
    if (rematchTimer.current) { clearTimeout(rematchTimer.current); rematchTimer.current = null }
    setMessages(prev => [{ author: me, content: `Accepted rematch from ${proposal.author}`, date: note.date }, ...prev])
    createGameEvent(note).catch(() => {})
  }

  const declineRematch = (proposal) => {
    setPendingRematch(null)
    if (rematchTimer.current) { clearTimeout(rematchTimer.current); rematchTimer.current = null }
  }

  const acceptProposal = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const side = proposal.side
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_ACCEPT|${side}|${proposal.author}|${me}`,
      date: new Date().toISOString()
    }
    // assign locally
    const other = side === 'X' ? 'O' : 'X'
    setPlayersMap(prev => ({ ...prev, [side]: proposal.author, [other]: me }))
    setMyPlayer(other)
    setPendingProposal(null)
    setMessages(prev => [{ author: note.author, content: `${me} accepted ${proposal.author}'s proposal for ${side}`, date: note.date }, ...prev])
    createGameEvent(note).then(() => {
      showToast && showToast(`Accepted invite — you are ${other}`, { type: 'success' })
    }).catch(() => {
      showToast && showToast('Failed to accept invite', { type: 'error' })
    })
  }

  const declineProposal = (proposal) => {
    setPendingProposal(null)
  }

  const sendGameMessage = async () => {
    if (!gameInput.trim() || !user) return
    const me = user.user_metadata?.name || user.email
    const content = `TICTACTOE_MSG|${gameInput.trim()}`
    const note = {
      user_id: user.id,
      author: me,
      content,
      date: new Date().toISOString()
    }
    // optimistic update to gameMessages
    setGameMessages(prev => [{ author: note.author, content: gameInput.trim(), date: note.date }, ...prev])
    setGameInput('')
    try {
      await createGameEvent(note)
    } catch (e) {
      console.error('sendGameMessage failed', e)
    }
  }

  useEffect(() => {
    return () => {
      if (turnMessageTimeout.current) clearTimeout(turnMessageTimeout.current)
    }
  }, [])

  const resetGame = () => {
    setBoard(emptyBoard)
    setCurrentPlayer('X')
    setWinner(null)
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
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium ${isPartnerOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
              <span className={`inline-block w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-emerald-600' : 'bg-gray-300'}`} />
              <span>{isPartnerOnline ? 'Active now' : (partnerPresence?.last_seen ? `Last seen ${timeAgo(partnerPresence.last_seen)}` : 'Offline')}</span>
            </div>
            {partnerPresence?.updated_at && (
              <div className="text-xs text-gray-400">Updated {timeAgo(partnerPresence.updated_at)}</div>
            )}
          </div>
          <div className="text-gray-500">{isTyping ? 'typing…' : ''}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="tab-pill">
            <button onClick={() => setMode('chat')} className={`mode-btn ${mode==='chat' ? 'active' : ''}`}>Chat</button>
            <button onClick={() => setMode('play')} className={`mode-btn ${mode==='play' ? 'active' : ''}`}>Play</button>
          </div>
          {showDevControls && (
            <button onClick={() => setShowPresenceDebug(s => !s)} className="ml-3 px-2 py-1 text-xs rounded-md bg-gray-100">{showPresenceDebug ? 'Hide' : 'Show'} Presence Debug</button>
          )}
        </div>

        {showSignedInDebug && (
          <div className="mt-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-xs text-gray-700">
            Signed in as <strong>{user.user_metadata?.name || user.email}</strong>
            <span className="ml-2 font-mono text-xs text-gray-500">{user.id}</span>
          </div>
        )}

        {mode === 'chat' && (
          <>
            <div className="max-h-72 overflow-y-auto mt-2 chat-scroll">
              {messages.map((m, i) => (
                  <div key={i} className="chat-row">
                    {/* Prefer showing a real avatar image when available for the current user */}
                    {m.author === (user?.user_metadata?.name || user?.email?.split('@')[0]) && user?.user_metadata?.avatar ? (
                      <div className="chat-avatar" aria-hidden>
                        <img src={user.user_metadata.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                      </div>
                    ) : (
                      <div className="chat-avatar" aria-hidden style={{background: avatarGradientFor(m.author)}}>{(m.author||'U').slice(0,1).toUpperCase()}</div>
                    )}
                    <div className="chat-bubble">
                    <div className="chat-message glass-card p-2">
                      <div className="meta flex items-center justify-between">
                        <div className="text-xs text-gray-600 font-medium">{m.author}</div>
                        <div className="text-xs text-gray-400">{m.date ? timeAgo(m.date) : ''}</div>
                      </div>
                      <div className="content text-sm mt-1">{m.content}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea value={input} onChange={onInputChange} placeholder="Send a love note…" className="flex-1 px-3 py-3 rounded-xl border resize-none" rows={2} onKeyDown={(e)=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); } }} />
              <Button onClick={send} className="expensive-btn">Send</Button>
            </div>
          </>
        )}

        {showPresenceDebug && import.meta.env.DEV && (
          <div className="mt-2 p-2 bg-slate-50 border rounded text-xs">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Presence Debug</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const payload = JSON.stringify({ partnerPresence, partnerListeningSession, presenceEvents }, null, 2)
                      await navigator.clipboard.writeText(payload)
                    } catch (e) {
                      console.warn('copy failed', e)
                    }
                  }}
                  className="px-2 py-1 bg-white border rounded text-xs"
                >Copy JSON</button>
                <button
                  onClick={async () => {
                    try {
                      // Get session token from supabase client and call debug endpoint
                      const { data } = await supabase.auth.getSession()
                      const token = data?.session?.access_token
                      const res = await fetch('/api/ui-game-events', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
                      const json = await res.json()
                      setUiDebugEvents(json)
                    } catch (e) {
                      console.error('ui-game-events fetch failed', e)
                      setUiDebugEvents({ error: String(e) })
                    }
                  }}
                  className="px-2 py-1 bg-white border rounded text-xs"
                >Fetch game_events (debug)</button>
                <button
                  onClick={async () => {
                    try {
                      // Fetch relationship row for current user (DEV-only)
                      const { data: rel, error } = await supabase
                        .from('relationships')
                        .select('*')
                        .eq('user_id', user.id)
                        .maybeSingle()
                      if (error) throw error
                      setRelationshipDebug(rel || null)
                      try { console.debug('relationshipDebug', rel) } catch (e) {}
                    } catch (e) {
                      console.error('relationship fetch failed', e)
                      setRelationshipDebug({ error: String(e) })
                    }
                  }}
                  className="px-2 py-1 bg-white border rounded text-xs"
                >Fetch relationship (debug)</button>
                <button
                  onClick={() => { setAllExpanded(s => { const next = !s; setExpandedEvents(() => { const map = {}; if (next && presenceEvents) { presenceEvents.forEach((_, idx) => map[idx]=true) } return map }); return next }) }}
                  className="px-2 py-1 bg-white border rounded text-xs"
                >{allExpanded ? 'Collapse All' : 'Expand All'}</button>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">Partner Presence</div>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto">{JSON.stringify(partnerPresence, null, 2)}</pre>

            <div className="mt-2 text-xs text-gray-600">Listening Session</div>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto">{JSON.stringify(partnerListeningSession, null, 2)}</pre>

            <div className="mt-2 text-xs font-medium">Recent Events</div>
            <div className="max-h-48 overflow-y-auto text-xs mt-1 space-y-2">
              {presenceEvents && presenceEvents.length ? presenceEvents.map((e, i) => (
                <div key={i} className="p-1 bg-white border rounded">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">{e.ts} — {e.type}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedEvents(prev => ({ ...prev, [i]: !prev[i] }))} className="px-2 py-0.5 text-xs bg-gray-100 rounded">{expandedEvents[i] || allExpanded ? 'Hide' : 'Show'}</button>
                      <button onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(e, null, 2)) } catch (err) { console.warn('copy failed', err) } }} className="px-2 py-0.5 text-xs bg-gray-100 rounded">Copy</button>
                    </div>
                  </div>
                  {(expandedEvents[i] || allExpanded) && (
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded border overflow-auto">{JSON.stringify(e, null, 2)}</pre>
                  )}
                </div>
              )) : <div className="text-gray-400">No events yet</div>}
            </div>
          </div>
        )}

        {showDevControls && uiDebugEvents && (
          <div className="mt-2 p-2 bg-slate-50 border rounded text-xs">
            <div className="font-medium text-sm">game_events (server)</div>
            <pre className="max-h-60 overflow-auto text-xs mt-2 bg-white p-2 rounded border">{JSON.stringify(uiDebugEvents, null, 2)}</pre>
          </div>
        )}

        {showDevControls && relationshipDebug && (
          <div className="mt-2 p-2 bg-slate-50 border rounded text-xs">
            <div className="font-medium text-sm">relationship (client)</div>
            <pre className="max-h-40 overflow-auto text-xs mt-2 bg-white p-2 rounded border">{JSON.stringify(relationshipDebug, null, 2)}</pre>
          </div>
        )}

        {mode === 'play' && (
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Tic‑Tac‑Toe</div>
                <div className="text-xs text-gray-500">Open the full game view to play in a dedicated page.</div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/play" className="no-underline">
                  <Button>Open Play Page</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}