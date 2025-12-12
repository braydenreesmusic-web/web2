import React from 'react'

function initials(name) {
  if (!name) return ''
  return name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
}

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  return (
    <div className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-600 text-white ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={name || 'avatar'} className="object-cover w-full h-full" />
      ) : (
        <span className="font-semibold">{initials(name)}</span>
      )}
    </div>
  )
}
