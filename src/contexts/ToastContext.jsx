import { createContext, useContext, useState } from 'react'

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
    const toast = { id, message, ...opts }
    setToasts((s) => [...s, toast])
    const ttl = opts.duration ?? 4000
    setTimeout(() => setToasts((s) => s.filter(t => t.id !== id)), ttl)
    return id
  }

  const removeToast = (id) => setToasts((s) => s.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed z-50 right-4 bottom-6 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className="max-w-sm w-full bg-white border rounded-lg px-4 py-2 shadow text-sm">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastContext
