export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Missing supabase config' })

  try {
    const body = req.body || {}
    const { user_id, author, side, partnerUserId } = body
    if (!user_id || !side) return res.status(400).json({ error: 'Missing user_id or side' })

    const authHeader = req.headers['authorization'] || ''
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' })

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE_KEY } })
    if (!userResp.ok) {
      const txt = await userResp.text().catch(()=>null)
      return res.status(401).json({ error: 'Invalid session', detail: txt })
    }
    const caller = await userResp.json()
    if (!caller?.id || caller.id !== user_id) return res.status(403).json({ error: 'Auth mismatch' })

    const now = new Date().toISOString()
    const inviterContent = `TICTACTOE_PROPOSE|${side}|${author||''}|${user_id}`
    const inviterPayload = { user_id, author: author || null, content: inviterContent, date: now }
    const rows = [inviterPayload]
    if (partnerUserId) {
      const partnerContent = `TICTACTOE_PROPOSE|${side}|${author||''}|${user_id}`
      const partnerPayload = { user_id: partnerUserId, author: author || null, content: partnerContent, date: now }
      rows.push(partnerPayload)
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/game_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(rows)
    })

    if (!resp.ok) {
      const txt = await resp.text().catch(()=>null)
      return res.status(502).json({ error: 'Insert failed', detail: txt })
    }

    const inserted = await resp.json()
    const inserted_user_ids = Array.isArray(inserted) ? inserted.map(r => r.user_id) : []
    const inserted_contents = Array.isArray(inserted) ? inserted.map(r => ({ user_id: r.user_id, content: r.content })) : []
    return res.status(200).json({ ok: true, inserted, inserted_user_ids, inserted_contents })
  } catch (err) {
    console.error('send-game-invite error', err)
    return res.status(500).json({ error: String(err) })
  }
}
