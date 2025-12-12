# Push Subscriptions Removed

The project no longer stores web-push subscriptions server-side in the database. Push subscription management and any server-side send endpoints have been deprecated and removed from the codebase.

If you previously used the `push_subscriptions` table or the included send scripts, they are no longer active. The client still contains helpers to register a service worker and subscribe/unsubscribe locally, but no server storage or sending is performed by this repo.

If you want to re-enable server-side push in the future I can:
- Add a secure subscription storage table and RLS policies.
- Reintroduce a server send endpoint and CLI scripts with careful secret handling.

For now, treat push functionality as client-local only.
