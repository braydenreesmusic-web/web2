import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function Dialog({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.22 }} className="card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-50 border" onClick={onClose} aria-label="Close dialog">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="px-4 pb-4">
          {children}
        </div>
      </motion.div>
    </div>
  )
}