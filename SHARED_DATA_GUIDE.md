# 🔗 True Account Linking - Setup Guide

## What This Does

Now when you and your girlfriend are linked, **you BOTH see EVERYTHING**:

- ✅ She uploads a photo → You see it too
- ✅ You create an event → She sees it too  
- ✅ She writes a note → You both see it
- ✅ You add a song → Both playlists show it
- ✅ Either person can edit/delete shared content

**It's like having one shared account, but you both keep your own logins!**

## Setup (One Time Only)

### 1. Go to Supabase SQL Editor
- Open your Supabase Dashboard
- Click **SQL Editor** on the left
- Click **New Query**

### 2. Run the SQL Script
- Copy ALL the contents of `fix-shared-data.sql`
- Paste into the SQL Editor
- Click **Run** (or Cmd/Ctrl + Enter)

You should see:
```
✅ Shared data access enabled!
Both partners can now view each other's:
- Check-ins, Events, Photos/Videos, Notes
- Tasks, Pins, Bookmarks
- Savings Goals & Contributions
- Music Tracks, Playlists, Listening Sessions
- Can also update/delete shared content
```

### 3. Refresh Your App
- Both of you refresh the website
- That's it!

## What You'll See

### Before:
- You see: Your photos only
- She sees: Her photos only

### After:
- You see: Your photos + Her photos (all mixed together)
- She sees: Your photos + Her photos (all mixed together)

## Examples

### Photos
- She uploads a selfie → Shows up in BOTH photo galleries immediately
- You favorite a photo she took → She sees the heart too

### Events
- You add "Anniversary Dinner" → She sees it on her calendar too
- She edits the time → You see the update

### Notes
- She writes "I love you" → Shows up in your notes feed too
- You can read all her notes, she can read all yours

### Tasks
- You add "Buy flowers" → She can check it off when done
- She marks a task complete → You see it's done

### Music
- You add a song → It's in the shared library
- She creates a playlist → You can see and play it

## Who Created What?

Everything still shows who created it:
- Photos show the uploader's name
- Notes show the author
- Tasks show "Added by [name]"

So you can still tell who did what!

## Privacy Note

**Once linked, EVERYTHING is shared.** There's no "private" mode. This is designed for couples who want to share everything. If you need privacy for something, don't add it to the app!

## Troubleshooting

### "I don't see her photos yet"
1. Make sure you both accepted the partner request
2. Make sure you ran `fix-shared-data.sql`
3. Both of you refresh the page
4. Check that you're actually linked (Profile page should say "Partner Linked!")

### "I can see her stuff but she can't see mine"
- She needs to run the same SQL script too (or you both just run it once, it affects both)
- Make sure BOTH of you are logged in when testing

### "Old data doesn't show up"
- The data exists, RLS policies control visibility
- Running the SQL script updates the policies
- Everything should show immediately after refresh

## What's Shared vs What's Private

### ✅ Shared (Both See):
- Photos & Videos
- Events & Calendar
- Notes & Check-ins
- Tasks & To-dos
- Map Pins
- Bookmarks
- Savings Goals
- Music Library
- Playlists

### 🔒 Still Private:
- Login credentials (duh!)
- Online status in settings
- Profile info
- Nothing else is private!

---

**Enjoy your truly shared relationship app!** 💕
