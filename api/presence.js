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
      const { user_id, online = true, meta = {} } = req.body || {}
      if (!user_id) return res.status(400).json({ error: 'user_id required' })

      const url = `${SUPABASE_URL}/rest/v1/presence?user_id=eq.${user_id}`
      const payload = { user_id, online, last_active: new Date().toISOString(), meta }

      // Upsert via PATCH with on_conflict isn't available through REST easily,
      // so use POST then on conflict fallback: use RPC or PUT via upsert is complex.
      // Keep it simple: attempt INSERT, if conflict (409/HTTP error) then PATCH.

      let r = await fetch(`${SUPABASE_URL}/rest/v1/presence`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      })

      if (!r.ok && r.status === 409) {
        // conflict: update existing
        r = await fetch(`${SUPABASE_URL}/rest/v1/presence?user_id=eq.${user_id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(payload)
        })
      }

      const txt = await r.text()
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to upsert presence', details: txt })
      return res.status(200).json(JSON.parse(txt))
    }

    if (req.method === 'DELETE') {
      const { user_id } = req.body || {}
      if (!user_id) return res.status(400).json({ error: 'user_id required' })
      const r = await fetch(`${SUPABASE_URL}/rest/v1/presence?user_id=eq.${user_id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=representation'
        }
      })
      const txt = await r.text()
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to delete presence', details: txt })
      return res.status(200).json(JSON.parse(txt))
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('api/presence error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
