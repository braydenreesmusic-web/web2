import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updatePresence, subscribeToPresence } from '../services/api'

export const usePresence = () => {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState([])

  useEffect(() => {
    if (!user) return

    // Set self as online
    updatePresence(user.id, true)

    // Update presence every 30 seconds
    const interval = setInterval(() => {
      updatePresence(user.id, true)
    }, 30000)

    // Subscribe to presence changes
    const subscription = subscribeToPresence((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.user_id !== payload.new.user_id)
          return payload.new.is_online ? [...filtered, payload.new] : filtered
        })
      }
    })

    // Set self as offline when leaving
    const handleBeforeUnload = () => {
      updatePresence(user.id, false)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updatePresence(user.id, false)
    }
  }, [user])

  return { onlineUsers }
}
