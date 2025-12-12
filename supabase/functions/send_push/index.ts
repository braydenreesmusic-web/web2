// Supabase Edge Function (stub) for sending push notifications.
// This is a starter template for a Deno-based edge function. Implement push sending here
// or proxy requests to a secure server that has the service_role key.

import type { HandlerContext, Handler } from 'https://edge.netlify.com'

export default async (req: Request, ctx: HandlerContext) => {
  // IMPORTANT: Supabase Edge Functions run on Deno — if you need to send pushes
  // from the edge, you'll need to implement the Web Push protocol here or call
  // an internal server that has access to the SUPABASE_SERVICE_ROLE_KEY and VAPID keys.

  return new Response(JSON.stringify({ error: 'Not implemented. Use /api/send-push (server) or implement web-push here.' }), {
    status: 501,
    headers: { 'content-type': 'application/json' }
  })
}
