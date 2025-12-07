import webpush from 'web-push'
import fetch from 'node-fetch'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC || process.env.VAPID_PUBLIC
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || process.env.VITE_VAPID_PRIVATE

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!SUPABASE_URL || !SERVICE_KEY || !VAPID_PRIVATE || !VAPID_PUBLIC) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL, SERVICE_KEY or VAPID keys in env' })
  }

  try {
    const { title, body, user_id } = req.body || {}
    if (!title && !body) return res.status(400).json({ error: 'title or body required' })

    // Fetch subscriptions — either all or by user_id
    const q = user_id ? `user_id=eq.${user_id}` : ''
    const url = q ? `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&${q}` : `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`
    const r = await fetch(url, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    })

    if (!r.ok) {
      const errText = await r.text()
      return res.status(r.status).json({ error: errText })
    }

    const rows = await r.json()

    webpush.setVapidDetails('mailto:you@example.com', VAPID_PUBLIC, VAPID_PRIVATE)

    const payload = JSON.stringify({ title: title || 'Notification', body: body || '' })

    const results = []
    for (const row of rows) {
      const sub = row.subscription
      if (!sub) continue
      try {
        await webpush.sendNotification(sub, payload)
        results.push({ id: row.id ?? null, status: 'ok' })
      } catch (err) {
        console.warn('push send error', err)
        results.push({ id: row.id ?? null, status: 'error', message: err?.body || err?.message || String(err) })
      }
    }

    return res.status(200).json({ results })
  } catch (err) {
    console.error('send-push handler error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
