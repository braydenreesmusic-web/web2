# Partner Presence Setup Guide

## Overview
This feature lets you and your partner see each other's online status in real-time!

## Setup Steps

### 1. Run the SQL Fix
Open your Supabase SQL Editor and run `fix-presence-system.sql`:
```bash
# Go to: Supabase Dashboard → SQL Editor → New Query
# Copy and paste the contents of fix-presence-system.sql
# Click Run (or Cmd/Ctrl + Enter)
```

### 2. Get Your Partner's User ID
Each of you needs to find your User ID:

**Method 1: From Supabase Dashboard**
1. Go to Authentication → Users
2. Find your email
3. Copy the UUID (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**Method 2: From Browser Console**
1. Open your app
2. Open browser console (F12)
3. Type: `localStorage.getItem('supabase.auth.token')`
4. Look for the `user.id` field in the JSON

### 3. Link Your Accounts
Both partners need to update their relationship record:

```sql
-- In Supabase SQL Editor, replace with YOUR partner's user_id:
UPDATE relationships 
SET partner_user_id = 'YOUR-PARTNERS-USER-ID-HERE'
WHERE user_id = auth.uid();
```

**Example:**
If your partner's ID is `a1b2c3d4-e5f6-7890-abcd-ef1234567890`:
```sql
UPDATE relationships 
SET partner_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE user_id = auth.uid();
```

### 4. Test It!
1. Both partners should refresh the app
2. You should now see a presence indicator in the header showing:
   - 🟢 "Online now" - when your partner is active
   - 🔴 "Last seen Xm ago" - when offline with time

## How It Works

### Real-time Updates
- Your status updates every 25 seconds while the app is open
- Goes offline automatically when you close the tab/browser
- Updates when switching tabs (tab becomes inactive = offline)

### What You'll See
- **Green pulsing dot** = Partner is online right now
- **Gray dot** = Partner is offline
- **Time ago** = Shows when they were last active

### Privacy
- Only you and your partner can see each other's status
- No one else can see your online status
- Last seen time is only visible when offline

## Troubleshooting

### "Still shows offline"
1. Make sure both partners have linked each other's user_ids
2. Check that you ran `fix-presence-system.sql`
3. Try refreshing the page
4. Check browser console (F12) for errors

### "No presence indicator shows"
1. Make sure you're logged in
2. Verify you have a relationship record in the database
3. Check that partner_user_id is set correctly

### "Shows online when they're offline"
The heartbeat updates every 25 seconds. If someone closes the browser suddenly, it may take up to 25 seconds to show offline.

## Features

✅ Real-time presence tracking  
✅ Auto-online when app is open  
✅ Auto-offline when app is closed  
✅ Shows last seen timestamp  
✅ Beautiful animated indicator  
✅ Updates on tab visibility changes  
✅ Works across all devices  

Enjoy staying connected! 💕
