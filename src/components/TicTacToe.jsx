import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Button from './ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getGameEvents, createGameEvent, subscribeToGameEvents } from '../services/api'
import { usePresence } from '../hooks/usePresence'
import { timeAgo } from '../lib/time'
import { replayGameEvents, checkWinner, findWinningLine } from '../services/game'

export default function TicTacToe() {
  const { user } = useAuth()
  const { isPartnerOnline, partnerPresence, partnerUserId } = usePresence()

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

    const load = async () => {
      try {
        const ev = await getGameEvents(user.id)
        if (cancelled) return
        const events = (ev || []).sort((a,b)=> new Date(a.date) - new Date(b.date))
        const parsed = replayGameEvents(events)
        setGameMessages(parsed.gameMessages)
        setBoard(parsed.board)
        setCurrentPlayer(parsed.currentPlayer)
        setWinner(parsed.winner)
        setWinningLine(parsed.winningLine)
        setPlayersMap(parsed.playersMap)
        setPendingProposal(parsed.pendingProposal)
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
            setGameMessages(parsed.gameMessages)
            setBoard(parsed.board)
            setCurrentPlayer(parsed.currentPlayer)
            setWinner(parsed.winner)
            setWinningLine(parsed.winningLine)
            setPlayersMap(parsed.playersMap)
            setPendingProposal(parsed.pendingProposal)
            setPendingRematch(parsed.pendingRematch)
            setMoveHistory(parsed.moveHistory)
            const myAssigned = Object.keys(parsed.playersMap).find(p => parsed.playersMap[p] === user.id)
            setMyPlayer(myAssigned || null)
          }).catch(e => console.error('TicTacToe: replay on INSERT failed', e))
        }
      }
    })

    return () => {
      sub.unsubscribe()
      if (rematchTimer.current) clearTimeout(rematchTimer.current)
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
      }
    }).catch((err) => {
      console.error('validate-move request failed', err)
    })
  }

  const proposeStart = (side) => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_PROPOSE|${side}|${me}`, date: new Date().toISOString() }
    setPendingProposal({ side, author: me, author_id: user.id, date: note.date })
    createGameEvent(note).catch(() => {})
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
    createGameEvent(note).catch(() => {})
  }

  const proposeRematch = () => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_REMATCH|PROPOSE|${me}`, date: new Date().toISOString() }
    setPendingRematch({ author: me, author_id: user.id, date: note.date })
    if (rematchTimer.current) clearTimeout(rematchTimer.current)
    rematchTimer.current = setTimeout(() => { setPendingRematch(null) }, REMATCH_TIMEOUT_MS)
    createGameEvent(note).catch(() => {})
  }

  const acceptRematch = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_REMATCH|ACCEPT|${proposal.author}|${me}`, date: new Date().toISOString() }
    setPendingRematch(null)
    if (rematchTimer.current) { clearTimeout(rematchTimer.current); rematchTimer.current = null }
    createGameEvent(note).catch(() => {})
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
    createGameEvent(note).catch(() => {})
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
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Tic‑Tac‑Toe</div>
          <div className="text-xs text-gray-500">{myPlayer ? `You are ${myPlayer}` : 'Spectating'}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-sm px-2 py-1 rounded-md ${currentPlayer === myPlayer ? 'bg-slate-200' : 'bg-transparent'}`}>Active: {currentPlayer}</div>
          <Button onClick={() => startGame('X')}>Start X</Button>
          <Button onClick={() => startGame('O')}>Start O</Button>
        </div>
      </div>

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
          <div className="max-h-48 overflow-y-auto mt-2 space-y-2">
            {moveHistory.length === 0 && <div className="text-gray-400">No moves yet</div>}
            {moveHistory.map((m, i) => (
              <div key={i} className="glass-card p-2 flex items-center justify-between">
                <div className="text-xs text-gray-600">{m.author}</div>
                <div className="text-xs text-gray-700">{m.player} @ {m.idx}</div>
                <div className="text-xs text-gray-400">{m.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-80">
          <div className="text-sm text-gray-600">Game Chat</div>
          <div className="max-h-64 overflow-y-auto mt-2 space-y-2">
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
