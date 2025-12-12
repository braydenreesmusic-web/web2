# Push Notification Edge Function (Vercel / Supabase)

This document explains the stubbed implementations included in the repo and how to deploy a secure sender for Web Push notifications.

Files added:
- `api/send-push.js` — Vercel-compatible serverless function (Node) that uses `web-push` and the Supabase REST API to fetch subscriptions and send notifications.
- `supabase/functions/send_push/index.ts` — Supabase Edge Function stub (Deno) that currently returns 501; use as a starting point if you want to implement native edge push sending.

Environment variables (required for the Vercel function and the `scripts/send-push.js` sender):
- `SUPABASE_URL` — https://yourproject.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (keep secret)
- `VAPID_PUBLIC` — VAPID public key
- `VAPID_PRIVATE` — VAPID private key

How to deploy (Vercel)
1. Add `api/send-push.js` to your repo (already present).
2. Set the environment variables in Vercel dashboard (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC`, `VAPID_PRIVATE`).
3. Call the function with POST JSON: `{ "user_id": "<user_uuid>", "title": "Hi", "body": "..." }` to target a particular user, or omit `user_id` to broadcast.

Notes about Supabase Edge
- Supabase Edge Functions run on Deno and may not support Node `web-push` out of the box. You can:
  - Implement the Web Push protocol in Deno (use community libraries or port the sending logic), or
  - Keep the sending logic on a trusted serverless function (like the Vercel function above) that has the service role key.

Security
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `VAPID_PRIVATE` to the browser.
- Use the service role key only on trusted servers or serverless functions.

Testing
- Use `npx web-push generate-vapid-keys` to create VAPID keys.
- Use `scripts/send-push.js` locally with the required env vars to test sending pushes.
