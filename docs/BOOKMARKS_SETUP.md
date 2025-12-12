# Bookmarks Setup & Troubleshooting

If bookmarks aren't saving or deleting, follow these steps:

## Step 1: Add the Custom Thumbnail Column

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE IF EXISTS public.bookmarks
ADD COLUMN IF NOT EXISTS custom_thumbnail text;
```

## Step 2: Verify RLS Policies for Bookmarks

Check that your bookmarks table has proper RLS policies. Run this to see current policies:

```sql
SELECT * FROM pg_policies WHERE tablename = 'bookmarks';
```

### Required RLS Policies

Your bookmarks table needs these policies for full functionality:

```sql
-- Policy 1: Users can see their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON public.bookmarks FOR SELECT
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM relationships
  WHERE (relationships.user_id = auth.uid() AND relationships.partner_user_id = bookmarks.user_id)
     OR (relationships.partner_user_id = auth.uid() AND relationships.user_id = bookmarks.user_id)
));

-- Policy 2: Users can create bookmarks for themselves
CREATE POLICY "Users can create their own bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own bookmarks
CREATE POLICY "Users can update their own bookmarks"
ON public.bookmarks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own bookmarks
CREATE POLICY "Users can delete their own bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid() = user_id);
```

## Step 3: Check Table Schema

To see if the column was added, run:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'bookmarks'
ORDER BY ordinal_position;
```

You should see a `custom_thumbnail` column with type `text`.

## Step 4: Test in App

After applying the migration:
1. Refresh your browser (Cmd+Shift+R for hard refresh)
2. Try creating a new bookmark
3. You should see an alert saying "Bookmark saved!"
4. Try deleting a bookmark - you should see "Bookmark deleted!"

## Troubleshooting

### If saving still fails:
- Open browser DevTools (F12)
- Go to Console tab
- Look for error messages starting with "Error creating bookmark:"
- Share the full error message

### If delete doesn't work:
- Check the Console for "Error deleting bookmark:" messages
- Ensure RLS policy for DELETE exists (see Step 2)
- Verify you're logged in as the user who created the bookmark

### If thumbnail doesn't show:
- Make sure the migration added the `custom_thumbnail` column
- Try uploading a smaller image file
- Check that the image file is a valid format (JPG, PNG, etc.)
