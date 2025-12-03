# 🏗️ Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Pages (UI Layer)                        │   │
│  │  • Login/Register/Forgot Password (Public)          │   │
│  │  • Dashboard, Schedule, Media, Map, Profile         │   │
│  │  • Bookmarks                                         │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                         │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │         Components Layer                            │   │
│  │  • AppShell (Layout)                                │   │
│  │  • BottomTabs (Navigation)                          │   │
│  │  • ProtectedRoute (Auth Guard)                      │   │
│  │  • Modals (DailyCheckIn, Chat, etc.)               │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                         │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │          Context Layer                              │   │
│  │  • AuthContext (Auth State)                         │   │
│  │  • useAuth() Hook                                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                         │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │         Service Layer                               │   │
│  │  • api.js (30+ API functions)                       │   │
│  │  • CRUD operations                                  │   │
│  │  • Real-time subscriptions                          │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                         │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      │ HTTPS
                      │
┌─────────────────────▼─────────────────────────────────────┐
│                  SUPABASE (Backend)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    Auth      │  │  PostgreSQL  │  │   Storage    │     │
│  │              │  │   Database   │  │   (Media)    │     │
│  │ • Sessions   │  │ • RLS        │  │ • Images     │     │
│  │ • Users      │  │ • Tables     │  │ • Videos     │     │
│  │ • JWT        │  │ • Real-time  │  │ • Files      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Authentication Flow
```
User clicks "Sign In"
     ↓
Login Component (login.jsx)
     ↓
useAuth() hook
     ↓
AuthContext.signIn()
     ↓
Supabase Auth API
     ↓
Session Created
     ↓
User State Updated
     ↓
Redirect to Dashboard
```

### Protected Route Flow
```
User navigates to /dashboard
     ↓
ProtectedRoute component
     ↓
Check: Is user authenticated?
     ├─ NO → Redirect to /login
     └─ YES → Render Dashboard
```

### Data Fetching Flow
```
Component mounts
     ↓
useEffect() hook
     ↓
Call API function (e.g., getEvents)
     ↓
src/services/api.js
     ↓
Supabase client query
     ↓
PostgreSQL with RLS
     ↓
Return data to component
     ↓
Update local state
     ↓
Re-render UI
```

### Real-time Flow
```
Component subscribes
     ↓
subscribeToCheckIns(userId, callback)
     ↓
Supabase real-time channel
     ↓
Listen for changes
     ↓
Another user inserts data
     ↓
Real-time event triggered
     ↓
Callback executed
     ↓
Local state updated
     ↓
UI updates instantly
```

## File Structure & Responsibilities

```
src/
├── main.jsx                 # App entry point
├── App.jsx                  # Route configuration + AuthProvider
├── index.css               # Global styles
│
├── contexts/
│   └── AuthContext.jsx     # Auth state management
│       • User state
│       • signIn/signUp/signOut
│       • Session management
│
├── components/
│   ├── AppShell.jsx        # Page layout wrapper
│   ├── BottomTabs.jsx      # Navigation bar
│   ├── ProtectedRoute.jsx  # Auth guard
│   ├── QuickDashboard.jsx  # Floating dashboard
│   │
│   ├── modals/
│   │   ├── DailyCheckIn.jsx          # Check-in form
│   │   ├── EnhancedChat.jsx          # Notes/chat
│   │   ├── MemoryConstellation.jsx   # Insights view
│   │   └── RelationshipInsights.jsx  # Tips
│   │
│   └── ui/
│       ├── button.jsx      # Reusable button
│       └── dialog.jsx      # Modal wrapper
│
├── pages/
│   ├── login.jsx           # Public: Login page
│   ├── register.jsx        # Public: Registration
│   ├── forgot-password.jsx # Public: Password reset
│   ├── dashboard.jsx       # Protected: Home
│   ├── schedule.jsx        # Protected: Events & tasks
│   ├── media.jsx           # Protected: Photos/videos
│   ├── map.jsx             # Protected: Location pins
│   ├── profile.jsx         # Protected: User profile
│   └── bookmarks.jsx       # Protected: Saved places
│
├── services/
│   └── api.js              # Backend API layer
│       • All CRUD operations
│       • Real-time subscriptions
│       • File uploads
│
├── lib/
│   └── supabase.js         # Supabase client config
│
└── mock/
    └── data.js             # Mock data (for dev)
```

## Component Hierarchy

```
App (AuthProvider)
├── Routes
│   ├── Public Routes
│   │   ├── /login → Login
│   │   ├── /register → Register
│   │   └── /forgot-password → ForgotPassword
│   │
│   └── Protected Routes (ProtectedRoute wrapper)
│       ├── / → AppShell + Dashboard
│       ├── /schedule → AppShell + Schedule
│       ├── /media → AppShell + Media
│       ├── /map → AppShell + MapPage
│       ├── /profile → AppShell + Profile
│       └── /bookmarks → AppShell + Bookmarks
│
├── BottomTabs (always visible in protected routes)
└── QuickDashboard (floating, toggleable)
```

## State Management Strategy

### Global State (Context)
```javascript
AuthContext
├── user (object | null)
├── loading (boolean)
└── methods
    ├── signIn(email, password)
    ├── signUp(email, password, metadata)
    ├── signOut()
    ├── resetPassword(email)
    └── updatePassword(newPassword)
```

### Local State (Component)
```javascript
Component State
├── data (from API)
├── loading (boolean)
├── error (string | null)
└── UI state (modals, forms, etc.)
```

### Server State (Supabase)
```
Real-time subscriptions for:
├── check_ins
├── notes
└── (extensible to any table)
```

## API Service Layer Pattern

All API functions follow this pattern:

```javascript
// READ
export const getResource = async (userId) => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', userId)
  
  if (error) throw error
  return data
}

// CREATE
export const createResource = async (resourceData) => {
  const { data, error } = await supabase
    .from('table_name')
    .insert([resourceData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// UPDATE
export const updateResource = async (id, updates) => {
  const { data, error } = await supabase
    .from('table_name')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// DELETE
export const deleteResource = async (id) => {
  const { error } = await supabase
    .from('table_name')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// REAL-TIME
export const subscribeToResource = (userId, callback) => {
  return supabase
    .channel('resource_channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}
```

## Security Layers

```
┌──────────────────────────────────────┐
│   Layer 1: Route Guards              │
│   ProtectedRoute component           │
│   → Redirects unauthenticated users  │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│   Layer 2: Session Management        │
│   Supabase Auth                      │
│   → JWT tokens, refresh              │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│   Layer 3: Row Level Security        │
│   PostgreSQL RLS                     │
│   → Database-level access control    │
└──────────────────┬───────────────────┘
                   │
┌──────────────────▼───────────────────┐
│   Layer 4: Environment Variables     │
│   .env file (not committed)          │
│   → API keys, secrets                │
└──────────────────────────────────────┘
```

## Database Schema (Simplified)

```
relationships
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── partner_a, partner_b
├── start_date
└── savings_goal, savings_current

check_ins
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── date, emotion, energy
└── love_language

events
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── title, date, time
└── location, category, recurring

tasks
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── title, list
└── completed, added_by

media
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── url, type (photo/video)
└── caption, location, favorite

notes
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── author, content
└── date

pins (map markers)
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── lat, lng
└── title, description, date

bookmarks
├── id (UUID, PK)
├── user_id (FK → auth.users)
├── title, category, url
└── notes, visited
```

## Environment Configuration

```
Development:
├── .env (local, not committed)
├── .env.example (template, committed)
└── Vite loads VITE_* variables

Production:
├── Environment variables in hosting platform
│   (Vercel, Netlify, etc.)
└── Same variable names as .env
```

## Build & Deploy Flow

```
Development:
npm run dev
    ↓
Vite dev server
    ↓
Hot module reload
    ↓
http://localhost:5173

Production:
npm run build
    ↓
Vite builds to /dist
    ↓
Optimized bundle
    ↓
Deploy to hosting
    ↓
Static site + Supabase backend
```

## Performance Optimizations

1. **Code Splitting** - React Router lazy loading
2. **Caching** - Supabase queries with React Query (future)
3. **Optimistic Updates** - Update UI before backend confirms
4. **Lazy Loading** - Images and media on demand
5. **Tree Shaking** - Vite removes unused code
6. **CDN** - Supabase storage uses CDN

## Scalability Considerations

**Current Setup (Good for):**
- 1-10,000 users
- Moderate traffic
- Standard features

**Future Scaling (When needed):**
- Add Redis caching
- Implement pagination
- Edge functions for complex logic
- CDN for static assets
- Database indexing
- Load balancing

---

This architecture provides a solid foundation for a production-ready couples relationship app with room to grow! 🚀
