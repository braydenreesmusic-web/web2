import { motion } from 'framer-motion'

export default function ProgressBar({ currentTime = 0, duration = 0, onSeek }) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <div className="w-full">
      <div
        onClick={onSeek}
        className="h-2 bg-gray-200 rounded-full cursor-pointer relative overflow-hidden"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        title="Seek"
      >
        <motion.div
          className="absolute left-0 top-0 h-2 bg-gradient-to-r from-pink-500 to-purple-500"
          style={{ width: `${pct}%` }}
          layout
        />
      </div>
    </div>
  )
}
