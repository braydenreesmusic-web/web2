import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function Header({ title }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const showBack = pathname !== '/'

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="w-full glass-card flex items-center justify-between px-4 sm:px-6 py-2"
    >
      <div className="flex items-center gap-3">
        <button
          aria-label="Home"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 p-0 bg-transparent border-0"
        >
          <img
            src="/logo.png"
            alt="YouRees"
            className="w-8 h-8 rounded-md"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/logo.svg' }}
          />
          <span className="text-lg font-semibold hidden sm:inline">YouRees</span>
        </button>
        {showBack && (
          <button
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="btn-ghost px-2 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        {title && <h1 className="text-lg font-semibold ml-2">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-quick-dashboard'))}
          className="btn-ghost px-2 py-2"
          aria-label="Open dashboard"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline ml-1 text-sm muted">Dashboard</span>
        </button>
      </div>
    </motion.header>
  )
}
