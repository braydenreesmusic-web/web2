// Shared game utilities and parsing logic for Tic-Tac-Toe events
export const checkWinner = (b) => {
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

export const findWinningLine = (b) => {
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

// Replay an array of game event rows (ascending by date) and return derived state
export function replayGameEvents(events = []) {
  const emptyBoard = Array(9).fill(null)
  const board = emptyBoard.slice()
  let currentPlayer = 'X'
  let winner = null
  let winningLine = null
  const playersMap = {}
  const moveHistory = []
  const gameMessages = []
  let pendingProposal = null
  let pendingRematch = null

  const applyMove = (note) => {
    const content = note.content || ''
    if (!content.startsWith('TICTACTOE_MOVE|')) return false
    const parts = content.split('|')
    if (parts.length < 3) return false
    const idx = parseInt(parts[1], 10)
    const player = parts[2]
    if (!Number.isFinite(idx) || idx < 0 || idx > 8) return false
    board[idx] = player
    if (!playersMap[player]) playersMap[player] = note.user_id
    winner = checkWinner(board)
    currentPlayer = player === 'X' ? 'O' : 'X'
    moveHistory.push({ idx, player, author: note.author, user_id: note.user_id, date: note.date })
    return true
  }

  for (const n of events) {
    const content = n.content || ''
    if (content.startsWith('TICTACTOE_PROPOSE|')) {
      const parts = content.split('|')
      if (parts.length >= 3) {
        const side = parts[1]
        const author = parts[2]
        // optional author_id supplied in content (when server duplicated rows
        // for partner visibility we include the original inviter id as parts[3])
        const author_id = parts[3] || n.user_id
        pendingProposal = { side, author, author_id, date: n.date }
        continue
      }
    }
    if (content.startsWith('TICTACTOE_REMATCH|')) {
      const parts = content.split('|')
      if (parts.length >= 3) {
        const action = parts[1]
        if (action === 'PROPOSE') {
          const author = parts[2]
          pendingRematch = { author, author_id: n.user_id, date: n.date }
          continue
        }
        if (action === 'ACCEPT') {
          // accepted rematch — reset board
          pendingRematch = null
          board.fill(null)
          moveHistory.length = 0
          winner = null
          winningLine = null
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
        // Accepting a proposal means a new game begins with these assignments.
        // Reset board and history so only moves after this accept/start are applied.
        board.fill(null)
        moveHistory.length = 0
        winner = null
        winningLine = null
        currentPlayer = 'X'
        playersMap[side] = n.user_id
        playersMap[other] = playersMap[other] || null
        continue
      }
    }
    if (content.startsWith('TICTACTOE_START|')) {
      const parts = content.split('|')
      if (parts.length >= 3) {
        const side = parts[1]
        // Starting a game should reset any prior moves so the replay begins
        // from this START. Clear board and history and set current player.
        board.fill(null)
        moveHistory.length = 0
        winner = null
        winningLine = null
        currentPlayer = 'X'
        playersMap[side] = playersMap[side] || n.user_id
        continue
      }
    }
    if (applyMove(n)) continue
    if (content.startsWith('TICTACTOE_MSG|')) {
      gameMessages.push({ author: n.author, content: content.replace(/^TICTACTOE_MSG\|/, ''), date: n.date })
      continue
    }
  }

  winningLine = findWinningLine(board)

  return {
    board,
    currentPlayer,
    winner,
    winningLine,
    playersMap,
    moveHistory,
    gameMessages,
    pendingProposal,
    pendingRematch
  }
}

export default {
  checkWinner,
  findWinningLine,
  replayGameEvents
}
