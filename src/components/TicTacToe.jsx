import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Button from './ui/button.jsx'
import { useAuth } from '../contexts/AuthContext'
import { getNotes, createNote, subscribeToNotes, getCheckIns } from '../services/api'
import { usePresence } from '../hooks/usePresence'
import { timeAgo } from '../lib/time'

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

  const findWinningLine = (b) => {
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

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const [nt] = await Promise.all([ getNotes(user.id) ])
        if (cancelled) return
        const notes = nt || []
        notes.sort((a,b)=> new Date(a.date) - new Date(b.date))

        let replayBoard = Array(9).fill(null)
        let replayCurrent = 'X'
        let replayWinner = null
        const replayPlayers = {}
        const replayHistory = []
        const gmsgs = []

        const applyMoveNote = (note) => {
          const content = note.content || ''
          if (!content || !content.startsWith('TICTACTOE_MOVE|')) return false
          const parts = content.split('|')
          if (parts.length < 3) return false
          const idx = parseInt(parts[1], 10)
          const player = parts[2]
          if (Number.isFinite(idx) && idx >= 0 && idx < 9) {
            replayBoard[idx] = player
            if (!replayPlayers[player]) replayPlayers[player] = note.user_id
            replayWinner = checkWinner(replayBoard)
            replayCurrent = player === 'X' ? 'O' : 'X'
            replayHistory.push({ idx, player, author: note.author, user_id: note.user_id, date: note.date })
            return true
          }
          return false
        }

        for (const n of notes) {
          const content = n.content || ''
          if (content.startsWith('TICTACTOE_PROPOSE|')) {
            const parts = content.split('|')
            if (parts.length >= 3) {
              const side = parts[1]
              const authorName = parts[2]
              replayPlayers.__proposal = { side, author: authorName, author_id: n.user_id, date: n.date }
              continue
            }
          }
          if (content.startsWith('TICTACTOE_REMATCH|')) {
            const parts = content.split('|')
            if (parts.length >= 3) {
              const action = parts[1]
              if (action === 'PROPOSE') {
                const authorName = parts[2]
                replayPlayers.__rematch = { author: authorName, author_id: n.user_id, date: n.date }
                continue
              }
              if (action === 'ACCEPT') {
                const proposer = parts[2]
                const accepter = parts[3]
                continue
              }
            }
          }
          if (content.startsWith('TICTACTOE_ACCEPT|')) {
            const parts = content.split('|')
            if (parts.length >= 4) {
              const side = parts[1]
              const proposer = parts[2]
              const accepter = parts[3]
              const other = side === 'X' ? 'O' : 'X'
              replayPlayers[side] = n.user_id
              replayPlayers[other] = replayPlayers[other] || null
              continue
            }
          }
          if (content.startsWith('TICTACTOE_START|')) {
            const parts = content.split('|')
            if (parts.length >= 3) {
              const side = parts[1]
              // record start author by user id when available
              replayPlayers[side] = replayPlayers[side] || n.user_id
              continue
            }
          }
          if (!applyMoveNote(n)) {
            if (content.startsWith('TICTACTOE_MSG|')) {
              gmsgs.push({ author: n.author, content: content.replace(/^TICTACTOE_MSG\|/, ''), date: n.date })
              continue
            }
          }
        }

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
        const me = user.user_metadata?.name || user.email
        const myAssigned = Object.keys(replayPlayers).find(p => replayPlayers[p] === me)
        setMyPlayer(myAssigned || null)
      } catch (e) {
        console.error('TicTacToe load failed', e)
      }
    })()

    const sub = subscribeToNotes(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const n = payload.new
        if (!n) return
        const mine = n.user_id === user.id
        const partnerRow = partnerUserId && n.user_id === partnerUserId
        const isGameEvent = (n.content || '').startsWith('TICTACTOE_')
        if (!mine && !partnerRow && !isGameEvent) return
        const content = n.content || ''
        if (content.startsWith('TICTACTOE_MSG|')) {
          const body = content.replace(/^TICTACTOE_MSG\|/, '')
          setGameMessages(prev => [{ author: n.author, content: body, date: n.date }, ...prev])
          return
        }
        if (content.startsWith('TICTACTOE_START|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const side = parts[1]
            const author = parts[2]
            const other = side === 'X' ? 'O' : 'X'
            setPlayersMap(prev => ({ ...prev, [side]: n.user_id, [other]: prev[other] || null }))
            resetGame()
            if (n.user_id === user.id) setMyPlayer(side)
          }
          return
        }
        if (content.startsWith('TICTACTOE_PROPOSE|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const side = parts[1]
            const author = parts[2]
            setPendingProposal({ side, author, author_id: n.user_id, date: n.date })
          }
          return
        }
        if (content.startsWith('TICTACTOE_REMATCH|')) {
          const parts = content.split('|')
          if (parts.length >= 3) {
            const action = parts[1]
            if (action === 'PROPOSE') {
              const author = parts[2]
              setPendingRematch({ author, author_id: n.user_id, date: n.date })
            }
            if (action === 'ACCEPT') {
              const proposer = parts[2]
              const accepter = parts[3]
              setPendingRematch(null)
              setBoard(emptyBoard)
              setMoveHistory([])
              setWinner(null)
              setWinningLine(null)
              setPlayersMap(prev => {
                try {
                  if (prev && prev.X && prev.O) {
                    const next = { X: prev.O, O: prev.X }
                    const found = Object.keys(next).find(p => next[p] === user.id)
                    if (found) setMyPlayer(found)
                    return next
                  }
                } catch (e) {}
                return prev
              })
            }
          }
          return
        }
        if (content.startsWith('TICTACTOE_ACCEPT|')) {
          const parts = content.split('|')
          if (parts.length >= 4) {
            const side = parts[1]
            const proposer = parts[2]
            const accepter = parts[3]
            const other = side === 'X' ? 'O' : 'X'
            setPlayersMap(prev => ({ ...prev, [side]: prev[side] || null, [other]: n.user_id }))
            setPendingProposal(null)
            if (n.user_id === user.id) setMyPlayer(other)
            if (proposer === (user.user_metadata?.name || user.email)) setMyPlayer(side)
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
              if (nb[idx]) return prev
              nb[idx] = player
              const w = checkWinner(nb)
              if (w) setWinner(w)
              setCurrentPlayer(player === 'X' ? 'O' : 'X')
              return nb
            })
            setPlayersMap(prev => {
              const next = { ...prev }
              if (!next[player]) next[player] = n.user_id
              if (n.user_id === user.id) { try { setMyPlayer(player) } catch (e) {} }
              return next
            })
            setMoveHistory(prev => [{ idx, player, author: n.author, date: n.date }, ...prev])
          }
        } else if (content.startsWith('TICTACTOE_RESET')) {
          resetGame()
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

    const moveContent = `TICTACTOE_MOVE|${idx}|${board[idx] || currentPlayer}`
    const note = { user_id: user.id, author: user.user_metadata?.name || user.email, content: moveContent, date: new Date().toISOString() }
    createNote(note).catch(() => {})
  }

  const proposeStart = (side) => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_PROPOSE|${side}|${me}`, date: new Date().toISOString() }
    setPendingProposal({ side, author: me, author_id: user.id, date: note.date })
    createNote(note).catch(() => {})
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
    createNote(note).catch(() => {})
  }

  const proposeRematch = () => {
    if (!user) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_REMATCH|PROPOSE|${me}`, date: new Date().toISOString() }
    setPendingRematch({ author: me, author_id: user.id, date: note.date })
    if (rematchTimer.current) clearTimeout(rematchTimer.current)
    rematchTimer.current = setTimeout(() => { setPendingRematch(null) }, REMATCH_TIMEOUT_MS)
    createNote(note).catch(() => {})
  }

  const acceptRematch = (proposal) => {
    if (!user || !proposal) return
    const me = user.user_metadata?.name || user.email
    const note = { user_id: user.id, author: me, content: `TICTACTOE_REMATCH|ACCEPT|${proposal.author}|${me}`, date: new Date().toISOString() }
    setPendingRematch(null)
    if (rematchTimer.current) { clearTimeout(rematchTimer.current); rematchTimer.current = null }
    createNote(note).catch(() => {})
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
    createNote(note).catch(() => {})
  }

  const sendGameMessage = async () => {
    if (!gameInput.trim() || !user) return
    const me = user.user_metadata?.name || user.email
    const content = `TICTACTOE_MSG|${gameInput.trim()}`
    const note = { user_id: user.id, author: me, content, date: new Date().toISOString() }
    setGameMessages(prev => [{ author: note.author, content: gameInput.trim(), date: note.date }, ...prev])
    setGameInput('')
    try { await createNote(note) } catch (e) { console.error('sendGameMessage failed', e) }
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
