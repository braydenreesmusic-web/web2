import Dialog from './ui/dialog'
import { LogIn } from 'lucide-react'
import Button from './ui/button'

export default function ReauthDialog({ open, onClose }) {
  const handleRelogin = async () => {
    try {
      // sign out locally to clear any invalid session
      if (window.supabase?.auth) {
        await window.supabase.auth.signOut()
      }
    } catch (e) {
      // ignore
    }
    // redirect to login page for a fresh sign-in
    window.location.href = '/login'
  }

  return (
    <Dialog open={open} onClose={onClose} title="Session expired">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">Your session expired or could not be refreshed. Please sign in again to continue.</p>
        <div className="flex items-center gap-3">
          <Button onClick={handleRelogin} className="flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            Sign in
          </Button>
          <button className="text-sm text-gray-600" onClick={onClose}>Maybe later</button>
        </div>
      </div>
    </Dialog>
  )
}
