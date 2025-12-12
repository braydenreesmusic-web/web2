import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy } from 'react'
import PageTransition from './components/PageTransition'

const Dashboard = lazy(() => import('./pages/dashboard.jsx'))
const Schedule = lazy(() => import('./pages/schedule.jsx'))
const Media = lazy(() => import('./pages/media.jsx'))
const MapPage = lazy(() => import('./pages/map.jsx'))
const Profile = lazy(() => import('./pages/profile.jsx'))
const AdminGameEvents = lazy(() => import('./pages/admin-game-events.jsx'))
const AdminPushSubscriptions = lazy(() => import('./pages/admin-push-subscriptions.jsx'))
const AdminPresence = lazy(() => import('./pages/admin-presence.jsx'))
const Bookmarks = lazy(() => import('./pages/bookmarks.jsx'))
const Play = lazy(() => import('./pages/play.jsx'))

export const router = createBrowserRouter([
  { path: '/', element: <PageTransition><Dashboard /></PageTransition> },
  { path: '/schedule', element: <PageTransition><Schedule /></PageTransition> },
  { path: '/media', element: <PageTransition><Media /></PageTransition> },
  { path: '/map', element: <PageTransition><MapPage /></PageTransition> },
  { path: '/profile', element: <PageTransition><Profile /></PageTransition> },
  { path: '/admin/game-events', element: <PageTransition><AdminGameEvents /></PageTransition> },
  { path: '/admin/push-subscriptions', element: <PageTransition><AdminPushSubscriptions /></PageTransition> },
  { path: '/admin/presence', element: <PageTransition><AdminPresence /></PageTransition> },
  { path: '/bookmarks', element: <PageTransition><Bookmarks /></PageTransition> },
  { path: '/play', element: <PageTransition><Play /></PageTransition> },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}