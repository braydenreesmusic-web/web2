# Bookmarks Thumbnail Storage Migration

This document explains how to migrate base64 `data:` thumbnails currently stored in
`public.bookmarks.custom_thumbnail` into a Supabase Storage bucket and update each
bookmark row to contain a public URL instead of a large base64 blob.

Why do this?
- Storing large base64 images in Postgres can cause row-size and index issues.
- Serving images from Storage is faster, cacheable, and avoids DB bloat.

What we added
- `scripts/migrate-thumbnails-to-storage.js` — a Node script that:
  - Finds bookmarks with `custom_thumbnail` that look like data URLs.
  - Uploads each decoded image to a Storage bucket (default: `bookmarks-thumbnails`).
  - Replaces the `custom_thumbnail` value with the public URL of the uploaded file.

Prerequisites
- Node.js installed locally.
- Install the Supabase JS client:

```bash
npm install @supabase/supabase-js
```

- A Supabase service role key (found in Project Settings → API). This is required
  because the script may create a bucket and will upload files — it must run with
  elevated privileges. Keep this key secret.

Recommended workflow (safe)
1. In your project root create a local `.env.migration` file with:

```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
```

2. Dry run first (no uploads or DB changes):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-thumbnails-to-storage.js --bucket bookmarks-thumbnails --dry-run
```

3. Inspect the output. If it looks correct, run without `--dry-run`:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-thumbnails-to-storage.js --bucket bookmarks-thumbnails
```

Notes & caveats
- The script attempts to create the bucket via the SDK. If your project forbids
  programmatic bucket creation, create the bucket manually in Supabase Storage (Public)
  and re-run the script.
- The script only migrates `data:` URLs (base64). If you already have rows that contain
  URLs, they are skipped.
- After migration you may optionally remove any old large content or create a backup.

Next steps (optional)
- Add validation on create/update to always store thumbnails as Storage URLs — e.g.,
  when user uploads, upload to Storage first and then insert the bookmark row with the
  storage URL.
- Add a cron job to delete old unused objects if you plan to replace thumbnails.

If you want, I can:
- Prepare a follow-up patch that updates `src/pages/bookmarks.jsx` and `src/services/api.js`
  so the UI uploads thumbnails to Storage on save instead of writing base64 to the DB.
