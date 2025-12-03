import { useState } from 'react'

export default function Dialog({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold gradient-text">{title}</h2>
          <button className="px-3 py-1 rounded-full bg-gray-100" onClick={onClose}>Close</button>
        </div>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  )
}