import webpush from 'web-push'
import fetch from 'node-fetch'

// Simple Vercel serverless function to send web-push notifications
// Expects POST with JSON body: { user_id?: string, title, body, icon?, url? }
// Environment variables required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - VAPID_PUBLIC
// - VAPID_PRIVATE

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const VAPID_PUBLIC = process.env.VAPID_PUBLIC
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE

  if (!SUPABASE_URL || !SUPABASE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'Missing required environment variables' })
  }

  webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC, VAPID_PRIVATE)

  const { user_id, title, body: bodyText, icon, url } = req.body || {}

  try {
    // Build query to fetch subscriptions. If user_id is provided, fetch only that user's subs.
    const query = user_id ? `?user_id=eq.${encodeURIComponent(user_id)}&select=*` : '?select=*'
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions${query}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    })

    if (!resp.ok) {
      const text = await resp.text()
      return res.status(502).json({ error: 'Failed to fetch subscriptions', detail: text })
    }

    const subs = await resp.json()

    const payload = JSON.stringify({ title: title || 'Notification', body: bodyText || '', icon, url })

    const results = []
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.subscription, payload)
        results.push({ id: s.id, ok: true })
      } catch (err) {
        results.push({ id: s.id, ok: false, error: err?.message || String(err) })
      }
    }

    res.status(200).json({ sent: results.length, results })
  } catch (err) {
    console.error('send-push error', err)
    res.status(500).json({ error: 'send failed', detail: err?.message || String(err) })
  }
}
