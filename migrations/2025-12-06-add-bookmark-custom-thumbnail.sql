-- 2025-12-06-add-bookmark-custom-thumbnail.sql
-- Add a custom_thumbnail column to store base64 thumbnail images
-- Users can upload custom thumbnails to replace auto-generated ones

BEGIN;

-- Add column for custom thumbnail (text field to store base64 data or URL)
ALTER TABLE IF EXISTS public.bookmarks
ADD COLUMN IF NOT EXISTS custom_thumbnail text;

COMMIT;

-- Notes:
-- - Store base64-encoded images or URLs in this column
-- - If not provided, UI falls back to auto-generated thumbnail from thum.io
-- - Consider adding a cleanup job to prune very large base64 strings if needed
