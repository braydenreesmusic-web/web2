const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const DEBUG_SECRET = process.env.GAME_EVENTS_DEBUG_SECRET || process.env.DEBUG_SECRET

function setCORS(res, req) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-debug-secret')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export default async function handler(req, res) {
  setCORS(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const secret = req.headers['x-debug-secret'] || req.query?.secret
    if (!DEBUG_SECRET || secret !== DEBUG_SECRET) {
      return res.status(401).json({ error: 'Unauthorized - missing or invalid debug secret' })
    }

    const userId = req.query?.user_id || req.headers['x-user-id']
    if (!userId) return res.status(400).json({ error: 'Missing user_id' })

    if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Missing SUPABASE_URL or SERVICE_KEY' })

    const limit = parseInt(req.query.limit || '200', 10)
    const url = `${SUPABASE_URL}/rest/v1/game_events?user_id=eq.${userId}&order=date.asc&limit=${limit}`
    const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
    if (!r.ok) {
      const txt = await r.text().catch(()=>null)
      return res.status(500).json({ error: 'Failed to fetch game_events', details: txt })
    }
    const rows = await r.json()
    return res.status(200).json({ ok: true, rows })
  } catch (e) {
    console.error('game-events-debug error', e)
    return res.status(500).json({ error: e.message || String(e) })
  }
}
