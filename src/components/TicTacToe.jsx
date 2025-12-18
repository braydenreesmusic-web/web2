import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Button from './ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getGameEvents, createGameEvent, subscribeToGameEvents } from '../lib/lazyApi'
import { usePresence } from '../hooks/usePresence'
import { timeAgo } from '../lib/time'
import { useToast } from '../contexts/ToastContext'
import { replayGameEvents, checkWinner, findWinningLine } from '../services/game'
import { supabase } from '../lib/supabase'

export default function TicTacToe() {
  const { user } = useAuth()
  const { isPartnerOnline, partnerPresence, partnerUserId } = usePresence()
  const { showToast } = useToast()

  // Show a simple signed-in debug indicator when requested via query param
  let showDevControls = false
  try {
    showDevControls = (typeof window !== 'undefined') && (import.meta.env?.DEV || new URLSearchParams(window.location.search).has('debug_game_events'))
  } catch (e) {
    showDevControls = !!(typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug_game_events'))
  }
  const showSignedInDebug = showDevControls && !!user

  const emptyBoard = Array(9).fill(null)
  const [board, setBoard] = useState(emptyBoard)
  const [currentPlayer, setCurrentPlayer] = useState('X')
  const [winner, setWinner] = useState(null)
  const [winningLine, setWinningLine] = useState(null)
  const [playersMap, setPlayersMap] = useState({})
  const [myPlayer, setMyPlayer] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [turnMessage, setTurnMessage] = useState('')
  const turnMessageTimeout = useRef(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const [pendingRematch, setPendingRematch] = useState(null)
  const [gameMessages, setGameMessages] = useState([])
  const [gameInput, setGameInput] = useState('')
  const rematchTimer = useRef(null)
  const REMATCH_TIMEOUT_MS = 2 * 60 * 1000

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const subRef = { current: null }

    const load = async () => {
      try {
        const ev = await getGameEvents(user.id)
        if (cancelled) return
        const events = (ev || []).sort((a,b)=> new Date(a.date) - new Date(b.date))
        const parsed = replayGameEvents(events)
        if (process.env.NODE_ENV === 'development') {
          try { console.debug && console.debug('TicTacToe: initial parsed', parsed) } catch (e) {}
        }
        setGameMessages(parsed.gameMessages)
        setBoard(parsed.board)
        setCurrentPlayer(parsed.currentPlayer)
        setWinner(parsed.winner)
        setWinningLine(parsed.winningLine)
        setPlayersMap(parsed.playersMap)
        // Prefer the proposal that belongs to this user (if present).
        try {
          const meId = user?.id
          let pp = null
          if (parsed.pendingProposalMap && meId) pp = parsed.pendingProposalMap[meId] || null
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
          setPendingProposal(pp)
        } catch (e) {
          setPendingProposal(parsed.pendingProposal)
        }
        setPendingRematch(parsed.pendingRematch)
        setMoveHistory(parsed.moveHistory)
        const myAssigned = Object.keys(parsed.playersMap).find(p => parsed.playersMap[p] === user.id)
        setMyPlayer(myAssigned || null)
      } catch (e) {
        console.error('TicTacToe load failed', e)
      }
    }

    load()

    const sub = subscribeToGameEvents(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const n = payload.new
        if (!n) return
        const content = n.content || ''
        if (process.env.NODE_ENV === 'development') {
          try {
            console.debug('TicTacToe realtime INSERT', { new: n, payload })
          } catch (e) {}
        }
        // For deterministic state and to avoid issues with out-of-order realtime
        // payloads, re-fetch the full game events and replay the canonical state.
        // This keeps both players' UI consistent regardless of local optimistic updates.
        if ((content || '').startsWith('TICTACTOE_')) {
          getGameEvents(user.id).then(ev => {
            if (process.env.NODE_ENV === 'development') console.debug('TicTacToe: refetching game_events due to insert', n.id)
            const events = (ev || []).sort((a,b)=> new Date(a.date) - new Date(b.date))
            const parsed = replayGameEvents(events)
            if (process.env.NODE_ENV === 'development') console.debug('TicTacToe: parsed on INSERT', parsed)
            setGameMessages(parsed.gameMessages)
            setBoard(parsed.board)
            setCurrentPlayer(parsed.currentPlayer)
            setWinner(parsed.winner)
            setWinningLine(parsed.winningLine)
            setPlayersMap(parsed.playersMap)
            try {
              const meId = user?.id
              let pp = parsed.pendingProposal ? { ...parsed.pendingProposal } : null
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
              setPendingProposal(pp)
            } catch (e) {
              setPendingProposal(parsed.pendingProposal)
            }
            setPendingRematch(parsed.pendingRematch)
            setMoveHistory(parsed.moveHistory)
            const myAssigned = Object.keys(parsed.playersMap).find(p => parsed.playersMap[p] === user.id)
            setMyPlayer(myAssigned || null)
          }).catch(e => console.error('TicTacToe: replay on INSERT failed', e))
        }
      }
    })

    // keep a ref to the subscription so we can check it from visibility handler
    try { subRef.current = sub } catch (e) { /* ignore */ }

    // If the client was backgrounded (common on mobile) the realtime socket
    // or subscription can be paused by the browser. When the page becomes
    // visible again, proactively re-fetch canonical game events so the UI
    // immediately reflects the latest state without a full browser refresh.
    const handleVisibility = () => {
      try {
        if (document.visibilityState === 'visible') {
          // re-sync authoritative state
          getGameEvents(user.id).then(ev => {
            const events = (ev || []).sort((a,b)=> new Date(a.date) - new Date(b.date))
            const parsed = replayGameEvents(events)
            setGameMessages(parsed.gameMessages)
            setBoard(parsed.board)
            setCurrentPlayer(parsed.currentPlayer)
            setWinner(parsed.winner)
            setWinningLine(parsed.winningLine)
            setPlayersMap(parsed.playersMap)
            try {
              const meId = user?.id
              let pp = parsed.pendingProposal ? { ...parsed.pendingProposal } : null
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
              setPendingProposal(pp)
            } catch (e) {
              setPendingProposal(parsed.pendingProposal)
            }
            setPendingRematch(parsed.pendingRematch)
            setMoveHistory(parsed.moveHistory)
            const myAssigned = Object.keys(parsed.playersMap).find(p => parsed.playersMap[p] === user.id)
            setMyPlayer(myAssigned || null)
          }).catch(e => console.error('TicTacToe: visibility resync failed', e))
        }
      } catch (e) {
        console.error('visibility handler failed', e)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      try { sub.unsubscribe() } catch (e) {}
      if (rematchTimer.current) clearTimeout(rematchTimer.current)
      try { document.removeEventListener('visibilitychange', handleVisibility) } catch (e) {}
    }
  }, [user])

  const resetGame = () => {
    setBoard(emptyBoard)
    setCurrentPlayer('X')
    setWinner(null)
    setWinningLine(null)
  }

  const handleCellClick = (idx) => {
    if (board[idx] || winner || !user) return
    if (myPlayer && myPlayer !== currentPlayer) {
      setTurnMessage('Not your turn')
      if (turnMessageTimeout.current) clearTimeout(turnMessageTimeout.current)
      turnMessageTimeout.current = setTimeout(() => setTurnMessage(''), 1500)
      return
    }
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

    const movePlayer = board[idx] || currentPlayer
    const moveContent = `TICTACTOE_MOVE|${idx}|${movePlayer}`
    const payload = { idx, player: movePlayer, user_id: user.id, author: user.user_metadata?.name || user.email }

    if (process.env.NODE_ENV === 'development') console.debug('TicTacToe: submitting move', payload)

    // Server-validated move: POST to /api/validate-move which will check turn
    // order and cell occupancy before inserting into `game_events`.
    fetch('/api/validate-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      if (!res.ok) {
        const txt = await res.text().catch(()=>null)
        console.warn('validate-move rejected', res.status, txt)
        showToast && showToast((txt && JSON.parse(txt)?.error) || txt || 'Move rejected', { type: 'error' })
        // Re-sync canonical game_events and replay authoritative state so
        // client doesn't remain optimistic when server rejects the move.
        try {
          const ev = await getGameEvents(user.id)
          const events = (ev || []).sort((a,b)=> new Date(a.date) - new Date(b.date))
          const parsed = replayGameEvents(events)
          setGameMessages(parsed.gameMessages)
          setBoard(parsed.board)
          setCurrentPlayer(parsed.currentPlayer)
          setWinner(parsed.winner)
          setWinningLine(parsed.winningLine)
          setPlayersMap(parsed.playersMap)
          try {
            const pp = parsed.pendingProposal ? { ...parsed.pendingProposal } : null
            if (pp && !pp.author_id && pp.row_user_id) pp.author_id = pp.row_user_id
            setPendingProposal(pp)
          } catch (e) {
            setPendingProposal(parsed.pendingProposal)
          }
          setPendingRematch(parsed.pendingRematch)
          setMoveHistory(parsed.moveHistory)
          const myAssigned = Object.keys(parsed.playersMap).find(p => parsed.playersMap[p] === user.id)
          setMyPlayer(myAssigned || null)
        } catch (e) {
          console.error('validate-move: failed to re-sync events', e)
        }
      }
    }).catch((err) => {
      console.error('validate-move request failed', err)
    })
  }

  const proposeStart = (side) => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_PROPOSE|${side}|${me}|${user.id}`, date: new Date().toISOString() }
    setPendingProposal({ side, author: me, author_id: user.id, date: note.date })
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
          try { console.debug('send-game-invite response', JSON.stringify(json, null, 2)) } catch (e) {}
          try { console.debug('send-game-invite compact', json?.inserted_user_ids || json?.inserted_contents) } catch (e) {}
          showToast && showToast(`Invite sent — ${me} proposed ${side}`, { type: 'success' })
        } catch (e) {
          console.error('send-game-invite error', e)
          showToast && showToast('Invite failed', { type: 'error' })
        }
      })()
    } else {
      createGameEvent(note).then(() => { showToast && showToast(`Invite sent — ${me} proposed ${side}`, { type: 'success' }) }).catch(() => { showToast && showToast('Invite failed', { type: 'error' }) })
    }
  }

  const startGame = (side) => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    setPlayersMap(prev => ({ ...prev, [side]: user.id }))
    setMyPlayer(side)
    setBoard(emptyBoard)
    setCurrentPlayer('X')
    setWinner(null)
    setMoveHistory([])
    const note = { user_id: user.id, author: me, content: `TICTACTOE_START|${side}|${me}`, date: new Date().toISOString() }
    createGameEvent(note).then(() => { showToast && showToast(`Game started as ${side}`, { type: 'success' }) }).catch(() => { showToast && showToast('Failed to start game', { type: 'error' }) })
  }

  const proposeRematch = () => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_REMATCH|PROPOSE|${me}`, date: new Date().toISOString() }
    setPendingRematch({ author: me, author_id: user.id, date: note.date })
    if (rematchTimer.current) clearTimeout(rematchTimer.current)
    rematchTimer.current = setTimeout(() => { setPendingRematch(null) }, REMATCH_TIMEOUT_MS)
    createGameEvent(note).then(() => { showToast && showToast('Rematch proposed', { type: 'success' }) }).catch(() => { showToast && showToast('Rematch failed', { type: 'error' }) })
  }

  const acceptRematch = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_REMATCH|ACCEPT|${proposal.author}|${me}`, date: new Date().toISOString() }
    setPendingRematch(null)
    if (rematchTimer.current) { clearTimeout(rematchTimer.current); rematchTimer.current = null }
    createGameEvent(note).then(() => { showToast && showToast('Rematch accepted', { type: 'success' }) }).catch(() => { showToast && showToast('Failed to accept rematch', { type: 'error' }) })
  }

  const acceptProposal = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const side = proposal.side
    const note = { user_id: user.id, author: me, content: `TICTACTOE_ACCEPT|${side}|${proposal.author}|${me}`, date: new Date().toISOString() }
    const other = side === 'X' ? 'O' : 'X'
    setPlayersMap(prev => ({ ...prev, [side]: proposal.author_id || proposal.author || null, [other]: user.id }))
    setMyPlayer(other)
    setPendingProposal(null)
    createGameEvent(note).then(() => { showToast && showToast(`Accepted invite — you are ${other}`, { type: 'success' }) }).catch(() => { showToast && showToast('Failed to accept invite', { type: 'error' }) })
  }

  const declineProposal = (proposal) => {
    // simple local decline (no server-side row necessary)
    setPendingProposal(null)
  }

  const sendGameMessage = async () => {
    if (!gameInput.trim() || !user) return
    const me = user.user_metadata?.name || user.email
    const content = `TICTACTOE_MSG|${gameInput.trim()}`
    const note = { user_id: user.id, author: me, content, date: new Date().toISOString() }
    setGameMessages(prev => [{ author: note.author, content: gameInput.trim(), date: note.date }, ...prev])
    setGameInput('')
    try { await createGameEvent(note) } catch (e) { console.error('sendGameMessage failed', e) }
  }

  return (
    <div className="space-y-4">
      {showSignedInDebug && (
        <div className="mb-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-xs text-gray-700">Signed in as <strong>{user.user_metadata?.name || user.email}</strong> <span className="ml-2 font-mono text-xs text-gray-500">{user.id}</span></div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Tic‑Tac‑Toe</div>
          <div className="text-xs text-gray-500">{myPlayer ? `You are ${myPlayer}` : 'Spectating'}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-sm px-2 py-1 rounded-md ${currentPlayer === myPlayer ? 'bg-slate-200' : 'bg-transparent'}`}>Active: {currentPlayer}</div>
          {partnerUserId ? (
            <>
              <Button onClick={() => startGame('X')}>Start X</Button>
              <Button onClick={() => startGame('O')}>Start O</Button>
              <Button onClick={() => proposeStart('X')} className="px-3 py-1">Invite X</Button>
              <Button onClick={() => proposeStart('O')} className="px-3 py-1">Invite O</Button>
            </>
          ) : (
            <div className="text-xs text-gray-400">No partner linked — open profile to invite</div>
          )}
        </div>
      </div>

      {pendingProposal && pendingProposal.author_id !== user?.id && (
        <div className="mb-3 p-3 rounded-md bg-amber-50 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Game invite</div>
              <div className="text-xs text-gray-600">{pendingProposal.author} invited you to play as {pendingProposal.side}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => acceptProposal(pendingProposal)}>Accept</Button>
              <Button onClick={() => declineProposal(pendingProposal)} className="bg-white">Decline</Button>
            </div>
          </div>
        </div>
      )}

      <div className="ttt-board">
        {board.map((cell, i) => {
          const disabled = Boolean(cell || winner || (myPlayer && myPlayer !== currentPlayer))
          const isWin = Array.isArray(winningLine) && winningLine.includes(i)
          return (
            <button key={i} onClick={() => handleCellClick(i)} disabled={disabled} aria-label={cell ? `${cell} at ${i}` : `empty cell ${i}`} className={clsx('ttt-cell rounded-lg glass-card flex items-center justify-center text-2xl transition-colors', disabled ? 'opacity-80 cursor-not-allowed' : 'active:scale-95', isWin ? 'ring-2 ring-emerald-300 bg-emerald-50' : 'bg-white')}>
              <span className="select-none text-xl sm:text-2xl">{cell}</span>
            </button>
          )
        })}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="text-sm text-gray-600">Move history</div>
          <div className="max-h-48 overflow-y-auto mt-2 space-y-2 touch-scroll">
            {moveHistory.length === 0 && <div className="text-gray-400">No moves yet</div>}
            {moveHistory.map((m, i) => (
              <div key={i} className="glass-card p-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {m.user_id === user?.id && user?.user_metadata?.avatar ? (
                    <img src={user.user_metadata.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="player-avatar" style={{background: `linear-gradient(135deg, hsl(${(m.author||'A').charCodeAt(0)%360} 60% 36%), hsl(${((m.author||'A').charCodeAt(0)+45)%360} 55% 44% )`}}>{(m.author||'U').slice(0,1).toUpperCase()}</div>
                  )}
                  <div className="text-xs text-gray-600">{m.author}</div>
                </div>
                <div className="text-xs text-gray-700">{m.player} @ {m.idx}</div>
                <div className="text-xs text-gray-400">{m.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-80">
          <div className="text-sm text-gray-600">Game Chat</div>
          <div className="max-h-64 overflow-y-auto mt-2 space-y-2 touch-scroll">
            {gameMessages.length === 0 && <div className="text-gray-400">No game messages yet</div>}
            {gameMessages.map((m, i) => (
              <div key={i} className="glass-card p-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">{m.author}</div>
                  <div className="text-xs text-gray-400">{m.date ? timeAgo(m.date) : ''}</div>
                </div>
                <div className="mt-1 text-sm text-gray-800">{m.content}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input value={gameInput} onChange={(e)=>setGameInput(e.target.value)} placeholder="Say something about the move…" className="flex-1 px-3 py-2 rounded-xl border" onKeyDown={(e)=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendGameMessage(); } }} />
            <Button onClick={sendGameMessage}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
