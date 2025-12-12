import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { registerServiceWorker, subscribeToPush, subscribeToPushAndReturn, unsubscribeFromPush, isPushSupported } from '../services/notifications'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function NotificationsButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    setSupported(isPushSupported())
    // check existing subscription
    async function check() {
      if (!('serviceWorker' in navigator)) return
      const reg = await navigator.serviceWorker.getRegistration()
      if (!reg) return
      const s = await reg.pushManager.getSubscription()
      setSubscribed(!!s)
    }
    check()
  }, [])

  const { user } = useAuth()

  // use global showToast

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      let vapid = import.meta.env.VITE_VAPID_PUBLIC
      // If the public key isn't baked into the build, try fetching it from the server
      if (!vapid) {
        try {
          const r = await fetch('/api/push/vapid')
          if (r.ok) {
            const j = await r.json()
            vapid = j.publicKey
          }
        } catch (e) {
          console.warn('Failed to fetch vapid from server', e)
        }
      }
      if (!vapid) throw new Error('VAPID public key not configured (VITE_VAPID_PUBLIC)')
      // Request permission from a direct user gesture
      if (Notification.permission === 'denied') {
        showToast && showToast('Notifications are blocked for this site. Please enable in your browser settings.', { type: 'error' })
        setLoading(false)
        return
      }

      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission() // must be called from click handler
        if (perm !== 'granted') throw new Error('Notification permission denied')
      }

      // permission is granted now — perform registration & subscribe
      // Pass current user id so server-side save includes `user_id` when signed-in
      const sub = await subscribeToPushAndReturn(vapid, user?.id ?? null)
      // After subscribing, attempt a quick test push to the subscription so users
      // immediately observe a notification (best-effort).
      try {
        const r = await fetch('/api/push/send-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, title: 'Notifications Enabled', body: 'You will receive updates from the app.' })
        })
        if (!r.ok) {
          const txt = await r.text().catch(() => '')
          console.warn('test push send failed', r.status, txt)
          showToast && showToast('Subscribed locally. Server push not fully configured — check VAPID envs.', { type: 'warning' })
        }
      } catch (e) {
        console.warn('test push send failed', e)
        showToast && showToast('Subscribed locally. Server push not fully configured — check VAPID envs.', { type: 'warning' })
      }
      setSubscribed(true)
      showToast && showToast('Notifications enabled', { type: 'success' })
    } catch (e) {
      console.error('subscribe error', e)
      showToast && showToast(e.message || 'Failed to subscribe', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
      showToast && showToast('Notifications disabled', { type: 'info' })
    } catch (e) {
      console.error('unsubscribe error', e)
      showToast && showToast('Failed to unsubscribe', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return (
    <div className="text-xs text-gray-500">Notifications not supported in this browser</div>
  )

  return (
    <div className="relative">
      <button
        onClick={subscribed ? handleUnsubscribe : handleSubscribe}
        disabled={loading}
        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center gap-2"
      >
        {subscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {loading ? 'Working...' : (subscribed ? 'Disable Notifications' : 'Enable Notifications')}
      </button>

      {/* global toasts render in ToastProvider */}
    </div>
  )
}
