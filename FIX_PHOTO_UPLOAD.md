# Fix Photo Upload RLS Error

## Problem
Getting error: "Failed to upload photo: new row violates row-level security policy"

## Solution

### Quick Fix (Run in Supabase SQL Editor)

1. Go to your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Copy and paste the contents of `fix-media-rls.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)

### What This Does

The SQL script will:
- Enable Row Level Security on the `media` table
- Create policies allowing users to view, insert, and update their own media
- Display verification queries to confirm it worked

### Storage Bucket Setup

After running the SQL, you also need to configure the storage bucket:

1. Go to **Storage** in Supabase Dashboard
2. If you don't have a `media` bucket, create it:
   - Click **New bucket**
   - Name: `media`
   - Public: **Yes** ✓
   - Click **Create bucket**

3. Click on the `media` bucket
4. Go to **Policies** tab
5. Add these policies by clicking **New policy**:

#### Policy 1: Allow Authenticated Uploads
- **Policy Name**: Allow authenticated uploads
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **USING expression**: (leave empty)
- **WITH CHECK expression**: `bucket_id = 'media'`

#### Policy 2: Allow Public Reads
- **Policy Name**: Allow public reads
- **Allowed operation**: SELECT
- **Target roles**: public
- **USING expression**: `bucket_id = 'media'`
- **WITH CHECK expression**: (leave empty)

#### Policy 3: Allow Authenticated Updates
- **Policy Name**: Allow authenticated updates
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **USING expression**: `bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]`

#### Policy 4: Allow Authenticated Deletes
- **Policy Name**: Allow authenticated deletes
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **USING expression**: `bucket_id = 'media' AND (auth.uid())::text = (storage.foldername(name))[1]`

### Verify It Works

After completing the above steps:
1. Refresh your app
2. Try uploading a photo
3. Should work! ✓

### Still Having Issues?

Check the browser console (F12) for detailed error messages, or check your Supabase logs in the Dashboard under **Database** > **Logs**.
