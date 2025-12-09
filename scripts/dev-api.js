#!/usr/bin/env node
/* Local dev API server to mirror serverless /api routes for development
   Run with: node scripts/dev-api.js or `npm run dev-api`
*/
import express from 'express'
import bodyParser from 'body-parser'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM

const app = express()
app.use(bodyParser.json({ limit: '1mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.post('/api/send-email', async (req, res) => {
  const { to, subject, text, html, from } = req.body || {}
  const fromEmail = from || EMAIL_FROM
  console.log('dev-api send-email called', { toPresent: !!to, hasKey: !!SENDGRID_API_KEY, hasFrom: !!fromEmail })
  if (!SENDGRID_API_KEY) return res.status(500).json({ error: 'SENDGRID_API_KEY not configured' })
  if (!fromEmail) return res.status(500).json({ error: 'EMAIL_FROM not configured' })
  if (!to || !subject || !(text || html)) return res.status(400).json({ error: 'Missing required fields' })

  try {
    const bodyPayload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject,
      content: []
    }
    if (html) bodyPayload.content.push({ type: 'text/html', value: html })
    if (text) bodyPayload.content.push({ type: 'text/plain', value: text })

    const fetch = (await import('node-fetch')).default
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    })

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      console.error('SendGrid error', resp.status, txt)
      return res.status(500).json({ error: 'SendGrid send failed', details: txt })
    }
    return res.json({ ok: true })
  } catch (err) {
    console.error('dev-api send-email error', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

const port = process.env.DEV_API_PORT || 4000
app.listen(port, () => console.log(`Dev API server running on http://localhost:${port}`))
