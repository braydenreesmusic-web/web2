import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SERVICE_KEY in env' })
  }

  try {
    const body = req.body || {}
    const { idx, player, user_id } = body
    if (typeof idx !== 'number' || !['X','O'].includes(player) || !user_id) {
      return res.status(400).json({ error: 'Missing or invalid idx/player/user_id' })
    }

    // Find partner if any
    const relUrl = `${SUPABASE_URL}/rest/v1/relationships?user_id=eq.${user_id}`
    const relRes = await fetch(relUrl, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })
    const relRows = relRes.ok ? await relRes.json() : []
    let partnerId = null
    if (relRows && relRows.length) {
      partnerId = relRows[0].partner_user_id || null
    } else {
      // Try lookup by partner_user_id -> user_id
      const rel2Url = `${SUPABASE_URL}/rest/v1/relationships?partner_user_id=eq.${user_id}`
      const rel2Res = await fetch(rel2Url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
      const rel2 = rel2Res.ok ? await rel2Res.json() : []
      if (rel2 && rel2.length) partnerId = rel2[0].user_id
    }

    // Fetch relevant game events (moves and starts/accepts) for these participants
    const userList = partnerId ? `${user_id},${partnerId}` : `${user_id}`
    const eventsUrl = `${SUPABASE_URL}/rest/v1/game_events?user_id=in.(${userList})&order=date.asc`
    const eventsRes = await fetch(eventsUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
    if (!eventsRes.ok) return res.status(500).json({ error: 'Failed to fetch game events' })
    const events = await eventsRes.json()

    // Reconstruct board
    const board = Array(9).fill(null)
    let lastPlayer = null
    for (const ev of events) {
      const c = ev.content || ''
      if (c.startsWith('TICTACTOE_MOVE|')) {
        const parts = c.split('|')
        const i = parseInt(parts[1], 10)
        const p = parts[2]
        if (Number.isFinite(i) && i >= 0 && i < 9) board[i] = p
        lastPlayer = p
      }
      if (c.startsWith('TICTACTOE_START|')) {
        // noop for turn calc
      }
    }

    // Reject if game already won
    const checkWin = (b) => {
      const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
      for (const [a,b1,c] of L) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a]
      if (b.every(Boolean)) return 'draw'
      return null
    }
    const winner = checkWin(board)
    if (winner) return res.status(400).json({ error: 'Game already finished' })

    // Determine expected player
    const expected = lastPlayer === 'X' ? 'O' : 'X'
    const firstExpected = 'X'
    const currentExpected = lastPlayer ? expected : firstExpected

    if (player !== currentExpected) return res.status(400).json({ error: 'Not your turn', expected: currentExpected })
    if (board[idx]) return res.status(400).json({ error: 'Cell already occupied' })

    // All good — insert move
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
