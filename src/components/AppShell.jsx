import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function AppShell({ title, children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const showBack = pathname !== '/'
  return (
    <main>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pt-6 pb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Back to Dashboard"
              className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            {title}
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Quick Dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-shadow"
          onClick={() => window.dispatchEvent(new CustomEvent('open-quick-dashboard'))}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </motion.button>
      </motion.header>
      {children}
    </main>
  )
}