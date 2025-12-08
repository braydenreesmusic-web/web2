import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { registerServiceWorker, subscribeToPush, subscribeToPushAndReturn, unsubscribeFromPush, isPushSupported } from '../services/notifications'
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

  // use global showToast

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const vapid = import.meta.env.VITE_VAPID_PUBLIC
      if (!vapid) throw new Error('VAPID public key not configured (VITE_VAPID_PUBLIC)')
      // Request permission from a direct user gesture
      if (Notification.permission === 'denied') {
        showToast && showToast('Notifications are blocked for this site. Please enable in your browser settings.')
        setLoading(false)
        return
      }

      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission() // must be called from click handler
        if (perm !== 'granted') throw new Error('Notification permission denied')
      }

      // permission is granted now — perform registration & subscribe
      const sub = await subscribeToPush(vapid)
      // convenience wrapper left for compatibility
      await subscribeToPushAndReturn(vapid)
      setSubscribed(true)
      showToast && showToast('Notifications enabled')
    } catch (e) {
      console.error('subscribe error', e)
      showToast && showToast(e.message || 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
      showToast && showToast('Notifications disabled')
    } catch (e) {
      console.error('unsubscribe error', e)
      showToast && showToast('Failed to unsubscribe')
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
