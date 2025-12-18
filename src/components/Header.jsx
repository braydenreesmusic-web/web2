import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PresenceIndicator from './PresenceIndicatorWrapper'

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
      role="banner"
      className="w-full glass-card blur-bg flex items-center justify-between px-4 sm:px-6 py-3 safe-area-top"
      style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
    >
      <div className="flex items-center gap-4">
        <button
          aria-label="Home"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 p-0 bg-transparent border-0 focus:outline-none"
        >
          <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center soft-shadow" style={{background:'linear-gradient(135deg, rgba(51,65,85,0.06), rgba(71,85,105,0.03))'}}>
            <img src="/logo.svg" alt="YouRees" className="w-8 h-8" />
          </div>
          <span className="text-lg font-semibold hidden sm:inline gradient-text tracking-tight">YouRees</span>
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

        {title && <h1 className="text-base font-semibold ml-2">{title}</h1>}
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
          <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgba(51,65,85,0.12)]" aria-label="Open profile">
            {user.user_metadata?.avatar ? (
              <img src={user.user_metadata.avatar} alt="Profile" className="w-9 h-9 rounded-full object-cover ring-1 ring-white shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-4 h-4 text-slate-600" /></div>
            )}
          </button>
        ) : null}
      </div>
    </motion.header>
  )
}
