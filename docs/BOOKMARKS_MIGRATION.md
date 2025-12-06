# How to Apply the Bookmark Thumbnail Migration

The bookmarks now support custom thumbnails! To enable this feature, you need to apply the migration to add the `custom_thumbnail` column.

## Quick Setup (Supabase Studio)

1. Open your Supabase project dashboard
2. Go to **SQL Editor** 
3. Click **New Query**
4. Copy and paste the contents of `migrations/2025-12-06-add-bookmark-custom-thumbnail.sql`
5. Click **Run**

## Alternative: Using psql

If you have the Supabase CLI or psql installed:

```bash
psql "$DATABASE_URL" -f migrations/2025-12-06-add-bookmark-custom-thumbnail.sql
```

## What This Does

- Adds a `custom_thumbnail` text column to the `bookmarks` table
- Stores base64-encoded images or URLs
- Falls back to auto-generated thumbnails if not provided
- No data loss - all existing bookmarks remain unchanged

## Testing

After applying the migration:

1. Go to the **Bookmarks** page
2. Create a new bookmark with a custom thumbnail upload
3. Or click the **📸 Thumbnail** button on an existing bookmark to update it

The migration is safe to run multiple times (uses `ADD COLUMN IF NOT EXISTS`).
