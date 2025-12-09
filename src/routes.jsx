import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { lazy } from 'react'
import PageTransition from './components/PageTransition'

const Dashboard = lazy(() => import('./pages/dashboard.jsx'))
const Schedule = lazy(() => import('./pages/schedule.jsx'))
const Media = lazy(() => import('./pages/media.jsx'))
const MapPage = lazy(() => import('./pages/map.jsx'))
const Profile = lazy(() => import('./pages/profile.jsx'))
const Bookmarks = lazy(() => import('./pages/bookmarks.jsx'))

export const router = createBrowserRouter([
  { path: '/', element: <PageTransition><Dashboard /></PageTransition> },
  { path: '/schedule', element: <PageTransition><Schedule /></PageTransition> },
  { path: '/media', element: <PageTransition><Media /></PageTransition> },
  { path: '/map', element: <PageTransition><MapPage /></PageTransition> },
  { path: '/profile', element: <PageTransition><Profile /></PageTransition> },
  { path: '/bookmarks', element: <PageTransition><Bookmarks /></PageTransition> },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}