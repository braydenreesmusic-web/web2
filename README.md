# 💝 Overview App - Couples Relationship Management

A beautiful, feature-rich web application for couples to manage their relationship, built with React, Vite, Supabase, and TailwindCSS.

## ✨ Features

### 🔐 Authentication & Security
- User registration and login with email/password
- Protected routes with automatic redirect
- Password reset functionality
- Row Level Security (RLS) for data privacy

### 📊 Dashboard
- Quick actions and relationship stats
- Daily check-in modal with emotion, energy, and love language tracking
- Real-time presence tracking (see who's online)
- Recent check-ins with user attribution
- Beautiful gradient animations

### 💰 Savings Goals ✨ NEW
- Create multiple savings goals with targets and deadlines
- Track progress with visual charts
- Add contributions with notes
- Categorize goals (vacation, wedding, home, etc.)
- View from dashboard widget or dedicated `/savings` page

### 📅 Schedule Management
- Calendar view with events by month
- Shared task lists with completion tracking
- Event categories with color coding
- Create, edit, and delete events and tasks
- Real-time updates

### 📷 Media Center
- Notes with real-time sync
- Photo gallery with upload and favorites
- Video library
- Music powered by iTunes API ✨ NEW

### 🎵 Music & Listening ✨ NEW
- Search Apple Music catalog (iTunes API)
- Preview 30-second clips
- Build your music library
- Create and manage playlists
- **Synced Listening** - Listen together in real-time with play/pause sync

### 🗺️ Interactive Map
- Memory pins for special locations
- Location sharing between partners
- Add pins at current location with geolocation

### 🔖 Bookmarks
- Save favorite places and resources
- Category filters (Restaurants, Activities, etc.)
- Mark visited locations
- Quick add with URL and notes

### 👤 Profile
- User information and relationship stats
- Live counts for notes, photos, events
- Real-time presence status
- Sign out functionality

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase account (free tier works great!)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your Supabase credentials to .env
# VITE_SUPABASE_URL=your_project_url
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Run development server
npm run dev
```

### First Time Setup
See **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for detailed instructions on:
- Creating your Supabase project
- Setting up the database schema (run both `supabase-setup.sql` and `supabase-enhanced-features.sql`)
- Configuring storage for media uploads
- Security policies and RLS setup

### Enhanced Features
After basic setup, see **[ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md)** for:
- Savings Goals setup and usage
- Real-time Presence tracking
- iTunes Music integration
- Synced listening sessions
- Playlist management

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS
- **Framer Motion** - Smooth animations
- **React Router v6** - Client-side routing
- **Lucide React** - Beautiful icons

### Backend & Services
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage for media files
  - Row Level Security

### Mapping
- **React-Leaflet** - Interactive maps
- **Leaflet** - Map library

## 📁 Project Structure

```
src/
├── components/
│   ├── modals/          # Modal dialogs (Check-in, Chat, etc.)
│   ├── ui/              # Reusable UI components
│   ├── AppShell.jsx     # Page layout wrapper
│   ├── BottomTabs.jsx   # Navigation tabs
│   └── ProtectedRoute.jsx # Auth guard
├── contexts/
│   └── AuthContext.jsx  # Authentication state management
├── lib/
│   └── supabase.js      # Supabase client setup
├── pages/               # Route pages
│   ├── login.jsx
│   ├── register.jsx
│   ├── dashboard.jsx
│   ├── schedule.jsx
│   ├── media.jsx
│   ├── map.jsx
│   ├── profile.jsx
│   └── bookmarks.jsx
├── services/
│   └── api.js           # Backend API functions
├── mock/
│   └── data.js          # Mock data (for development)
├── App.jsx              # Main app component
└── main.jsx             # Entry point
```

## 🎨 Customization

### Brand Colors
The app uses a pink-purple gradient theme. Customize in `tailwind.config.js`:

```javascript
colors: {
  primary: '#ec4899',    // Pink
  secondary: '#a855f7',  // Purple
}
```

### Animations
All major components support Framer Motion animations. Adjust timing and easing in component files.

## 🔒 Security Features

- Environment variables for sensitive credentials
- Row Level Security (RLS) policies on all tables
- Protected routes requiring authentication
- Secure password hashing via Supabase Auth
- Data isolation per user

## 📱 Progressive Features

- Responsive design (mobile-first)
- Smooth animations and transitions
- Loading states and error handling
- Accessibility improvements (ARIA labels)
- Real-time data synchronization

## 🚧 Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📚 Documentation

- **[ENHANCED_FEATURES.md](./ENHANCED_FEATURES.md)** - New features guide (savings, music, presence)
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions
- **[API_EXAMPLES.md](./API_EXAMPLES.md)** - API usage examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[.env.example](./.env.example)** - Environment variable template

## 🎯 What's New

### Latest Updates
- ✨ **Savings Goals Tracker** - Create and track financial goals together
- 🎵 **iTunes Music Integration** - Search, preview, and save tracks
- 👥 **Real-Time Presence** - See when your partner is online
- 🎧 **Synced Listening** - Listen to music together in real-time
- 📝 **Enhanced Check-Ins** - See who submitted each check-in
- 📱 **Playlists** - Create and manage shared music playlists

## 📚 Original Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions
- **[.env.example](./.env.example)** - Environment variable template

## 🤝 Contributing

This is a personal project template. Feel free to fork and customize for your own use!

## 📄 License

MIT License - feel free to use this project as a template for your own applications.

## 🙏 Acknowledgments

- UI inspiration from modern relationship apps
- Built with love for couples who want to stay connected
- Powered by amazing open-source libraries

---

Made with 💜 for keeping relationships strong and organized!

## 🌍 Deploy to Vercel (Public URL)

Deploy to get a secure, globally accessible URL that works on any device/network.

1) Push to GitHub

```bash
git init
git add -A
git commit -m "init"
git branch -M main
# Replace with your repo URL
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

2) Vercel setup
- Import the repository at https://vercel.com/new
- Framework preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_SUPABASE_URL` = your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon key

`vercel.json` is included to handle SPA routing correctly.

3) Supabase Auth URLs
- Supabase Dashboard → Auth → URL Configuration
  - Site URL: `https://<your-project>.vercel.app`
  - Additional Redirect URLs: include your Vercel domain and any preview URLs if needed

After deploy, open your Vercel URL from any device to use the app.
