import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, User, Heart, Calendar, Camera, FileText } from 'lucide-react'
import { getNotes, getMedia, getEvents } from '../services/api'

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ notes: 0, photos: 0, events: 0 })

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const [notes, photos, events] = await Promise.all([
          getNotes(user.id),
          getMedia(user.id, 'photo'),
          getEvents(user.id)
        ])
        setCounts({ notes: notes?.length || 0, photos: photos?.length || 0, events: events?.length || 0 })
      } catch (e) { console.error(e) }
    })()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <section className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="font-semibold text-xl">{user?.user_metadata?.name || 'User'}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-pink-500" />
            <div className="font-semibold">Relationship</div>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Start: 2024-06-01</div>
            <div>Partners: Alex & Sam</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="font-semibold mb-3">Stats</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>Notes: {counts.notes}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4 text-pink-500" />
              <span>Photos: {counts.photos}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Events: {counts.events}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.button 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSignOut}
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 flex items-center justify-center gap-2 font-medium text-gray-700 transition-all"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </motion.button>
    </section>
  )
}