import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

export default function PlaybackControls({ isPlaying, onPlayPause, onSkipBack, onSkipForward }) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={onSkipBack}
        className="p-2 rounded-full hover:bg-gray-100/60 focus:outline-none focus:ring-2 focus:ring-accent-400 transition"
        aria-label="Skip back 10 seconds"
      >
        <SkipBack className="w-5 h-5 text-gray-600" />
      </button>

      <button
        onClick={onPlayPause}
        className="p-4 rounded-full bg-gradient-to-r from-accent-700 to-accent-500 text-white hover:shadow-2xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
      </button>

      <button
        onClick={onSkipForward}
        className="p-2 rounded-full hover:bg-gray-100/60 focus:outline-none focus:ring-2 focus:ring-accent-400 transition"
        aria-label="Skip forward 10 seconds"
      >
        <SkipForward className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  )
}
