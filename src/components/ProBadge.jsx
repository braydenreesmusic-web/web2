import React from 'react'

export default function ProBadge({ size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-semibold ${sizeClass}`}
      title="Pro feature"
    >
      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l2.9 6.3L21 9.2l-5 4.3L17 21l-5-3-5 3 1-7.5L3 9.2l6.1-0.9L12 2z" fill="currentColor" />
      </svg>
      PRO
    </span>
  )
}
