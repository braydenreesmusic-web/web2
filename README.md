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
- Real-time updates with Supabase subscriptions
- Beautiful gradient animations

### 📅 Schedule Management
- Calendar view with events
- Shared task lists (To-Do, Groceries, etc.)
- Date jar with romantic ideas
- Recurring events support

### 📷 Media Center
- Notes with real-time sync
- Photo gallery with favorites
- Video library
- Music playlists with listening sessions

### 🗺️ Interactive Map
- Memory pins for special locations
- Location sharing between partners
- Custom markers with photos and descriptions

### 🔖 Bookmarks
- Save favorite places and resources
- Category filters (Restaurants, Activities, etc.)
- Mark visited locations

### 👤 Profile
- User information and relationship stats
- Savings goal tracking
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
- Setting up the database schema
- Configuring storage for media uploads
- Security policies and RLS setup

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
