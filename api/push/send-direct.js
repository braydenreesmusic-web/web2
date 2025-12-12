import webpush from 'web-push'

// Send a single immediate push to the provided subscription object.
// This endpoint is intended for quick testing without requiring stored
// subscriptions. It expects a POST body:
// { subscription: {...}, title: '...', body: '...', url: '/' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC || process.env.VAPID_PUBLIC
  const VAPID_PRIVATE = process.env.VITE_VAPID_PRIVATE || process.env.VAPID_PRIVATE

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(500).json({ error: 'VAPID keys not configured on server. Run `npm run generate-vapid` and add keys to env.' })
  }

  try {
    const { subscription, title, body, url } = req.body || {}
    if (!subscription) return res.status(400).json({ error: 'subscription required' })
    webpush.setVapidDetails('mailto:notifications@yourees.xyz', VAPID_PUBLIC, VAPID_PRIVATE)

    const payload = JSON.stringify({ title: title || 'Test Notification', body: body || 'Hello from your app', url: url || '/' })

    await webpush.sendNotification(subscription, payload)
    return res.status(200).json({ ok: true })
  } catch (err) {
    const msg = err?.body || err?.message || String(err)
    console.error('send-direct error', msg)
    return res.status(500).json({ error: msg })
  }
}
