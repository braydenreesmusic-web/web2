const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const DEBUG_SECRET = process.env.GAME_EVENTS_DEBUG_SECRET || process.env.DEBUG_SECRET

function setCORS(res, req) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-debug-secret')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export default async function handler(req, res) {
  setCORS(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SERVICE_KEY in env' })
  }

  try {
    const body = req.body || {}
    const { idx, player, user_id } = body
    const reqDebugSecret = req.headers['x-debug-secret'] || req.headers['x-debug-token']
    const verbose = DEBUG_SECRET && reqDebugSecret === DEBUG_SECRET
    if (typeof idx !== 'number' || !['X','O'].includes(player) || !user_id) {
      return res.status(400).json({ error: 'Missing or invalid idx/player/user_id' })
    }

    const relUrl = `${SUPABASE_URL}/rest/v1/relationships?user_id=eq.${user_id}`
    const relRes = await fetch(relUrl, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    const relRows = relRes.ok ? await relRes.json() : []
    let partnerId = null
    if (relRows && relRows.length) {
      partnerId = relRows[0].partner_user_id || null
    } else {
      const rel2Url = `${SUPABASE_URL}/rest/v1/relationships?partner_user_id=eq.${user_id}`
      const rel2Res = await fetch(rel2Url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
      const rel2 = rel2Res.ok ? await rel2Res.json() : []
      if (rel2 && rel2.length) partnerId = rel2[0].user_id
    }

    const userList = partnerId ? `${user_id},${partnerId}` : `${user_id}`
    const eventsUrl = `${SUPABASE_URL}/rest/v1/game_events?user_id=in.(${userList})&order=date.asc`
    const eventsRes = await fetch(eventsUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
    if (!eventsRes.ok) {
      const txt = await eventsRes.text().catch(()=>null)
      return res.status(500).json({ error: 'Failed to fetch game events', details: txt })
    }
    const events = await eventsRes.json()

    const board = Array(9).fill(null)
    let lastPlayer = null
    const moveHistory = []
    for (const ev of events) {
      const c = ev.content || ''
      if (c.startsWith('TICTACTOE_MOVE|')) {
        const parts = c.split('|')
        const i = parseInt(parts[1], 10)
        const p = parts[2]
        if (Number.isFinite(i) && i >= 0 && i < 9) board[i] = p
        lastPlayer = p
        moveHistory.push({ idx: i, player: p, author: ev.author, user_id: ev.user_id, date: ev.date })
      }
      if (c.startsWith('TICTACTOE_START|') || c.startsWith('TICTACTOE_ACCEPT|')) {
        board.fill(null)
        lastPlayer = null
        moveHistory.length = 0
        continue
      }
      if (c.startsWith('TICTACTOE_REMATCH|')) {
        const parts = c.split('|')
        if (parts.length >= 2 && parts[1] === 'ACCEPT') {
          board.fill(null)
          lastPlayer = null
          moveHistory.length = 0
          continue
        }
      }
    }

    const checkWin = (b) => {
      const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
      for (const [a,b1,c] of L) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a]
      if (b.every(Boolean)) return 'draw'
      return null
    }
    const winner = checkWin(board)
    if (winner) {
      if (verbose || process.env.NODE_ENV === 'development') {
        return res.status(400).json({ error: 'Game already finished', winner, board, moveHistory })
      }
      return res.status(400).json({ error: 'Game already finished' })
    }

    const expected = lastPlayer === 'X' ? 'O' : 'X'
    const firstExpected = 'X'
    const currentExpected = lastPlayer ? expected : firstExpected

    if (player !== currentExpected) return res.status(400).json({ error: 'Not your turn', expected: currentExpected })
    if (board[idx]) return res.status(400).json({ error: 'Cell already occupied' })

    const insertUrl = `${SUPABASE_URL}/rest/v1/game_events`
    const payload = { user_id, author: body.author || null, content: `TICTACTOE_MOVE|${idx}|${player}`, date: new Date().toISOString() }
    const insRes = await fetch(insertUrl, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    })
    if (!insRes.ok) {
      const txt = await insRes.text().catch(()=>'')
      return res.status(500).json({ error: 'Insert failed', details: txt })
    }
    const inserted = await insRes.json().catch(()=>null)
    return res.status(200).json({ ok: true, inserted: inserted && inserted[0] ? inserted[0] : inserted })
  } catch (err) {
    console.error('validate-move error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
