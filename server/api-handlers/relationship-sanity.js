export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-debug-secret')
    return res.status(204).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const DEBUG_SECRET = process.env.GAME_EVENTS_DEBUG_SECRET || process.env.DEBUG_SECRET
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  const provided = req.headers['x-debug-secret'] || req.headers['x-debug-token']
  if (!DEBUG_SECRET || provided !== DEBUG_SECRET) return res.status(401).json({ error: 'Unauthorized - missing debug secret' })
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Missing supabase config' })

  try {
    const { userA, userB } = req.body || {}
    if (!userA || !userB) return res.status(400).json({ error: 'Missing userA or userB in body' })

    const relUrl = `${SUPABASE_URL}/rest/v1/relationships?or=(and(user_id.eq.${userA},partner_user_id.eq.${userB}),and(user_id.eq.${userB},partner_user_id.eq.${userA}))`
    const relRes = await fetch(relUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
    const rel = relRes.ok ? await relRes.json() : []

    const eventsAUrl = `${SUPABASE_URL}/rest/v1/game_events?user_id=eq.${userA}&order=date.asc&limit=20`
    const eventsBUrl = `${SUPABASE_URL}/rest/v1/game_events?user_id=eq.${userB}&order=date.asc&limit=20`
    const [evARes, evBRes] = await Promise.all([
      fetch(eventsAUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }),
      fetch(eventsBUrl, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
    ])
    const eventsA = evARes.ok ? await evARes.json() : []
    const eventsB = evBRes.ok ? await evBRes.json() : []

    return res.status(200).json({ ok: true, relationship: rel, eventsA, eventsB })
  } catch (err) {
    console.error('relationship-sanity error', err)
    return res.status(500).json({ error: String(err) })
  }
}
