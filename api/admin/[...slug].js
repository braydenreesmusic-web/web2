import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.SEND_PUSH_TOKEN || null
const DEBUG_SECRET = process.env.GAME_EVENTS_DEBUG_SECRET || process.env.DEBUG_SECRET

function setCORS(res, req) {
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-secret, x-debug-secret')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

export default async function handler(req, res) {
  // catch-all admin dispatcher: /api/admin/<slug...>
  setCORS(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const slug = req.query?.slug
  const path = Array.isArray(slug) ? slug.join('/') : slug || ''

  try {
    // --- Admin auth for sensitive endpoints ---
    const provided = req.headers['x-admin-secret'] || req.headers['x-admin-secret'.toLowerCase()]

    // Route: /api/admin/push-subscriptions
    if (path === 'push-subscriptions') {
      if (!ADMIN_SECRET || provided !== ADMIN_SECRET) return res.status(401).json({ error: 'Missing or invalid admin secret' })
      if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })

      if (req.method === 'GET') {
        const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`
        const r = await fetch(url, { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } })
        if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch subscriptions', details: await r.text() })
        return res.status(200).json(await r.json())
      }

      if (req.method === 'PATCH') {
        const { id, user_id } = req.body || {}
        if (!id || !user_id) return res.status(400).json({ error: 'id and user_id required' })
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
          method: 'PATCH',
          headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify({ user_id })
        })
        if (!patchRes.ok) return res.status(patchRes.status).json({ error: 'Failed to update subscription', details: await patchRes.text() })
        return res.status(200).json(await patchRes.json())
      }

      if (req.method === 'DELETE') {
        const { id } = req.body || {}
        if (!id) return res.status(400).json({ error: 'id required' })
        const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Prefer': 'return=representation' } })
        if (!r.ok) return res.status(r.status).json({ error: 'Failed to delete subscription', details: await r.text() })
        return res.status(200).json(await r.json())
      }

      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Route: /api/admin/game-events-debug
    if (path === 'game-events-debug') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
      const secret = req.headers['x-debug-secret'] || req.query?.secret
      if (!DEBUG_SECRET || secret !== DEBUG_SECRET) return res.status(401).json({ error: 'Unauthorized - missing or invalid debug secret' })
      const userId = req.query?.user_id || req.headers['x-user-id']
      if (!userId) return res.status(400).json({ error: 'Missing user_id' })
      if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Missing SUPABASE_URL or SERVICE_KEY' })
      const limit = parseInt(req.query.limit || '200', 10)
      const url = `${SUPABASE_URL}/rest/v1/game_events?user_id=eq.${userId}&order=date.asc&limit=${limit}`
      const r = await fetch(url, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } })
      if (!r.ok) return res.status(500).json({ error: 'Failed to fetch game_events', details: await r.text().catch(()=>null) })
      const rows = await r.json()
      return res.status(200).json({ ok: true, rows })
    }

    // Route: /api/admin/presence
    if (path === 'presence') {
      if (!ADMIN_SECRET || provided !== ADMIN_SECRET) return res.status(401).json({ error: 'Missing or invalid admin secret' })
      if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })

      if (req.method === 'POST') {
        const { user_id, online = true, meta = {} } = req.body || {}
        if (!user_id) return res.status(400).json({ error: 'user_id required' })
        const payload = { user_id, is_online: online, last_seen: new Date().toISOString(), meta }
        // Try insert, fallback to patch
        let r = await fetch(`${SUPABASE_URL}/rest/v1/user_presence`, {
          method: 'POST',
          headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(payload)
        })
        if (!r.ok && r.status === 409) {
          r = await fetch(`${SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user_id}`, {
            method: 'PATCH',
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
          })
        }
        if (!r.ok) return res.status(r.status).json({ error: 'Failed to upsert presence', details: await r.text() })
        return res.status(200).json(await r.json())
      }

      if (req.method === 'DELETE') {
        const { user_id } = req.body || {}
        if (!user_id) return res.status(400).json({ error: 'user_id required' })
        const r = await fetch(`${SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user_id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Prefer': 'return=representation' } })
        if (!r.ok) return res.status(r.status).json({ error: 'Failed to delete presence', details: await r.text() })
        return res.status(200).json(await r.json())
      }

      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Route: /api/admin/signals
    if (path === 'signals') {
      if (!ADMIN_SECRET || provided !== ADMIN_SECRET) return res.status(401).json({ error: 'Missing or invalid admin secret' })
      if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })

      if (req.method === 'POST') {
        const { user_id, type, target_user_id = null, payload = {} } = req.body || {}
        if (!user_id || !type) return res.status(400).json({ error: 'user_id and type required' })
        const r = await fetch(`${SUPABASE_URL}/rest/v1/signals`, { method: 'POST', headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ user_id, type, target_user_id, payload }) })
        if (!r.ok) return res.status(r.status).json({ error: 'Failed to insert signal', details: await r.text() })
        return res.status(200).json(await r.json())
      }

      if (req.method === 'GET') {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=200`, { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } })
        if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch signals', details: await r.text() })
        return res.status(200).json(await r.json())
      }

      return res.status(405).json({ error: 'Method not allowed' })
    }

    return res.status(404).json({ error: 'Not found' })
  } catch (err) {
    console.error('api/admin catch-all error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
