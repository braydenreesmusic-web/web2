import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PresenceIndicator from './PresenceIndicator'
import { usePresence } from '../hooks/usePresence'

export default function Header({ title }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const showBack = pathname !== '/'

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
      className="w-full glass-card flex items-center justify-between px-4 sm:px-6 py-3"
    >
      <div className="flex items-center gap-4">
        <button
          aria-label="Home"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 p-0 bg-transparent border-0"
        >
          <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center" style={{background:'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))'}}>
            <img src="/logo copy.svg" alt="YouRees" className="w-8 h-8" />
          </div>
          <span className="text-lg font-semibold hidden sm:inline gradient-text">YouRees</span>
        </button>

        <div className="hidden md:block">
          <PresenceIndicator />
        </div>

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
        {user ? (
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50">
            {user.user_metadata?.avatar ? (
              <img src={user.user_metadata.avatar} alt="me" className="w-9 h-9 rounded-full object-cover ring-1 ring-white shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-4 h-4 text-slate-600" /></div>
            )}
          </button>
        ) : null}
      </div>
    </motion.header>
  )
}
