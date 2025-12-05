import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

export default function PlaybackControls({ isPlaying, onPlayPause, onSkipBack, onSkipForward }) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button
        onClick={onSkipBack}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="Skip back 10 seconds"
      >
        <SkipBack className="w-5 h-5 text-gray-600" />
      </button>

      <button
        onClick={onPlayPause}
        className="p-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-xl transition-shadow"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
      </button>

      <button
        onClick={onSkipForward}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="Skip forward 10 seconds"
      >
        <SkipForward className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  )
}
