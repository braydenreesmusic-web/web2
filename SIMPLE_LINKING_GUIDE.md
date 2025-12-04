# Simple Partner Linking Guide 💕

## Super Easy Setup (No Tech Skills Needed!)

### Step 1: Run the Database Setup
1. Go to your **Supabase Dashboard**
2. Click **SQL Editor** on the left
3. Copy and paste the contents of **`fix-simple-partner-linking.sql`**
4. Click **Run** (or press Cmd/Ctrl + Enter)

That's it for the database! ✅

### Step 2: Link Your Accounts

#### Person A (You):
1. Open the app and go to **Profile** (bottom right)
2. Scroll down to "Link Your Partner" section
3. Type in your girlfriend's email address
4. Click **Send**

#### Person B (Your Girlfriend):
1. Open the app and go to **Profile**
2. You'll see a pink "Partner Request!" box at the top
3. Click the green **Accept** button

**Done!** 🎉 You're now linked and can see each other's online status!

## What You'll See

### In the Header (Top of Every Page):
- **🟢 "Online now"** - When your partner is using the app right now
- **🔴 "Last seen 5m ago"** - When they're offline (shows how long ago)

### The Indicator:
- Green pulsing dot = They're online
- Gray dot = They're offline
- Updates automatically in real-time!

## How It Works

1. **Automatic Updates**: The app checks if you're online every 25 seconds
2. **Instant Notifications**: See when your partner opens or closes the app
3. **Tab Awareness**: Automatically goes offline when you switch tabs
4. **Privacy**: Only you two can see each other's status

## Troubleshooting

### "I sent a request but they don't see it"
- Make sure they're using the **exact same email** they registered with
- Have them refresh the page
- Check they're logged in

### "The online status doesn't update"
- Make sure you ran the SQL setup (`fix-simple-partner-linking.sql`)
- Try refreshing the page
- Check that you both accepted the partner request

### "I want to unlink"
Currently you need to reject/delete the request. We can add an unlink button if needed!

## Benefits Over the Old Way

❌ **Old Way**: Copy/paste long UUIDs, run SQL commands, very confusing  
✅ **New Way**: Just enter an email address, click accept, done!

Perfect for couples who just want it to work without the technical hassle! 💚
