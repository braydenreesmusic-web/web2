import { motion } from 'framer-motion'
import { Play, Plus } from 'lucide-react'

export default function TrackCard({ track, onPlay, onAdd, compact = false }) {
  const title = track.track_name || track.trackName
  const artist = track.artist_name || track.artistName
  const artwork = track.artwork_url || track.artworkUrl100 || track.artworkUrl60

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ translateY: -3 }}
      className={`glass-card p-3 flex items-center gap-3 ${compact ? 'py-2' : ''}`}
    >
      {artwork && (
        <div className={`relative flex-shrink-0 ${compact ? 'w-12 h-12' : 'w-20 h-20'}`}>
          <img src={artwork} alt="" className={`rounded ${compact ? 'w-12 h-12' : 'w-20 h-20'} object-cover`} />

          {/* Hover overlay play button for non-compact cards */}
          {!compact && (track.preview_url || track.previewUrl) && (
            <button
              onClick={() => onPlay?.(track)}
              aria-label={`Play ${title}`}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 rounded transition-opacity opacity-0 hover:opacity-100"
              style={{ backdropFilter: 'none' }}
            >
              <div className="p-2 bg-white rounded-full shadow-md">
                <Play className="w-4 h-4 text-accent-600" />
              </div>
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        <div className="text-sm text-gray-400 truncate">{artist}</div>
      </div>

      <div className="flex items-center gap-2">
        {/* Small inline play button for compact mode or as backup */}
        {(compact && (track.preview_url || track.previewUrl)) ? (
          <button
            onClick={() => onPlay?.(track)}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label={`Play ${title}`}
          >
            <Play className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
          </button>
        ) : null}

        {onAdd ? (
          <button
            onClick={() => onAdd?.(track)}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label={`Add ${title} to library`}
          >
            <Plus className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}
