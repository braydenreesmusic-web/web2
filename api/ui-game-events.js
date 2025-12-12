// Serverless endpoint to return canonical `game_events` for the current user.
// Uses the Supabase REST API with the service role key so we can inspect
// rows regardless of RLS. This endpoint expects the client to be authenticated
// (via cookie or Authorization header) and will only return rows related to
// the requesting user (and partner) to avoid exposing unrelated data.

export default async function handler(req, res) {
  // Basic CORS handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET,OPTIONS')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL' })
    }

    // If client provided an Authorization header (from browser session), pass it
    const authHeader = req.headers['authorization'] || ''

    // Fetch relationship for the requesting user using the provided Authorization
    // header if available. We try to identify the user's id via the `/auth/v1/user` endpoint
    // by calling Supabase's `/auth/v1/user` with the user's token. If no token is
    // present, we fall back to returning a 401.
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' })
    }

    // Get current user info (to extract user id)
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader }
    })
    if (!userResp.ok) {
      const txt = await userResp.text().catch(()=>null)
      return res.status(401).json({ error: 'Invalid session', detail: txt })
    }
    const userJson = await userResp.json()
    const userId = userJson?.id
    if (!userId) return res.status(400).json({ error: 'Unable to determine user id' })

    // Fetch relationship row for the user to determine partner_user_id
    const relResp = await fetch(`${SUPABASE_URL}/rest/v1/relationships?user_id=eq.${userId}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      }
    })
    if (!relResp.ok) {
      const txt = await relResp.text().catch(()=>null)
      return res.status(502).json({ error: 'Failed to query relationships', detail: txt })
    }
    const relData = await relResp.json()
    const partnerId = (relData && relData[0] && relData[0].partner_user_id) || null

    // Build filter: either user_id = userId or user_id = partnerId
    let eventsUrl = `${SUPABASE_URL}/rest/v1/game_events?order=date.asc&limit=500`
    if (partnerId) {
      // Use PostgREST 'or' filter
      eventsUrl += `&or=(user_id.eq.${userId},user_id.eq.${partnerId})`
    } else {
      eventsUrl += `&user_id=eq.${userId}`
    }

    const eventsResp = await fetch(eventsUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      }
    })
    if (!eventsResp.ok) {
      const txt = await eventsResp.text().catch(()=>null)
      return res.status(502).json({ error: 'Failed to query game_events', detail: txt })
    }
    const events = await eventsResp.json()
    return res.status(200).json({ ok: true, events })
  } catch (err) {
    console.error('ui-game-events error', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
