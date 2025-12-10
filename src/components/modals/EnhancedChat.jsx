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
  const [mode, setMode] = useState('chat') // 'chat' or 'play'

  // Tic-tac-toe state (local-only)
  const emptyBoard = Array(9).fill(null)
  const [board, setBoard] = useState(emptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState('X')
  const [winner, setWinner] = useState(null)
  const [playersMap, setPlayersMap] = useState({}) // e.g. { X: 'Alice', O: 'Bob' }
  const [myPlayer, setMyPlayer] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [turnMessage, setTurnMessage] = useState('')
  const turnMessageTimeout = useRef(null)
  const [pendingProposal, setPendingProposal] = useState(null)

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
            // map player to author if not already set
            if (!replayPlayers[player]) replayPlayers[player] = note.author
            replayWinner = checkWinner(replayBoard)
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
              const author = parts[2]
              // keep the most recent proposal
              replayPlayers.__proposal = { side, author, date: n.date }
              continue
            }
          }
          if (content.startsWith('TICTACTOE_ACCEPT|')) {
            const parts = content.split('|')
            if (parts.length >= 4) {
              const side = parts[1]
              const proposer = parts[2]
              const accepter = parts[3]
              const other = side === 'X' ? 'O' : 'X'
              replayPlayers[side] = proposer
              replayPlayers[other] = accepter
              continue
            }
          }
          if (content.startsWith('TICTACTOE_START|')) {
            const parts = content.split('|')
            if (parts.length >= 3) {
              const side = parts[1]
              const author = parts[2]
              replayPlayers[side] = replayPlayers[side] || author
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
        const proposal = replayPlayers.__proposal || null
        if (proposal) delete replayPlayers.__proposal
        setPlayersMap(replayPlayers)
        setPendingProposal(proposal)
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
        // parse tic-tac-toe messages specially
        const content = n.content || ''
        // START
        if (content.startsWith('TICTACTOE_START|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const side = parts[1]
            const author = parts[2]
            const other = side === 'X' ? 'O' : 'X'
            setPlayersMap(prev => ({ ...prev, [side]: author, [other]: prev[other] || null }))
            resetGame()
            // if I started, claim the side locally
            const me = user.user_metadata?.name || user.email
            if (author === me) setMyPlayer(side)
            setMessages(prev => [{ author: n.author, content: `${author} started as ${side}`, date: n.date }, ...prev])
          }
          return
        }

        // PROPOSE
        if (content.startsWith('TICTACTOE_PROPOSE|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const side = parts[1]
            const author = parts[2]
            setPendingProposal({ side, author, date: n.date })
            setMessages(prev => [{ author: n.author, content: `Proposed: ${author} as ${side}`, date: n.date }, ...prev])
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
            setPlayersMap(prev => ({ ...prev, [side]: proposer, [other]: accepter }))
            setPendingProposal(null)
            setMessages(prev => [{ author: n.author, content: `${accepter} accepted ${proposer}'s proposal for ${side}`, date: n.date }, ...prev])
            // assign myPlayer if I'm one of the participants
            const me = user.user_metadata?.name || user.email
            if (proposer === me) setMyPlayer(side)
            if (accepter === me) setMyPlayer(other)
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
              if (w) setWinner(w)
              setCurrentPlayer(player === 'X' ? 'O' : 'X')
              return nb
            })
            // map player to author and set myPlayer if this move was by me
            setPlayersMap(prev => {
              const next = { ...prev }
              if (!next[player]) next[player] = n.author
              // If the author of the move is me, ensure myPlayer is set to that side
              const me = user.user_metadata?.name || user.email
              if (n.author === me) {
                try { setMyPlayer(player) } catch (e) {}
              }
              return next
            })
            setMoveHistory(prev => [{ idx, player, author: n.author, date: n.date }, ...prev])
            setMessages(prev => [{ author: n.author, content: `Played ${player} at ${idx}`, date: n.date }, ...prev])
          }
        } else if (content.startsWith('TICTACTOE_RESET')) {
          resetGame()
          setMessages(prev => [{ author: n.author, content: 'Reset the game', date: n.date }, ...prev])
        } else {
          setMessages(prev => [{ author: n.author, content: n.content, date: n.date }, ...prev])
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
    setMessages(prev => [{ author: note.author, content: `Started game as ${side}`, date: note.date }, ...prev])
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
    setMessages(prev => [{ author: note.author, content: `Proposed: ${me} as ${side}`, date: note.date }, ...prev])
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
    setMessages(prev => [{ author: note.author, content: `${me} accepted ${proposal.author}'s proposal for ${side}`, date: note.date }, ...prev])
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
            <span className={`w-2 h-2 rounded-full ${isPartnerOnline ? 'bg-slate-600' : 'bg-gray-300'}`}/>
            <span>{isPartnerOnline ? 'Partner active now' : 'Partner offline'}</span>
          </div>
          <div className="text-gray-500">{isTyping ? 'typing…' : ''}</div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setMode('chat')} className={`px-3 py-1 rounded-xl ${mode==='chat' ? 'bg-slate-100' : 'bg-transparent'}`}>Chat</button>
          <button onClick={() => setMode('play')} className={`px-3 py-1 rounded-xl ${mode==='play' ? 'bg-slate-100' : 'bg-transparent'}`}>Play</button>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
          {messages.map((m, i) => (
            <div key={i} className="glass-card p-2">
              <div className="text-xs text-gray-500">{m.author} • {m.date}</div>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Tic‑Tac‑Toe — current: {currentPlayer}</div>
                <div className="text-xs text-gray-500">
                  {myPlayer ? `You are ${myPlayer}` : 'You are spectating — play to claim a side.'}
                </div>
              </div>
              <div className="text-sm">
                <span className={`px-2 py-1 rounded-md ${currentPlayer === myPlayer ? 'bg-slate-200' : 'bg-transparent'} text-sm`}>Active: {currentPlayer}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Button onClick={() => {
                  if (!user) return
                  const note = {
                    user_id: user.id,
                    author: user.user_metadata?.name || user.email,
                    content: 'Game invite: Tic-Tac-Toe — want to play?',
                    date: new Date().toISOString().slice(0,10)
                  }
                  setMessages(prev => [{ author: note.author, content: note.content, date: note.date }, ...prev])
                  createNote(note).catch(() => {})
                }}>Invite partner</Button>

                {!pendingProposal && (
                  <>
                    <Button onClick={() => proposeStart('X')}>Propose X</Button>
                    <Button onClick={() => proposeStart('O')}>Propose O</Button>
                    <Button onClick={() => startGame('X')}>Start (X immediate)</Button>
                    <Button onClick={() => startGame('O')}>Start (O immediate)</Button>
                  </>
                )}

                {pendingProposal && pendingProposal.author !== (user.user_metadata?.name || user.email) && (
                  <>
                    <div className="text-xs text-gray-500">{pendingProposal.author} proposed {pendingProposal.side}</div>
                    <Button onClick={() => acceptProposal(pendingProposal)}>Accept</Button>
                    <Button onClick={() => declineProposal(pendingProposal)}>Decline</Button>
                  </>
                )}

                {pendingProposal && pendingProposal.author === (user.user_metadata?.name || user.email) && (
                  <div className="text-xs text-gray-500">Proposal sent: {pendingProposal.side}</div>
                )}

                <Button onClick={resetGame}>Reset</Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 w-64">
              {board.map((cell, i) => (
                <button key={i} onClick={() => handleCellClick(i)} className="h-16 w-16 rounded-lg glass-card flex items-center justify-center text-2xl transition transform hover:scale-105">
                  <span className={`select-none`}>{cell}</span>
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-600">
              {winner ? (winner === 'draw' ? 'Draw! Nice one.' : `Winner: ${winner}`) : 'No winner yet'}
            </div>
            {turnMessage && <div className="text-sm text-red-500">{turnMessage}</div>}

            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">Move history</div>
              <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                {moveHistory.length === 0 && <div className="text-gray-400">No moves yet</div>}
                {moveHistory.map((m, i) => (
                  <div key={i} className="flex items-center justify-between glass-card p-2">
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