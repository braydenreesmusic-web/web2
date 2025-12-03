import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Dashboard from './pages/dashboard.jsx'
import Schedule from './pages/schedule.jsx'
import Media from './pages/media.jsx'
import MapPage from './pages/map.jsx'
import Profile from './pages/profile.jsx'
import Bookmarks from './pages/bookmarks.jsx'

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/schedule', element: <Schedule /> },
  { path: '/media', element: <Media /> },
  { path: '/map', element: <MapPage /> },
  { path: '/profile', element: <Profile /> },
  { path: '/bookmarks', element: <Bookmarks /> },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}