import { useEffect, useState } from 'react'
import { subscribeToPush, subscribeToPushAndReturn, registerServiceWorker, isPushSupported } from '../services/notifications'
import { useAuth } from '../contexts/AuthContext'

const STORAGE_KEY = 'notifications_prompt_dismissed'

export default function NotificationPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    async function check() {
      if (!isPushSupported()) return
      if (localStorage.getItem(STORAGE_KEY) === '1') return
      if (Notification && Notification.permission === 'granted') return

      // If there's an active subscription, don't prompt
      try {
        if (!('serviceWorker' in navigator)) return
        const reg = await navigator.serviceWorker.getRegistration()
        if (reg) {
          const s = await reg.pushManager.getSubscription()
          if (s) return
        }
      } catch (e) {
        console.warn('subscription check failed', e)
      }

      // Wait a touch to avoid jumping UI
      setTimeout(() => setShow(true), 350)
    }
    check()
  }, [])

  const dismiss = (snooze = true) => {
    if (snooze) localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  const { user } = useAuth()

  const handleEnable = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const vapid = import.meta.env.VITE_VAPID_PUBLIC
      if (!vapid) throw new Error('VAPID public key not configured (VITE_VAPID_PUBLIC)')
      // Request permission from a direct user gesture (button click)
      if (Notification.permission === 'denied') {
        setMessage('Notifications are blocked. Please enable them in your browser settings.')
        setLoading(false)
        return
      }

      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') throw new Error('Notification permission denied')
      }

      const userId = user?.id ?? null
      // Only attempt server-side save when we have an authenticated user_id
      const sub = await subscribeToPush(vapid, userId, Boolean(userId))
      await subscribeToPushAndReturn(vapid, userId)
      setMessage('Notifications enabled')
      localStorage.setItem(STORAGE_KEY, '1')
      setTimeout(() => setShow(false), 900)
    } catch (e) {
      console.error('prompt subscribe error', e)
      setMessage(e?.message || 'Failed to enable notifications')
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-40" onClick={() => dismiss(true)} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-lg p-5">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="font-semibold">Enable Notifications</div>
            <div className="text-sm text-gray-600 mt-1">Get reminders and message alerts even when the app is closed.</div>
            {message && <div className="mt-3 text-sm text-slate-600">{message}</div>}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => dismiss(true)} className="px-3 py-2 rounded-lg bg-gray-100 text-sm">Not now</button>
          <button onClick={handleEnable} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">
            {loading ? 'Working…' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  )
}
