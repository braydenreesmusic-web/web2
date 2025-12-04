import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updatePresence, subscribeToPresence, getPresence, getRelationshipData } from '../services/api'

export const usePresence = () => {
  const { user } = useAuth()
  const [partnerPresence, setPartnerPresence] = useState(null)
  const [partnerUserId, setPartnerUserId] = useState(null)

  useEffect(() => {
    if (!user) return

    let subscription = null
    let heartbeatInterval = null

    const initialize = async () => {
      try {
        // Get partner's user_id from relationship
        const relationship = await getRelationshipData(user.id)
        const partnerId = relationship?.partner_user_id
        
        if (partnerId) {
          setPartnerUserId(partnerId)
          
          // Load partner's initial presence
          const allPresence = await getPresence()
          const partner = allPresence?.find(p => p.user_id === partnerId)
          setPartnerPresence(partner || { is_online: false, last_seen: null })
        }

        // Set self as online
        await updatePresence(user.id, true)

        // Update presence every 25 seconds (heartbeat)
        heartbeatInterval = setInterval(async () => {
          try {
            await updatePresence(user.id, true)
          } catch (e) {
            console.error('Heartbeat failed', e)
          }
        }, 25000)

        // Subscribe to presence changes
        subscription = subscribeToPresence((payload) => {
          if (!partnerId) return
          
          const { eventType, new: newRecord } = payload
          
          if (newRecord?.user_id === partnerId) {
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              setPartnerPresence({
                is_online: newRecord.is_online,
                last_seen: newRecord.last_seen,
                updated_at: newRecord.updated_at
              })
            }
          }
        })

      } catch (e) {
        console.error('Failed to initialize presence', e)
      }
    }

    initialize()

    // Set self as offline when leaving
    const handleBeforeUnload = async () => {
      // Use sendBeacon for reliable offline status on page close
      if (navigator.sendBeacon) {
        // This would need a server endpoint, so we'll use the regular update
        await updatePresence(user.id, false)
      }
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await updatePresence(user.id, true)
      } else {
        await updatePresence(user.id, false)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (subscription) subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Set offline when component unmounts
      updatePresence(user.id, false)
    }
  }, [user])

  return { 
    partnerPresence,
    partnerUserId,
    isPartnerOnline: partnerPresence?.is_online || false,
    partnerLastSeen: partnerPresence?.last_seen
  }
}
