import fetch from 'node-fetch'

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent'
const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY || process.env.OCR_SPACE_KEY || null
const GOOGLE_VISION_KEY = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_VISION_KEY || null

async function callGoogleVision(base64Data) {
  const key = GOOGLE_VISION_KEY
  if (!key) throw new Error('Google Vision API key not configured')
  const content = base64Data.replace(/^data:\w+\/\w+;base64,/, '')
  const body = {
    requests: [
      {
        image: { content },
        features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
      }
    ]
  }

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google Vision error: ${res.status} ${txt}`)
  }
  const json = await res.json()
  const annotation = json?.responses?.[0]?.fullTextAnnotation?.text || ''
  return annotation
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
