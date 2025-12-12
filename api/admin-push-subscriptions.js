import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.SEND_PUSH_TOKEN || null

export default async function handler(req, res) {
  // Simple admin protection: require matching header
  const provided = req.headers['x-admin-secret'] || req.headers['x-admin-secret'.toLowerCase()]
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Missing or invalid admin secret' })
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })
  }

  try {
    if (req.method === 'GET') {
      const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`;
      const r = await fetch(url, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      })
      if (!r.ok) {
        const txt = await r.text()
        return res.status(r.status).json({ error: 'Failed to fetch subscriptions', details: txt })
      }
      const rows = await r.json()
      return res.status(200).json(rows)
    }

    if (req.method === 'PATCH') {
      const { id, user_id } = req.body || {}
      if (!id || !user_id) return res.status(400).json({ error: 'id and user_id required' })

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ user_id })
      })

      const txt = await patchRes.text()
      if (!patchRes.ok) return res.status(patchRes.status).json({ error: 'Failed to update subscription', details: txt })
      return res.status(200).json(JSON.parse(txt))
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {}
      if (!id) return res.status(400).json({ error: 'id required' })
      const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=representation'
        }
      })
      const txt = await r.text()
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to delete subscription', details: txt })
      return res.status(200).json(JSON.parse(txt))
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('admin-push-subscriptions error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
