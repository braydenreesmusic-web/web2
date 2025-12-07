import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })
  }

  try {
    if (req.method === 'POST') {
      const { subscription, user_id } = req.body
      if (!subscription) return res.status(400).json({ error: 'subscription required' })

      const payload = [{ subscription, user_id: user_id ?? null }]
      const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      })

      const data = await r.json()
      return res.status(r.status).json(data)
    }

    if (req.method === 'DELETE') {
      const { id, endpoint } = req.body || {}
      if (!id && !endpoint) return res.status(400).json({ error: 'id or endpoint required' })

      const q = id ? `id=eq.${id}` : `endpoint=eq.${encodeURIComponent(endpoint)}`
      const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${q}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=representation'
        }
      })
      const data = await r.json()
      return res.status(r.status).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('push-subscriptions error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
