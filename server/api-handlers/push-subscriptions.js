import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })
  }

  try {
    if (req.method === 'POST') {
      const incoming = req.body || {}
      const subscription = incoming.subscription || incoming
      const user_id = incoming.user_id ?? null

      if (!subscription || Object.keys(subscription).length === 0) return res.status(400).json({ error: 'subscription required' })

      const endpoint = subscription?.endpoint || incoming.endpoint
      if (!endpoint) return res.status(400).json({ error: 'subscription.endpoint required' })
      const user_agent = incoming.user_agent || req.headers['user-agent'] || null

      const allowAnonymous = String(process.env.PUSH_ALLOW_ANONYMOUS || '').toLowerCase() === '1'
      if (!user_id && !allowAnonymous) {
        return res.status(400).json({ error: 'user_id required to save subscriptions on this deployment' })
      }

      const payloadObj = { subscription, endpoint }
      if (user_id) payloadObj.user_id = user_id
      const payload = [payloadObj]

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

      const insertText = await insertRes.text()
      console.warn('push-subscriptions insert failed', insertRes.status, insertText)

      const qJson = `subscription->>endpoint=eq.${encodeURIComponent(endpoint)}`
      let getRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&${qJson}`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      })

      let rows
      if (getRes.ok) {
        rows = await getRes.json()
      } else {
        const qEndpoint = `endpoint=eq.${encodeURIComponent(endpoint)}`
        getRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&${qEndpoint}`, {
          headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
        })

        if (!getRes.ok) {
          const txt = await getRes.text()
          return res.status(getRes.status).json({ error: 'Failed to query existing subscription', details: txt })
        }
        rows = await getRes.json()
      }
      if (Array.isArray(rows) && rows.length > 0) {
        const id = rows[0].id
        const updateBody = { subscription, last_seen: new Date().toISOString() }
        if (user_id) updateBody.user_id = user_id
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

      console.warn('push-subscriptions insert error body:', insertText)
      return res.status(insertRes.status).json({ error: insertText })
    }

    if (req.method === 'DELETE') {
      const { id, endpoint } = req.body || {}
      if (!id && !endpoint) return res.status(400).json({ error: 'id or endpoint required' })

      const qById = id ? `id=eq.${id}` : null
      const qByEndpoint = endpoint ? `endpoint=eq.${encodeURIComponent(endpoint)}` : null

      let r
      if (qById) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${qById}`, {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=representation'
          }
        })
      } else {
        const qJson = `subscription->>endpoint=eq.${encodeURIComponent(endpoint)}`
        r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${qJson}`, {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=representation'
          }
        })

        if (!r.ok) {
          r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${qByEndpoint}`, {
            method: 'DELETE',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Prefer': 'return=representation'
            }
          })
        }
      }

      const data = await r.json()
      return res.status(r.status).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('push-subscriptions error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase URL or service key not configured on server' })
  }

  try {
    if (req.method === 'POST') {
      const incoming = req.body || {}
      const subscription = incoming.subscription || incoming
      const user_id = incoming.user_id ?? null

      if (!subscription || Object.keys(subscription).length === 0) return res.status(400).json({ error: 'subscription required' })

      const endpoint = subscription?.endpoint || incoming.endpoint
      if (!endpoint) return res.status(400).json({ error: 'subscription.endpoint required' })
      const allowAnonymous = String(process.env.PUSH_ALLOW_ANONYMOUS || '').toLowerCase() === '1'
      if (!user_id && !allowAnonymous) {
        return res.status(400).json({ error: 'user_id required to save subscriptions on this deployment' })
      }

      const payloadObj = { subscription, endpoint }
      if (user_id) payloadObj.user_id = user_id
      const payload = [payloadObj]

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

      const insertText = await insertRes.text()
      console.warn('push-subscriptions insert failed', insertRes.status, insertText)

      const qJson = `subscription->>endpoint=eq.${encodeURIComponent(endpoint)}`
      let getRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&${qJson}`, {
        headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
      })

      let rows
      if (getRes.ok) {
        rows = await getRes.json()
      } else {
        const qEndpoint = `endpoint=eq.${encodeURIComponent(endpoint)}`
        getRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&${qEndpoint}`, {
          headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
        })

        if (!getRes.ok) {
          const txt = await getRes.text()
          return res.status(getRes.status).json({ error: 'Failed to query existing subscription', details: txt })
        }
        rows = await getRes.json()
      }
      if (Array.isArray(rows) && rows.length > 0) {
        const id = rows[0].id
        const updateBody = { subscription, last_seen: new Date().toISOString() }
        if (user_id) updateBody.user_id = user_id
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

      console.warn('push-subscriptions insert error body:', insertText)
      return res.status(insertRes.status).json({ error: insertText })
    }

    if (req.method === 'DELETE') {
      const { id, endpoint } = req.body || {}
      if (!id && !endpoint) return res.status(400).json({ error: 'id or endpoint required' })

      const qById = id ? `id=eq.${id}` : null
      const qByEndpoint = endpoint ? `endpoint=eq.${encodeURIComponent(endpoint)}` : null

      let r
      if (qById) {
        r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${qById}`, {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=representation'
          }
        })
      } else {
        const qJson = `subscription->>endpoint=eq.${encodeURIComponent(endpoint)}`
        r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${qJson}`, {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'return=representation'
          }
        })

        if (!r.ok) {
          r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?${qByEndpoint}`, {
            method: 'DELETE',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Prefer': 'return=representation'
            }
          })
        }
      }

      const data = await r.json()
      return res.status(r.status).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('push-subscriptions error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
