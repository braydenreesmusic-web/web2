import AppShell from './components/AppShell.jsx'
import BottomTabs from './components/BottomTabs.jsx'
import QuickDashboard from './components/QuickDashboard.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/dashboard.jsx'
import Schedule from './pages/schedule.jsx'
import Media from './pages/media.jsx'
import MapPage from './pages/map.jsx'
import Profile from './pages/profile.jsx'
import Bookmarks from './pages/bookmarks.jsx'
import SavingsGoals from './pages/savings.jsx'
import AIInsightsPage from './pages/aiinsights.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'
import ForgotPassword from './pages/forgot-password.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen flex justify-center">
                <div className="w-full max-w-4xl px-4 pb-24">
                  <Routes>
                    <Route path="/" element={<AppShell title="Dashboard"><Dashboard/></AppShell>} />
                    <Route path="/schedule" element={<AppShell title="Schedule"><Schedule/></AppShell>} />
                    <Route path="/media" element={<AppShell title="Media"><Media/></AppShell>} />
                    <Route path="/map" element={<AppShell title="Map"><MapPage/></AppShell>} />
                    <Route path="/savings" element={<AppShell title="Savings"><SavingsGoals/></AppShell>} />
                    <Route path="/aiinsights" element={<AppShell title="AI Insights"><AIInsightsPage/></AppShell>} />
                    <Route path="/profile" element={<AppShell title="Profile"><Profile/></AppShell>} />
                    <Route path="/bookmarks" element={<AppShell title="Bookmarks"><Bookmarks/></AppShell>} />
                  </Routes>
                </div>
                <BottomTabs />
                <QuickDashboard />
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
      </AuthProvider>
    </ToastProvider>
  )
}