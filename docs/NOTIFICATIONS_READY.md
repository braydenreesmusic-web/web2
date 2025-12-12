Notifications feature is implemented and ready for deployment.

What to verify before releasing:
- Ensure the `migrations/2025-12-06-add-push-subscriptions.sql` migration has been applied to your Supabase project.
- Set the following environment variables in your deployment (Vercel / Supabase secrets):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
  - `VAPID_PUBLIC` and `VAPID_PRIVATE` (keep private key secret)
  - `VITE_VAPID_PUBLIC` (frontend public key)

Notes:
- The repository does NOT contain any private keys or service role keys.
- To test locally: run the app, accept notification permission on the Profile page, then run `node scripts/send-push.mjs` with your service role key and VAPID keys.
