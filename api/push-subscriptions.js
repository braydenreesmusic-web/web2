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

      // Extract endpoint and user agent to satisfy NOT NULL constraint on endpoint
      const endpoint = subscription?.endpoint
      if (!endpoint) return res.status(400).json({ error: 'subscription.endpoint required' })
      const user_agent = req.headers['user-agent'] || null

      const payload = [{ subscription, endpoint, user_agent, user_id: user_id ?? null }]

      // Try to insert; if insert fails (duplicate endpoint), update existing row's subscription and last_seen.
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      })

      if (insertRes.ok) {
        const data = await insertRes.json()
        return res.status(insertRes.status).json(data)
      }

      // If insert failed, attempt to find existing subscription by endpoint and update it.
      const insertText = await insertRes.text()
      console.warn('push-subscriptions insert failed', insertRes.status, insertText)

      // Try to find existing by endpoint
      const qEndpoint = `endpoint=eq.${encodeURIComponent(endpoint)}`
      const getRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&${qEndpoint}`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      })

      if (!getRes.ok) {
        const txt = await getRes.text()
        return res.status(getRes.status).json({ error: 'Failed to query existing subscription', details: txt })
      }

      const rows = await getRes.json()
      if (Array.isArray(rows) && rows.length > 0) {
        // Update the first matching row
        const id = rows[0].id
        const updateBody = { subscription, last_seen: new Date().toISOString(), user_agent }
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateBody)
        })

        const patchText = await patchRes.text()
        if (!patchRes.ok) return res.status(patchRes.status).json({ error: 'Failed to update existing subscription', details: patchText })
        return res.status(200).json(JSON.parse(patchText))
      }

      // No existing row found and insert failed — return original insert error text
      console.warn('push-subscriptions insert error body:', insertText)
      return res.status(insertRes.status).json({ error: insertText })
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
