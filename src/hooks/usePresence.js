import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updatePresence, subscribeToPresence, getPresence, getRelationshipData, subscribeToListeningSession, updateListeningSession } from '../services/api'

export const usePresence = () => {
  const { user } = useAuth()
  const [partnerPresence, setPartnerPresence] = useState(null)
  const [partnerUserId, setPartnerUserId] = useState(null)
  const [partnerListeningSession, setPartnerListeningSession] = useState(null)

  // refs must be at top-level of the hook
  const inFlight = useRef(false)
  const visTimer = useRef(null)

  useEffect(() => {
    if (!user) return

    let subscription = null
    let listenSubscription = null
    let heartbeatInterval = null

    const initialize = async () => {
      try {
        const relationship = await getRelationshipData(user.id)
        const partnerId = relationship?.partner_user_id

        if (partnerId) {
          setPartnerUserId(partnerId)
          const allPresence = await getPresence()
          const partner = allPresence?.find(p => p.user_id === partnerId)
          setPartnerPresence(partner || { is_online: false, last_seen: null })
        }

        if (partnerId) {
          try {
            listenSubscription = subscribeToListeningSession(partnerId, (payload) => {
              const { eventType, new: newRecord } = payload
              if (eventType === 'INSERT' || eventType === 'UPDATE') {
                setPartnerListeningSession(newRecord || null)
              }
              if (eventType === 'DELETE') {
                setPartnerListeningSession(null)
              }
            })
          } catch (e) {
            console.error('Failed to subscribe to partner listening session', e)
          }
        }

        // Set self as online (guard against overlaps)
        if (!inFlight.current) {
          inFlight.current = true
          try {
            await updatePresence(user.id, true)
          } finally {
            inFlight.current = false
          }
        }

        // heartbeat
        heartbeatInterval = setInterval(async () => {
          try {
            if (document.visibilityState === 'visible' && !inFlight.current) {
              inFlight.current = true
              await updatePresence(user.id, true)
            }
          } catch (e) {
            console.error('Heartbeat failed', e)
          } finally {
            inFlight.current = false
          }
        }, 25000)

        // subscribe to partner presence
        if (partnerId) {
          subscription = subscribeToPresence(partnerId, (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload
            if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord?.user_id === partnerId) {
              setPartnerPresence({
                is_online: newRecord.is_online,
                last_seen: newRecord.last_seen,
                updated_at: newRecord.updated_at
              })
            }

            if (eventType === 'DELETE' && oldRecord?.user_id === partnerId) {
              setPartnerPresence({
                is_online: false,
                last_seen: oldRecord.last_seen || new Date().toISOString(),
                updated_at: oldRecord?.updated_at || new Date().toISOString()
              })
            }
          })
        }
      } catch (e) {
        console.error('Failed to initialize presence', e)
      }
    }

    initialize()

    const handleBeforeUnload = async () => {
      if (navigator.sendBeacon) {
        await updatePresence(user.id, false)
      }
    }

    const handleVisibilityChange = async () => {
      if (visTimer.current) clearTimeout(visTimer.current)
      visTimer.current = setTimeout(async () => {
        try {
          if (!inFlight.current) {
            inFlight.current = true
            const isVisible = document.visibilityState === 'visible'
            await updatePresence(user.id, isVisible)
          }
        } catch (e) {
          console.error('Visibility presence update failed', e)
        } finally {
          inFlight.current = false
        }
      }, 300)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (subscription) subscription.unsubscribe()
      if (listenSubscription) listenSubscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (!inFlight.current) {
        inFlight.current = true
        updatePresence(user.id, false).finally(() => {
          inFlight.current = false
        })
      }
    }
  }, [user])

  return {
    partnerPresence,
    partnerUserId,
    isPartnerOnline: (() => {
      if (!partnerPresence) return false
      const updated = partnerPresence.updated_at ? new Date(partnerPresence.updated_at).getTime() : 0
      const fresh = Date.now() - updated < 40000
      return Boolean(partnerPresence.is_online && fresh)
    })(),
    partnerLastSeen: partnerPresence?.last_seen,
    partnerListeningSession,
    setMyListeningSession: async (sessionData) => {
      try {
        return await updateListeningSession(user.id, sessionData)
      } catch (e) {
        console.error('Failed to update listening session', e)
      }
    }
  }
}


