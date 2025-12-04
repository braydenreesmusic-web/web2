import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Calendar, Image, Bookmark, MapPin, User, Zap } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/media', label: 'Media', icon: Image },
  { to: '/aiinsights', label: 'AI', icon: Zap },
  { to: '/bookmarks', label: 'Saved', icon: Bookmark },
  { to: '/map', label: 'Map', icon: MapPin },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function BottomTabs() {
  const { pathname } = useLocation()
  return (
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl glass-card px-2 sm:px-3 py-2 z-50 shadow-lg" 
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <ul className="grid grid-cols-7 gap-1">
        {tabs.map(t => {
          const active = pathname === t.to
          const Icon = t.icon
          return (
            <li key={t.to}>
              <Link 
                to={t.to} 
                className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${active ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon 
                    className={`w-5 h-5 mb-1 ${active ? 'text-purple-500' : ''}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.div>
                <span className="text-xs font-medium">{t.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </motion.nav>
  )
}