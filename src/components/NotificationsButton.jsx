import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { registerServiceWorker, subscribeToPush, saveSubscriptionToServer, unsubscribeFromPush, isPushSupported } from '../services/notifications'

export default function NotificationsButton() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

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

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const vapid = import.meta.env.VITE_VAPID_PUBLIC
      if (!vapid) throw new Error('VAPID public key not configured (VITE_VAPID_PUBLIC)')
      const sub = await subscribeToPush(vapid)
      await saveSubscriptionToServer(sub)
      setSubscribed(true)
      showToast('Notifications enabled')
    } catch (e) {
      console.error('subscribe error', e)
      showToast(e.message || 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
      showToast('Notifications disabled')
    } catch (e) {
      console.error('unsubscribe error', e)
      showToast('Failed to unsubscribe')
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

      {toast && (
        <div className="absolute right-0 mt-2 w-64 p-3 bg-white border rounded shadow text-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
