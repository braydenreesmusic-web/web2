import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET || null

export default async function handler(req, res) {
  const provided = req.headers['x-admin-secret'] || req.headers['x-admin-secret'.toLowerCase()]
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Missing or invalid admin secret' })
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })
  }

  try {
    if (req.method === 'POST') {
      const { user_id, type, target_user_id = null, payload = {} } = req.body || {}
      if (!user_id || !type) return res.status(400).json({ error: 'user_id and type required' })

      const r = await fetch(`${SUPABASE_URL}/rest/v1/signals`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ user_id, type, target_user_id, payload })
      })

      const txt = await r.text()
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to insert signal', details: txt })
      return res.status(200).json(JSON.parse(txt))
    }

    if (req.method === 'GET') {
      // admin: list recent signals
      const r = await fetch(`${SUPABASE_URL}/rest/v1/signals?select=*&order=created_at.desc&limit=200`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      })
      const txt = await r.text()
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to fetch signals', details: txt })
      return res.status(200).json(JSON.parse(txt))
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('api/signals error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
