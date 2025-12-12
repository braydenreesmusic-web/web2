import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import PresenceIndicator from './PresenceIndicator'
import Header from './Header'

export default function AppShell({ title, children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const showBack = pathname !== '/';
  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, var(--accent-50) 0%, var(--bg) 40%)' }}>
      <div className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-6">
        <div className="w-full flex justify-center px-4">
          <div className="w-full app-container">
            <Header title={title} />
          </div>
        </div>
      </div>
      <div className="pt-[104px] pb-32">
        <div className="app-container">
          <div className="space-y-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}