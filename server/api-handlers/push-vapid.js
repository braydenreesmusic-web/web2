import webpush from 'web-push'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC || process.env.VAPID_PUBLIC
    const VAPID_PRIVATE = process.env.VITE_VAPID_PRIVATE || process.env.VAPID_PRIVATE

    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      return res.status(200).json({ publicKey: VAPID_PUBLIC })
    }

    const keys = webpush.generateVAPIDKeys()
    console.warn('VAPID keys not configured. Generated ephemeral VAPID keys for this request.')
    return res.status(200).json({ publicKey: keys.publicKey })
  } catch (err) {
    console.error('vapid error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
