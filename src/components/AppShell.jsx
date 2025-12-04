import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'

export default function AppShell({ title, children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showBack = pathname !== '/';
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-6">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl glass-card blur-bg flex items-center justify-between px-4 sm:px-8 py-4 shadow-xl rounded-[24px] border border-white/30 backdrop-blur-2xl"
          style={{
            boxShadow: '0 12px 30px rgba(0,0,0,0.12), 0 1.5px 8px rgba(236,72,153,0.08)',
            background: 'rgba(255,255,255,0.75)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            backdropFilter: 'blur(24px) saturate(1.2)',
          }}
        >
        <div className="flex items-center gap-3">
          {showBack && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              aria-label="Back to Dashboard"
              className="expensive-btn !px-3 !py-2 !rounded-[16px] bg-white/60 text-gray-700 shadow-md hover:bg-white/80 border border-white/40"
              style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.10)' }}
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
          <h1 className="gradient-text flex items-center gap-2 text-xl sm:text-2xl font-bold">
            {title}
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
          aria-label="Quick Dashboard"
          className="expensive-btn flex items-center gap-2 !rounded-[16px] shadow-lg"
          onClick={() => window.dispatchEvent(new CustomEvent('open-quick-dashboard'))}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </motion.button>
        </motion.header>
      </div>
      <div className="pt-[110px] max-w-3xl mx-auto px-4">
        {children}
      </div>
    </main>
  );
}