import { usePresence } from '../hooks/usePresence'
import { motion } from 'framer-motion'

const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return 'long ago'
}

export default function PresenceIndicator() {
  const { isPartnerOnline, partnerLastSeen, partnerListeningSession, partnerPresence } = usePresence()

  const displayName = partnerPresence?.__display_name || partnerListeningSession?.user_name || partnerPresence?.user_name || 'Partner'

  const getLastSeenText = () => {
    if (isPartnerOnline) return 'Online now'
    if (!partnerLastSeen) return 'Offline'
    
    try {
      return `Last seen ${formatTimeAgo(partnerLastSeen)}`
    } catch {
      return 'Offline'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 shadow-sm"
    >
      <div className="relative">
        <motion.div
          animate={{
            scale: isPartnerOnline ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: isPartnerOnline ? Infinity : 0,
            ease: "easeInOut"
          }}
          className={`w-2.5 h-2.5 rounded-full ${
            isPartnerOnline 
              ? 'bg-slate-600 shadow-lg shadow-slate-600/30' 
              : 'bg-gray-400'
          }`}
        />
        {isPartnerOnline && (
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-slate-300/40"
          />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-700">
          {displayName} — {getLastSeenText()}
        </span>
        {partnerListeningSession && partnerListeningSession.track && (
          <span className="text-xs text-gray-600">
            Listening to {partnerListeningSession.track.title || 'a track'}
            {partnerListeningSession.track.artist ? ` — ${partnerListeningSession.track.artist}` : ''}
          </span>
        )}
      </div>
    </motion.div>
  )
}
