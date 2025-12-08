import { createContext, useContext, useState } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = (message, opts = {}) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type: opts.type || 'info', duration: opts.duration ?? 4000, ...opts }
    setToasts((s) => [...s, toast])
    const ttl = toast.duration
    setTimeout(() => setToasts((s) => s.filter(t => t.id !== id)), ttl)
    return id
  }

  const removeToast = (id) => setToasts((s) => s.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed z-50 right-4 bottom-6 flex flex-col gap-2">
        {toasts.map(t => {
          const bg = t.type === 'success' ? 'bg-green-50 border-green-200' : t.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
          const icon = t.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : t.type === 'error' ? <XCircle className="w-4 h-4 text-red-600" /> : <Info className="w-4 h-4 text-blue-600" />
          return (
            <div key={t.id} className={`max-w-sm w-full ${bg} border rounded-lg px-4 py-2 shadow text-sm flex items-start gap-3`}>
              <div className="mt-0.5">{icon}</div>
              <div className="flex-1">{t.message}</div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastContext
