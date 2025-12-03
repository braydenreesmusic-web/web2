# 🚀 Setup Guide - Authentication & Backend Integration

## ✅ What's Been Implemented

### 1. Authentication System
- ✅ **Login/Register/Forgot Password pages** with beautiful UI
- ✅ **AuthContext** for global authentication state management
- ✅ **Protected Routes** - automatically redirect to login if not authenticated
- ✅ **Supabase integration** ready for backend connection

### 2. Backend Service Layer
- ✅ **API service** (`src/services/api.js`) with functions for all data operations
- ✅ **Real-time subscriptions** for check-ins and notes
- ✅ **Media upload support** with Supabase Storage
- ✅ **Type-safe CRUD operations** for all features

### 3. UI/UX Enhancements
- ✅ **Framer Motion animations** - smooth transitions and micro-interactions
- ✅ **Lucide React icons** - consistent, beautiful iconography
- ✅ **Improved accessibility** - ARIA labels, keyboard navigation
- ✅ **Enhanced visual feedback** - hover states, loading indicators
- ✅ **Gradient styling** - cohesive pink-purple brand palette

## 🔧 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to finish setting up (~2 minutes)

### Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. Create a `.env` file in your project root:

```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Set Up Database Schema

Run these SQL commands in your Supabase SQL Editor (**SQL Editor** → **New Query**):

#### Enable Row Level Security and Create Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Relationships table
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_a TEXT NOT NULL,
  partner_b TEXT NOT NULL,
  start_date DATE NOT NULL,
  savings_goal DECIMAL(10,2) DEFAULT 0,
  savings_current DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-ins table
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emotion TEXT NOT NULL,
  energy INTEGER CHECK (energy >= 1 AND energy <= 10),
  love_language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  category TEXT,
  recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  list TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media table
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('photo', 'video')),
  caption TEXT,
  location TEXT,
  date DATE,
  favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pins table (map markers)
CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  photo INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location shares table
CREATE TABLE location_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Bookmarks table
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  url TEXT,
  notes TEXT,
  visited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship insights table
CREATE TABLE relationship_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Set Up Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for each table (users can only access their own data)
-- Relationships
CREATE POLICY "Users can view own relationships" ON relationships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own relationships" ON relationships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own relationships" ON relationships FOR UPDATE USING (auth.uid() = user_id);

-- Check-ins
CREATE POLICY "Users can view own check-ins" ON check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Events
CREATE POLICY "Users can view own events" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);

-- Media
CREATE POLICY "Users can view own media" ON media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own media" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own media" ON media FOR UPDATE USING (auth.uid() = user_id);

-- Notes
CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pins
CREATE POLICY "Users can view own pins" ON pins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pins" ON pins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Location Shares
CREATE POLICY "Users can view own location" ON location_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own location" ON location_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own location" ON location_shares FOR UPDATE USING (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookmarks" ON bookmarks FOR UPDATE USING (auth.uid() = user_id);

-- Relationship Insights
CREATE POLICY "Users can view own insights" ON relationship_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own insights" ON relationship_insights FOR UPDATE USING (auth.uid() = user_id);
```

### Step 4: Set Up Storage Bucket for Media

1. In Supabase, go to **Storage**
2. Create a new bucket called `media`
3. Make it public or set appropriate policies
4. Add this policy for the bucket:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to view their own media
CREATE POLICY "Users can view own media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### Step 5: Test Your Application

```bash
npm run dev
```

1. Navigate to `http://localhost:5173/register`
2. Create a new account
3. You'll be automatically logged in and redirected to the dashboard
4. Try the Daily Check-In modal - it will save to your Supabase database!

## 🎨 Customization Guide

### Brand Colors

The app uses a pink-purple gradient theme. To customize:

**In `tailwind.config.js`:**
```javascript
theme: {
  extend: {
    colors: {
      primary: {
        50: '#fdf2f8',
        500: '#ec4899', // pink
        600: '#db2777',
      },
      secondary: {
        500: '#a855f7', // purple
        600: '#9333ea',
      }
    }
  }
}
```

### Adding More Animations

All components support Framer Motion. Example:

```jsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Your content
</motion.div>
```

## 📱 Features Overview

### Implemented
- ✅ Authentication (Login/Register/Forgot Password)
- ✅ Protected routes with automatic redirect
- ✅ Daily check-ins with backend saving
- ✅ Profile page with sign-out
- ✅ Animated UI components
- ✅ Icon-enhanced navigation
- ✅ Real-time ready (subscriptions set up)

### Ready to Implement (Backend Connected)
- 📅 Events/Calendar sync
- 📝 Shared tasks with live updates
- 📷 Photo/video upload to cloud storage
- 🗺️ Map pins with location sharing
- 🔖 Bookmarks management
- 💡 Relationship insights

## 🔐 Security Notes

- All routes except `/login`, `/register`, and `/forgot-password` require authentication
- Row Level Security (RLS) ensures users can only access their own data
- Supabase handles password hashing and session management
- Environment variables keep credentials secure

## 🚧 Next Steps

1. **Customize the landing/login pages** with your branding
2. **Add email verification** in Supabase Auth settings
3. **Implement real-time listeners** in components using `subscribeToCheckIns` and `subscribeToNotes`
4. **Replace mock data** in all pages with API calls from `src/services/api.js`
5. **Add error boundaries** for better error handling
6. **Implement loading states** throughout the app

## 🆘 Troubleshooting

**Can't login?**
- Check your `.env` file has correct credentials
- Verify Supabase project is active
- Check browser console for errors

**Database errors?**
- Ensure all SQL migration scripts ran successfully
- Check RLS policies are enabled
- Verify user_id matches auth.uid()

**Media upload fails?**
- Confirm storage bucket "media" exists
- Check storage policies are set correctly
- Verify file size limits

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
- [React Router](https://reactrouter.com/)

Happy coding! 🎉
