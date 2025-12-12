const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, subject, text, html, from } = req.body || {}
  const fromEmail = from || EMAIL_FROM

  if (!SENDGRID_API_KEY) return res.status(500).json({ error: 'SENDGRID_API_KEY not configured' })
  if (!fromEmail) return res.status(500).json({ error: 'EMAIL_FROM not configured' })
  if (!to || !subject || !(text || html)) return res.status(400).json({ error: 'Missing required fields: to, subject, text/html' })

  const _fetch = global.fetch
  if (!_fetch) {
    console.error('fetch not available in runtime')
    return res.status(500).json({ error: 'Fetch not available in runtime' })
  }

  try {
    const bodyPayload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject: subject,
      content: []
    }
    if (html) bodyPayload.content.push({ type: 'text/html', value: html })
    if (text) bodyPayload.content.push({ type: 'text/plain', value: text })

    const resp = await _fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    })

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      console.error('SendGrid error', resp.status, txt)
      return res.status(500).json({ error: 'SendGrid send failed', details: txt })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-email handler error', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
