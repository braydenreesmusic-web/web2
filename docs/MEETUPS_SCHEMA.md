MEETUPS table (example)
========================

Run the following in the Supabase SQL editor to create a simple `meetups` table used to persist a user's next meetup and custom milestones.

```sql
-- Example SQL: create a simple meetups table
create table if not exists meetups (
  user_id text primary key,
  target_at timestamptz,
  milestones jsonb,
  updated_at timestamptz default now()
);

-- Optional: restrict access with RLS and a policy that allows users to upsert their own row
-- (Assumes `auth.uid()` returns the current user's id string)
alter table meetups enable row level security;
create policy "users_manage_their_meetup" on meetups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Notes:
- `milestones` is expected to be a JSON array of numbers (seconds before the event), e.g. `[604800,259200,172800,86400,0]`.
- If you want more advanced scheduling (multiple events per user), consider adding an `id` serial primary key and indexing `user_id` instead of making `user_id` the PK.
