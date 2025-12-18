// Serverless handler to generate an AI description for a photo using OpenAI
// Expects POST { imageUrl, caption }
// Requires environment variable OPENAI_API_KEY (server-side)

const OPENAI_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// Module-level in-memory structures (persist per-process)
// Note: In serverless multi-instance setups this is only best-effort.
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_PER_WINDOW = 6
const ipMap = new Map() // ip -> [timestamps]

const queue = []
let processing = false

// Optional Upstash Redis REST support if configured
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function upstashIncr(key) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const resp = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}` }
    })
    if (!resp.ok) return null
    const j = await resp.json()
    return j.result
  } catch (e) {
    console.warn('Upstash incr failed', e)
    return null
  }
}

async function upstashExpire(key, ttlSeconds) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false
  try {
    // setex: /setex/{key}/{ttl}
    const resp = await fetch(`${UPSTASH_URL}/setex/${encodeURIComponent(key)}/${ttlSeconds}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify('1')
    })
    return resp.ok
  } catch (e) {
    console.warn('Upstash expire failed', e)
    return false
  }
}

async function processQueue() {
  if (processing) return
  processing = true
  while (queue.length) {
    const { reqData, resolve, reject } = queue.shift()
    try {
      const result = await callOpenAI(reqData)
      resolve(result)
    } catch (err) {
      reject(err)
    }
    // small delay between requests to avoid bursts
    await new Promise(r => setTimeout(r, 250))
  }
  processing = false
}

async function callOpenAI({ imageUrl, caption, metadata }) {
  const promptBase = `Write a warm, concise, and creative photo caption (1-2 sentences) describing the memory. Use evocative sensory details, an affectionate tone, and include one emoji. Mention any obvious objects, people, locations, or emotions if present. Keep it friendly and personal.`
  const metaText = metadata ? `\n\nMetadata: ${JSON.stringify(metadata)}` : ''
  const content = `${promptBase}${metaText}\n\nPhoto URL: ${imageUrl || 'none'}\nExisting caption: ${caption || 'none'}`
  const messages = [
    { role: 'system', content: 'You are a helpful assistant that writes short affectionate photo captions.' },
    { role: 'user', content }
  ]

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, max_tokens: 120, temperature: 0.75 })
  })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`OpenAI error ${resp.status}: ${txt}`)
  }
  const json = await resp.json()
  const out = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || ''
  return (out || '').trim()
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })

  const { imageUrl, caption, metadata } = req.body || {}
  if (!imageUrl && !caption) return res.status(400).json({ error: 'Provide imageUrl or caption' })

  // Prefer Upstash-based rate limiting when available
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
  const key = `ai:rate:${ip}`
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const count = await upstashIncr(key)
    if (count === 1) {
      // first increment, set TTL
      await upstashExpire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
    }
    if (count !== null && count > MAX_PER_WINDOW) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' })
    }
  } else {
    // in-memory fallback
    const now = Date.now()
    const arr = ipMap.get(ip) || []
    const recent = arr.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
    if (recent.length >= MAX_PER_WINDOW) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' })
    }
    recent.push(now)
    ipMap.set(ip, recent)
  }

  try {
    const promise = new Promise((resolve, reject) => queue.push({ reqData: { imageUrl, caption, metadata }, resolve, reject }))
    processQueue()
    const description = await promise
    return res.status(200).json({ description })
  } catch (err) {
    console.error('AI handler error', err)
    const payload = { error: 'Server error' }
    if (process.env.NODE_ENV !== 'production') payload.details = String(err?.message || err)
    return res.status(500).json(payload)
  }
}
