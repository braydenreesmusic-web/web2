import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function Dialog({ open, onClose, title, children }) {
  if (!open) return null
  const titleId = `dialog-title-${String(title || '').replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 id={titleId} className="text-lg font-semibold text-[var(--text)]">{title}</h2>
          <button
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border" 
            onClick={onClose}
            aria-label="Close dialog"
            type="button"
            title="Close"
            style={{ borderColor: 'var(--border)' }}
          >
            <X className="w-4 h-4 text-[var(--muted)]" />
          </button>
        </div>
        <div className="px-4 pb-4">
          {children}
        </div>
      </motion.div>
    </div>
  )
}