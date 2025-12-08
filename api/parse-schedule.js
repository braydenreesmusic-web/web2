import fetch from 'node-fetch'
import crypto from 'crypto'

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent'
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || process.env.OCR_SPACE_KEY || null
const GOOGLE_VISION_KEY = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_VISION_KEY || null
const GOOGLE_SA_JSON_BASE64 = process.env.GOOGLE_SA_JSON_BASE64 || process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 || null

async function getAccessTokenFromServiceAccount(base64Json) {
  const saJson = Buffer.from(base64Json, 'base64').toString('utf8')
  let sa
  try {
    sa = JSON.parse(saJson)
  } catch (e) {
    throw new Error('Invalid service account JSON')
  }

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  }

  function base64url(input) {
    return Buffer.from(JSON.stringify(input)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const unsignedJwt = base64url(header) + '.' + base64url(payload)
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedJwt)
  const signature = signer.sign(sa.private_key, 'base64')
  const sigUrl = signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const jwt = unsignedJwt + '.' + sigUrl

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`
  })

  if (!tokenRes.ok) {
    const txt = await tokenRes.text()
    throw new Error('Failed to obtain access token: ' + txt)
  }
  const tokenJson = await tokenRes.json()
  if (!tokenJson.access_token) throw new Error('No access_token in token response')
  return tokenJson.access_token
}

async function callGoogleVision(base64Data) {
  const content = base64Data.replace(/^data:\w+\/\w+;base64,/, '')
  const body = {
    requests: [
      {
        image: { content },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
      }
    ]
  }

  // Prefer service account access token if provided
  if (GOOGLE_SA_JSON_BASE64) {
    const accessToken = await getAccessTokenFromServiceAccount(GOOGLE_SA_JSON_BASE64)
    const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Google Vision (service account) error: ${res.status} ${txt}`)
    }
    const json = await res.json()
    return json?.responses?.[0]?.fullTextAnnotation?.text || ''
  }

  // Fallback to API key if configured
  if (GOOGLE_VISION_KEY) {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Google Vision error: ${res.status} ${txt}`)
    }
    const json = await res.json()
    return json?.responses?.[0]?.fullTextAnnotation?.text || ''
  }

  throw new Error('No Google Vision credential configured')
}

async function callOcrSpace(base64Data) {
  // OCR.Space accepts base64 without the data: prefix
  const body = new URLSearchParams()
  body.append('apikey', OCR_SPACE_API_KEY)
  body.append('base64Image', base64Data.replace(/^data:\w+\/\w+;base64,/, ''))
  body.append('language', 'eng')

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OCR API error: ${res.status} ${text}`)
  }
  const json = await res.json()
  if (json?.IsErroredOnProcessing) {
    throw new Error(`OCR failed: ${JSON.stringify(json)}`)
  }
  const parsed = (json.ParsedResults || []).map(r => r.ParsedText).join('\n')
  return parsed
}

async function callGeminiExtract(text) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key not configured')

  const prompt = `You are an assistant that extracts event/date items from a block of text.\n\nInput text:\n"""\n${text}\n"""\n\nReturn a JSON array of objects with keys: title, date (ISO 8601 if possible, otherwise natural language), note (optional), category (optional). Example: [{"title":"Dentist","date":"2025-12-10T09:00:00","note":"teeth cleaning","category":"Other"}]\n\nIf no events found return an empty array.`

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} ${err}`)
  }
  const data = await response.json()
  const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textOut) throw new Error('Unexpected Gemini response')

  // Try to extract a JSON blob from the response
  const jsonMatch = textOut.match(/\[\s*\{[\s\S]*\}\s*\]/m)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      // fallback to trying to eval-safe by stripping trailing commas
      const cleaned = jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']')
      return JSON.parse(cleaned)
    }
  }

  // If not JSON, try to parse simple lines like "- 2025-12-10 09:00 Dentist"
  const items = []
  textOut.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    // naive date detection
    const dateMatch = trimmed.match(/(\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?)/)
    const title = trimmed.replace(dateMatch ? dateMatch[0] : '', '').replace(/^[-:\s]+/, '').trim()
    if (title) {
      items.push({ title, date: dateMatch ? new Date(dateMatch[0]).toISOString() : null })
    }
  })
  return items
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { image } = req.body || {}
    if (!image) return res.status(400).json({ error: 'image (data URL) required in body' })

    // 1) OCR - prefer Google Vision if configured, otherwise OCR.Space
    let ocrText = ''
    if (GOOGLE_VISION_KEY) {
      try {
        ocrText = await callGoogleVision(image)
      } catch (err) {
        console.warn('Google Vision failed:', err.message)
      }
    }

    if (!ocrText && OCR_SPACE_API_KEY) {
      try {
        ocrText = await callOcrSpace(image)
      } catch (err) {
        console.warn('OCR.Space failed:', err.message)
      }
    }

    if (!ocrText) {
      return res.status(200).json({ events: [], raw_text: ocrText })
    }

    if (!ocrText || !ocrText.trim()) {
      return res.status(200).json({ events: [] , raw_text: ocrText })
    }

    // 2) Send extracted text to Gemini to parse into events
    let events = []
    try {
      events = await callGeminiExtract(ocrText)
    } catch (err) {
      console.error('Gemini parse error', err)
      return res.status(500).json({ error: 'Failed to parse schedule text with AI', details: String(err), raw_text: ocrText })
    }

    return res.status(200).json({ events, raw_text: ocrText })
  } catch (err) {
    console.error('parse-schedule handler error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
