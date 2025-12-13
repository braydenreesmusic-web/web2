import { motion } from 'framer-motion'

export default function ProgressBar({ currentTime = 0, duration = 0, onSeek }) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className="w-full">
      <div
        onClick={onSeek}
        className="h-2 md:h-2.5 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        title="Seek"
      >
        <motion.div
          className="absolute left-0 top-0 h-2 md:h-2.5 bg-gradient-to-r from-accent-700 to-accent-600"
          style={{ width: `${pct}%` }}
          layout
        />

        {/* thumb indicator */}
        <div
          className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-3.5 md:h-3.5 bg-white rounded-full shadow-md pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  )
}
