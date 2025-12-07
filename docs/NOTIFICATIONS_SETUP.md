# Push Notifications Setup

This document walks through the remaining manual steps to enable web push notifications for your app.

1) Apply DB migration (Push subscriptions table)

- Open Supabase → SQL Editor and paste the SQL from `migrations/2025-12-06-add-push-subscriptions.sql` and run it.
- This creates `public.push_subscriptions` and an RLS policy so authenticated users can insert/select/delete their own subscriptions.

2) Generate VAPID keys

Run locally on your machine and keep the private key secret:

```bash
npx web-push generate-vapid-keys
```

You'll get JSON like:
{
  "publicKey": "BLah...",
  "privateKey": "abc..."
}

Set environment variables:

- Frontend (development): add to `.env`:
  - `VITE_VAPID_PUBLIC=BLah...`
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` already required

- Server/CI (Vercel/GH Actions): set secrets
  - `SUPABASE_URL` — e.g. `https://yourproject.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (SECRET)
  - `VAPID_PUBLIC` — publicKey
  - `VAPID_PRIVATE` — privateKey

3) Test subscription flow locally

- Start dev server: `npm install && npm run dev`
- Visit the Profile page and use the prompt/button to enable notifications.

4) Test sending a push locally with the stored subscriptions

Use the included script (requires service role key and VAPID keys):

```bash
SUPABASE_URL=https://yourproject.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
VAPID_PUBLIC=BLah... \
VAPID_PRIVATE=abc... \
node scripts/send-push.js --title "Test" --body "Hello from dev"
```

5) Deploy server function (Vercel)

- `api/send-push.js` is a Vercel serverless function. Deploy the repo to Vercel and set environment variables in the Vercel dashboard.
- Call the function to send pushes to a specific `user_id` or broadcast.

6) Optional: GitHub Actions deploy/run migration

- You can create a GitHub Action to run migration scripts and/or call `scripts/send-push.js` if you provide secrets in repo settings.

Security notes

- Never commit service role keys or VAPID private keys. Use the host's secret manager.
- Use the service role key only on trusted backends.

Support

If you want, I can:
- Scaffold a Vercel `vercel.json` and sample deployment steps.
- Add a GitHub Actions workflow template that runs `scripts/send-push.js` (requires configuring secrets).
- Attempt a Deno-based implementation for the Supabase Edge function.
