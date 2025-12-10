import { useEffect, useRef, useState } from 'react'
import Dialog from '../../components/ui/dialog.jsx'
import Button from '../../components/ui/button.jsx'
import { useAuth } from '../../contexts/AuthContext'
import { getNotes, createNote, subscribeToNotes, getCheckIns, getGameNotes } from '../../services/api'
import { usePresence } from '../../hooks/usePresence'
import { timeAgo } from '../../lib/time'

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
  const [mode, setMode] = useState('chat') // 'chat' or 'play'

  // Tic-tac-toe state (local-only)
  const emptyBoard = Array(9).fill(null)
  const [board, setBoard] = useState(emptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState('X')
  const [winner, setWinner] = useState(null)
  const [winnerLine, setWinnerLine] = useState([])
  const [playersMap, setPlayersMap] = useState({}) // e.g. { X: 'Alice', O: 'Bob' }
  const [myPlayer, setMyPlayer] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [turnMessage, setTurnMessage] = useState('')
  const turnMessageTimeout = useRef(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const [gameNotifications, setGameNotifications] = useState([])
  const [persistentGameNotes, setPersistentGameNotes] = useState([])
  const [unreadGameCount, setUnreadGameCount] = useState(0)

  useEffect(() => {
    if (!open || !user) return
    let cancelled = false
    ;(async () => {
      try {
        const [nt, ci, gn] = await Promise.all([
          getNotes(user.id),
          getCheckIns(user.id),
          getGameNotes(user.id)
        ])
        if (cancelled) return
        // Apply historical notes to messages and reconstruct any tic-tac-toe moves
        const notes = nt || []
        // sort ascending by date to replay moves
        notes.sort((a,b) => new Date(a.date) - new Date(b.date))
        const msgs = []
        let replayBoard = Array(9).fill(null)
        let replayCurrent = 'X'
        let replayWinner = null
        let replayWinnerLine = []
        const applyMoveNote = (note) => {
          const content = note.content || ''
          if (!content || !content.startsWith('TICTACTOE_MOVE|')) return false
          const parts = content.split('|')
          if (parts.length < 3) return false
          const idx = parseInt(parts[1], 10)
          const player = parts[2]
          if (Number.isFinite(idx) && idx >= 0 && idx < 9) {
            replayBoard[idx] = player
            // map player to author id if not already set
            if (!replayPlayers[player]) replayPlayers[player] = note.user_id || note.author
            const cw = checkWinner(replayBoard)
            replayWinner = cw ? cw.winner : null
            replayWinnerLine = cw?.line || []
            replayCurrent = player === 'X' ? 'O' : 'X'
            replayHistory.push({ idx, player, author: note.author, date: note.date })
            return true
          }
          return false
        }

        // replay players mapping and history
        const replayPlayers = {}
        const replayHistory = []

        for (const n of notes) {
          const content = n.content || ''
          if (content.startsWith('TICTACTOE_PROPOSE|')) {
            const parts = content.split('|')
            if (parts.length >= 3) {
              const side = parts[1]
              // keep the most recent proposal; prefer the note's user_id when available
              const author = parts[2]
              const author_id = n.user_id || null
              replayPlayers.__proposal = { side, author, author_id, date: n.date }
              continue
            }
          }
          if (content.startsWith('TICTACTOE_ACCEPT|')) {
            const parts = content.split('|')
            if (parts.length >= 4) {
              const side = parts[1]
              const proposer = parts[2]
              const accepter = parts[3]
              const proposer_id = null
              const accepter_id = n.user_id || null
              const other = side === 'X' ? 'O' : 'X'
              // store ids when available; fall back to names
              replayPlayers[side] = proposer_id || proposer
              replayPlayers[other] = accepter_id || accepter
              continue
            }
          }
          if (content.startsWith('TICTACTOE_START|')) {
            const parts = content.split('|')
            if (parts.length >= 3) {
              const side = parts[1]
              const author = parts[2]
              const author_id = n.user_id || null
              replayPlayers[side] = replayPlayers[side] || author_id || author
              continue
            }
          }
          if (!applyMoveNote(n)) {
            msgs.push({ author: n.author, content: n.content, date: n.date })
          }
        }

        setMessages(msgs)
        setBoard(replayBoard)
        setCurrentPlayer(replayCurrent)
        setWinner(replayWinner)
        setWinnerLine(replayWinnerLine)
        const proposal = replayPlayers.__proposal || null
        if (proposal) delete replayPlayers.__proposal
        setPlayersMap(replayPlayers)
        setPendingProposal(proposal)
        setMoveHistory(replayHistory)
        // determine myPlayer based on playersMap
        const meId = user.id
        const myAssigned = Object.keys(replayPlayers).find(p => replayPlayers[p] === meId || replayPlayers[p] === (user.user_metadata?.name || user.email))
        setMyPlayer(myAssigned || null)
        setLatestEmotion(ci?.[0]?.emotion || '')
        // load persistent game notes (TICTACTOE_*) for notifications
        setPersistentGameNotes(gn || [])
        // compute unread since last seen timestamp (stored per-user)
        try {
          const key = `gameNotesLastSeen_${user.id}`
          const lastSeen = localStorage.getItem(key)
          let unread = 0
          if (gn && gn.length) {
            const lastSeenTs = lastSeen ? new Date(lastSeen).getTime() : 0
            unread = gn.filter(n => {
              const ts = n.created_at ? new Date(n.created_at).getTime() : (n.date ? new Date(n.date).getTime() : 0)
              return ts > lastSeenTs
            }).length
          }
          setUnreadGameCount(unread)
        } catch (e) {
          console.warn('game notes unread calc failed', e)
        }
      } catch (e) {
        console.error('Load chat failed', e)
      }
    })()

    const sub = subscribeToNotes(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const n = payload.new
        // parse tic-tac-toe messages specially
        const content = n.content || ''
        // persist all TICTACTOE_* notes separately so they don't pollute the chat
        if (content.startsWith('TICTACTOE_')) {
          setPersistentGameNotes(prev => [{ ...n }, ...prev])
          try {
            const key = `gameNotesLastSeen_${user.id}`
            const lastSeen = localStorage.getItem(key)
            const ts = n.created_at ? new Date(n.created_at).getTime() : (n.date ? new Date(n.date).getTime() : Date.now())
            if (!open && (!lastSeen || ts > new Date(lastSeen).getTime())) {
              setUnreadGameCount(c => c + 1)
            }
          } catch (e) {}
        }
        // START
        if (content.startsWith('TICTACTOE_START|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const side = parts[1]
            const author = parts[2]
            const other = side === 'X' ? 'O' : 'X'
            // prefer storing user_id for playersMap when available
            setPlayersMap(prev => ({ ...prev, [side]: payload.new?.user_id || payload.new?.author || author, [other]: prev[other] || null }))
            resetGame()
            // if I started, claim the side locally
            const meId = user.id
            if ((payload.new?.user_id || null) === meId) setMyPlayer(side)
            // add a small game notification instead of a chat message
            addGameNotification({ type: 'start', text: `${author} started as ${side}` })
          }
          return
        }

        // PROPOSE
        if (content.startsWith('TICTACTOE_PROPOSE|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const side = parts[1]
            const author = parts[2]
            const author_id = n.user_id || null
            setPendingProposal({ side, author, author_id, date: n.date })
            addGameNotification({ type: 'propose', text: `${author} proposed ${side}` })
          }
          return
        }
        // ACCEPT
        if (content.startsWith('TICTACTOE_ACCEPT|')) {
          const parts = content.split('|')
          if (parts.length >= 4) {
            const side = parts[1]
            const proposer = parts[2]
            const accepter = parts[3]
            const other = side === 'X' ? 'O' : 'X'
            // prefer user ids when available (accepter is the note author)
            const accepter_id = n.user_id || null
            setPlayersMap(prev => ({ ...prev, [side]: prev[side] || proposer, [other]: accepter_id || accepter }))
            setPendingProposal(null)
            addGameNotification({ type: 'accept', text: `${accepter} accepted ${proposer}'s proposal for ${side}` })
            // assign myPlayer if this accept was by me
            const meId = user.id
            if (accepter_id === meId) setMyPlayer(other)
          }
          return
        }
        if (content.startsWith('TICTACTOE_MOVE|')) {
          const parts = content.split('|')
          const idx = parseInt(parts[1], 10)
          const player = parts[2]
          if (Number.isFinite(idx) && idx >= 0 && idx < 9) {
            setBoard(prev => {
              const nb = prev.slice()
              // ignore if already occupied
              if (nb[idx]) return prev
              nb[idx] = player
              const w = checkWinner(nb)
              if (w) {
                setWinner(w.winner)
                setWinnerLine(w.line || [])
              }
              setCurrentPlayer(player === 'X' ? 'O' : 'X')
              return nb
            })
            // map player to author id when available
            setPlayersMap(prev => {
              const next = { ...prev }
              if (!next[player]) next[player] = n.user_id || n.author
              return next
            })
            // If the author of the move is me, ensure myPlayer is set to that side
            if ((n.user_id || null) === user.id) {
              try { setMyPlayer(player) } catch (e) {}
            }
            setMoveHistory(prev => [{ idx, player, author: n.author, date: n.date }, ...prev])
            // notify about move in the game notification area rather than chat
            addGameNotification({ type: 'move', text: `${n.author} played ${player} @ ${idx}` })
          }
        } else if (content.startsWith('TICTACTOE_RESET')) {
          // full reset: clear board and player assignments
          resetGame()
          addGameNotification({ type: 'reset', text: 'Game was reset' })
        } else if (content.startsWith('TICTACTOE_INVITE')) {
          // incoming invite: surface as a game notification but don't add to chat
          addGameNotification({ type: 'invite', text: `${n.author} sent a game invite` })
        } else {
          setMessages(prev => [{ author: n.author, content: n.content, date: n.date }, ...prev])
        }
        // update myPlayer if needed (compute from latest changes)
        const me = user.user_metadata?.name || user.email
        setMyPlayer(prev => {
          if (prev) return prev
          try {
            const found = Object.keys(playersMap).find(p => playersMap[p] === me || playersMap[p] === user.id)
            return found || prev
          } catch (e) {
            return prev
          }
        })
      }
    })

    return () => {
      sub.unsubscribe()
      if (timer.current) clearInterval(timer.current)
    }
  }, [open, user])

  // when user opens the modal mark persistent game notes as seen
  useEffect(() => {
    if (open && user) {
      try {
        const key = `gameNotesLastSeen_${user.id}`
        localStorage.setItem(key, new Date().toISOString())
        setUnreadGameCount(0)
      } catch (e) {}
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

  // Helper: add ephemeral game notification (not stored in chat)
  const addGameNotification = ({ type, text, ttl = 6000 }) => {
    const id = Math.random().toString(36).slice(2,9)
    setGameNotifications(prev => [{ id, type, text, date: new Date().toISOString() }, ...prev])
    setTimeout(() => {
      setGameNotifications(prev => prev.filter(p => p.id !== id))
    }, ttl)
  }

  // Rematch helpers
  const sendRematch = () => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_REMATCH|${me}`,
      date: new Date().toISOString().slice(0,10)
    }
    addGameNotification({ type: 'rematch', text: 'Rematch requested' })
    createNote(note).catch(() => {})
  }

  const acceptRematch = async (rematchNote) => {
    if (!user || !rematchNote) return
    const me = user.user_metadata?.name || user.email
    // send accept note
    const acceptNote = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_REMATCH_ACCEPT|${me}`,
      date: new Date().toISOString().slice(0,10)
    }
    addGameNotification({ type: 'rematch', text: 'You accepted rematch' })
    createNote(acceptNote).catch(() => {})
    // auto-start a new game by starting as 'O' (acceptor takes O) — acceptor triggers a START as 'O'
    startGame('O')
  }

  const declineRematch = (rematchNote) => {
    addGameNotification({ type: 'rematch', text: 'Rematch declined' })
  }

  // Tic-tac-toe helpers
  const checkWinner = (b) => {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ]
    for (const [a,b1,c] of lines) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return { winner: b[a], line: [a,b1,c] }
    }
    if (b.every(Boolean)) return { winner: 'draw' }
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
    if (w) setWinner(w)
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X'
    setCurrentPlayer(nextPlayer)

    // send move as a special note so partner receives it
    const moveContent = `TICTACTOE_MOVE|${idx}|${board[idx] || currentPlayer}`
    const note = {
      user_id: user.id,
      author: user.user_metadata?.name || user.email,
      content: moveContent,
      date: new Date().toISOString().slice(0,10)
    }
    // post move (fire-and-forget)
    createNote(note).catch(() => {})
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
      date: new Date().toISOString().slice(0,10)
    }
    // do not add to chat; show a game notification instead
    addGameNotification({ type: 'start', text: `Started game as ${side}` })
    createNote(note).catch(() => {})
  }

  const proposeStart = (side) => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_PROPOSE|${side}|${me}`,
      date: new Date().toISOString().slice(0,10)
    }
    setPendingProposal({ side, author: me, date: note.date })
    addGameNotification({ type: 'propose', text: `You proposed ${side}` })
    createNote(note).catch(() => {})
  }

  const acceptProposal = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const side = proposal.side
    const note = {
      user_id: user.id,
      author: me,
      content: `TICTACTOE_ACCEPT|${side}|${proposal.author}|${me}`,
      date: new Date().toISOString().slice(0,10)
    }
    // assign locally
    const other = side === 'X' ? 'O' : 'X'
    setPlayersMap(prev => ({ ...prev, [side]: proposal.author, [other]: me }))
    setMyPlayer(other)
    setPendingProposal(null)
    addGameNotification({ type: 'accept', text: `You accepted ${proposal.author}'s proposal` })
    createNote(note).catch(() => {})
  }

  const declineProposal = (proposal) => {
    setPendingProposal(null)
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
    setWinnerLine([])
    setMoveHistory([])
    setPlayersMap({})
    setMyPlayer(null)
  }

  const getDisplayName = (val) => {
    if (!val) return 'Open'
    if (val === user?.id) return 'You'
    return String(val)
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
      <div className="space-y-3 enhanced-chat">
        <div className="flex items-center justify-between text-xs text-gray-500 enhanced-header">
          <div className="flex items-center gap-3">
              <div className="presence-badge">
                <span className={`presence-dot ${isPartnerOnline ? 'online' : 'offline'}`}></span>
                <div className="presence-text text-sm">
                  <div className="font-medium text-slate-700">{isPartnerOnline ? 'Active now' : 'Offline'}</div>
                  <div className="text-xs text-gray-500">{isPartnerOnline ? (partnerPresence?.updated_at ? timeAgo(partnerPresence.updated_at) : 'just now') : (partnerPresence?.last_seen ? `Last seen ${timeAgo(partnerPresence.last_seen)}` : '')}</div>
                </div>
              </div>
            </div>
          <div className="text-gray-500">{isTyping ? 'typing…' : ''}</div>
        </div>
        <div className="mode-toggle">
          <button onClick={() => setMode('chat')} className={`mode-btn ${mode==='chat' ? 'active' : ''}`}>Chat</button>
          <button onClick={() => setMode('play')} className={`mode-btn ${mode==='play' ? 'active' : ''}`}>Play</button>
        </div>

        

        <div className="chat-scroll mt-2">
          {messages.map((m, i) => (
            <div key={i} className="chat-message">
              <div className="meta">{m.author} • {m.date}</div>
              <div>{m.content}</div>
            </div>
          ))}
        </div>
        {mode === 'chat' && (
          <>
            <div className="flex gap-2">
              <input value={input} onChange={onInputChange} placeholder="Send a love note…" className="flex-1 px-3 py-2 rounded-xl border"/>
              <Button onClick={send}>Send</Button>
            </div>
          </>
        )}

        {mode === 'play' && (
          <div className="mt-2 game-notes">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Game Notifications</div>
              {unreadGameCount > 0 && (
                <div className="unread-badge">{unreadGameCount}</div>
              )}
            </div>

            {/* persistent game notes */}
            {persistentGameNotes.length > 0 && (
              <div className="space-y-2">
                {persistentGameNotes.slice(0,6).map((n, idx) => (
                  <div key={idx} className="game-note-card flex items-center justify-between">
                    <div className="text-sm text-slate-700">{n.content.replace(/^TICTACTOE_/, '')} {n.author ? `• ${n.author}` : ''}</div>
                    <div className="flex items-center gap-2">
                      {n.content.startsWith('TICTACTOE_REMATCH') && n.user_id !== user.id && (
                        <>
                          <Button onClick={() => acceptRematch(n)}>Accept</Button>
                          <Button onClick={() => declineRematch(n)}>Decline</Button>
                        </>
                      )}
                      <div className="text-xs text-gray-400">{new Date(n.created_at || n.date).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ephemeral notifications */}
            {gameNotifications.length > 0 && (
              <div className="space-y-2 mt-2">
                {gameNotifications.map(n => (
                  <div key={n.id} className="game-note-card flex items-center justify-between">
                    <div className="text-sm text-slate-700">{n.text}</div>
                    <div className="text-xs text-gray-400">{new Date(n.date).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
                )}

                {pendingProposal && pendingProposal.author === (user.user_metadata?.name || user.email) && (
                  <div className="text-xs text-gray-500">Proposal sent: {pendingProposal.side}</div>
                )}

                <div className="flex items-center gap-2">
                  <Button onClick={() => {
                    if (!user) return
                    const note = {
                      user_id: user.id,
                      author: user.user_metadata?.name || user.email,
                      content: 'TICTACTOE_INVITE',
                      date: new Date().toISOString().slice(0,10)
                    }
                    addGameNotification({ type: 'invite', text: 'Game invite sent' })
                    createNote(note).catch(() => {})
                  }}>Invite partner</Button>

                  {!pendingProposal && (
                    <>
                      <Button onClick={() => proposeStart('X')}>Propose X</Button>
                      <Button onClick={() => proposeStart('O')}>Propose O</Button>
                      <Button onClick={() => startGame('X')}>Start (X)</Button>
                      <Button onClick={() => startGame('O')}>Start (O)</Button>
                    </>
                  )}
                </div>

                <Button onClick={() => {
                  // broadcast reset so both players see it
                  if (!user) return
                  const me = user.user_metadata?.name || user.email
                  const note = {
                    user_id: user.id,
                    author: me,
                    content: `TICTACTOE_RESET|${me}`,
                    date: new Date().toISOString().slice(0,10)
                  }
                  // optimistic local reset + message
                  resetGame()
                  setMessages(prev => [{ author: note.author, content: 'Reset the game', date: note.date }, ...prev])
                  createNote(note).catch(() => {})
                }}>Reset</Button>
                <Button onClick={() => sendRematch()}>Rematch</Button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-2">
              <div className={`player-card ${currentPlayer === 'X' ? 'ring-1 ring-emerald-200' : ''}`}>
                <div className="player-avatar x">X</div>
                <div>
                  <div className="font-medium text-slate-700">{getDisplayName(playersMap['X'])}</div>
                  <div className="text-xs text-gray-500">{currentPlayer === 'X' ? 'Turn' : 'X'}</div>
                </div>
              </div>
              <div className={`player-card ${currentPlayer === 'O' ? 'ring-1 ring-emerald-200' : ''}`}>
                <div className="player-avatar o">O</div>
                <div>
                  <div className="font-medium text-slate-700">{getDisplayName(playersMap['O'])}</div>
                  <div className="text-xs text-gray-500">{currentPlayer === 'O' ? 'Turn' : 'O'}</div>
                </div>
              </div>
            </div>

            <div className="game-board">
              {board.map((cell, i) => {
                const isWinner = winnerLine.includes(i)
                const classes = ['game-cell']
                if (cell === 'X') classes.push('x')
                if (cell === 'O') classes.push('o')
                if (isWinner) classes.push('winner')
                const disabled = Boolean(board[i]) || Boolean(winner) || (myPlayer && myPlayer !== currentPlayer)
                if (disabled) classes.push('disabled')
                return (
                  <button
                    key={i}
                    onClick={() => handleCellClick(i)}
                    aria-label={`Cell ${i}`}
                    disabled={disabled}
                    className={classes.join(' ')}
                  >
                    <span className={`select-none`}>{cell}</span>
                  </button>
                )
              })}
            </div>

            <div className="text-sm text-gray-600">
              {winner ? (winner === 'draw' ? 'Draw! Nice one.' : `Winner: ${winner}`) : 'No winner yet'}
            </div>
            {turnMessage && <div className="text-sm text-red-500">{turnMessage}</div>}

            {/* Celebration: simple confetti/emojis when there's a winner */}
            {winner && winner !== 'draw' && (
              <div className="relative">
                <div className="tic-confetti" style={{left: '0', top: '-8px'}}>
                  <span style={{animationDelay: '0ms'}}>🎉</span>
                  <span style={{animationDelay: '80ms'}}>✨</span>
                  <span style={{animationDelay: '160ms'}}>🎊</span>
                </div>
              </div>
            )}

            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Move history</div>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {moveHistory.length === 0 && <div className="text-gray-400">No moves yet</div>}
                {moveHistory.map((m, i) => (
                  <div key={i} className="game-note-card flex items-center justify-between">
                    <div className="text-xs text-gray-600">{m.author}</div>
                    <div className="text-xs text-gray-700">{m.player} @ {m.idx}</div>
                    <div className="text-xs text-gray-400">{m.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}