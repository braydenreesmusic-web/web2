import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar.jsx'

export default function PolishedHeader({ title }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  return (
    <header className="w-full glass-card border-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              aria-label="Home"
              onClick={() => navigate('/')}
              className="flex items-center gap-3 p-0 bg-transparent border-0"
            >
              <img src="/logo.svg" alt="YouRees" className="w-10 h-10 rounded-md object-cover" />
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-slate-900">Web Try</span>
                {title ? <span className="text-xs text-slate-500">{title}</span> : null}
              </div>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a className="text-slate-600 hover:text-slate-900" href="/dashboard">Dashboard</a>
            <a className="text-slate-600 hover:text-slate-900" href="/media">Media</a>
            <a className="text-slate-600 hover:text-slate-900" href="/aiinsights">AI</a>
            <a className="text-slate-600 hover:text-slate-900" href="/map">Map</a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50">
              {user ? (
                <Avatar src={user.user_metadata?.avatar} name={user.user_metadata?.name || user.email} size="md" />
              ) : (
                <img src="/logo.svg" alt="me" className="w-8 h-8 rounded-full object-cover" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
