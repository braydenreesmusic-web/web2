# Schedule stale-presence cleanup (quick, no GitHub workflow needed)

If you don't want to add a GitHub workflow or pg_cron, use Supabase Studio's Scheduled Triggers to run the `mark_stale_presence_offline()` function.

1) Open Supabase Studio → Database → Scheduled Triggers.

2) Click **New scheduled trigger** and fill these fields:
- **Name**: mark_stale_presence_offline
- **Schema**: public
- **Schedule**: every 1 minute (or every 5 minutes if you prefer)
- **Type**: SQL
- **SQL**: `SELECT public.mark_stale_presence_offline();`

3) Save the trigger. No additional keys are required — the scheduled trigger runs with the database role.

Quick manual run (SQL editor):

Open Supabase SQL editor and run:

```
SELECT public.mark_stale_presence_offline();
```

Alternative (external scheduler / curl):

If you prefer an external scheduler (GitHub Actions, Vercel Cron, etc.), call the RPC endpoint:

```
curl -X POST "$SUPABASE_URL/rest/v1/rpc/mark_stale_presence_offline" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Note: Keep your service role key private (store it in GitHub Secrets or environment variables).
