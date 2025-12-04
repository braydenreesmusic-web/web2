import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Play, Pause, Plus, List, Music2, Users } from 'lucide-react'
import Button from './ui/button'
import Dialog from './ui/dialog'
import {
  searchItunesMusic,
  saveMusicTrack,
  getMusicTracks,
  getPlaylists,
  createPlaylist,
  getPlaylistTracks,
  addTrackToPlaylist,
  updateListeningSession,
  subscribeToListeningSession
} from '../services/api'

export default function MusicTab({ user }) {
  const [view, setView] = useState('search') // search, library, playlists, listening
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [library, setLibrary] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [currentPlaylist, setCurrentPlaylist] = useState(null)
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [playlistTitle, setPlaylistTitle] = useState('')
  
  // Synced listening state
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!user) return
    loadLibrary()
    loadPlaylists()
    
    // Subscribe to listening session updates
    const sub = subscribeToListeningSession(user.id, (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        // Partner's playback update
        setIsPlaying(payload.new.is_playing)
        if (audioRef.current && Math.abs(audioRef.current.currentTime - payload.new.playback_position) > 2) {
          audioRef.current.currentTime = payload.new.playback_position
        }
      }
    })
    
    return () => sub.unsubscribe()
  }, [user])

  const loadLibrary = async () => {
    try {
      const tracks = await getMusicTracks(user.id)
      setLibrary(tracks || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadPlaylists = async () => {
    try {
      const data = await getPlaylists(user.id)
      setPlaylists(data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await searchItunesMusic(searchQuery)
      setSearchResults(results)
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  const handleAddToLibrary = async (track) => {
    try {
      const saved = await saveMusicTrack({
        user_id: user.id,
        track_id: track.trackId.toString(),
        track_name: track.trackName,
        artist_name: track.artistName,
        album_name: track.collectionName,
        artwork_url: track.artworkUrl100,
        preview_url: track.previewUrl,
        duration_ms: track.trackTimeMillis
      })
      setLibrary(prev => [saved, ...prev])
      alert('Added to library!')
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!playlistTitle.trim()) return
    try {
      const playlist = await createPlaylist({
        user_id: user.id,
        title: playlistTitle.trim()
      })
      setPlaylists(prev => [playlist, ...prev])
      setPlaylistTitle('')
      setShowNewPlaylist(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handlePlayTrack = async (track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    if (audioRef.current) {
      audioRef.current.src = track.preview_url || track.previewUrl
      audioRef.current.play()
      
      // Update session for synced listening
      await updateListeningSession(user.id, {
        track_id: track.id,
        is_playing: true,
        playback_position: 0
      })
    }
  }

  const handlePlayPause = async () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
      await updateListeningSession(user.id, {
        track_id: currentTrack?.id,
        is_playing: false,
        playback_position: audioRef.current.currentTime
      })
    } else {
      audioRef.current.play()
      await updateListeningSession(user.id, {
        track_id: currentTrack?.id,
        is_playing: true,
        playback_position: audioRef.current.currentTime
      })
    }
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    if (!audioRef.current) return
    
    const updateTime = () => setCurrentTime(audioRef.current.currentTime)
    const handleEnded = () => setIsPlaying(false)
    
    audioRef.current.addEventListener('timeupdate', updateTime)
    audioRef.current.addEventListener('ended', handleEnded)
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateTime)
        audioRef.current.removeEventListener('ended', handleEnded)
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* View tabs */}
      <div className="glass-card p-2 grid grid-cols-4 gap-2">
        {['search', 'library', 'playlists', 'listening'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 rounded-xl capitalize transition-all ${
              view === v
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Search view */}
      {view === 'search' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search songs, artists, albums..."
              className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {searching && <div className="text-center text-gray-500">Searching...</div>}

          <div className="grid md:grid-cols-2 gap-3">
            {searchResults.map(track => (
              <motion.div
                key={track.trackId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-3 flex gap-3"
              >
                {track.artworkUrl60 && (
                  <img src={track.artworkUrl60} alt="" className="w-16 h-16 rounded-lg" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{track.trackName}</div>
                  <div className="text-sm text-gray-500 truncate">{track.artistName}</div>
                  <div className="flex gap-2 mt-2">
                    {track.previewUrl && (
                      <button
                        onClick={() => handlePlayTrack(track)}
                        className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600 hover:bg-purple-200"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAddToLibrary(track)}
                      className="text-xs px-2 py-1 rounded bg-pink-100 text-pink-600 hover:bg-pink-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Library view */}
      {view === 'library' && (
        <div className="space-y-2">
          {!library.length && (
            <div className="glass-card p-8 text-center text-gray-500">
              <Music2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              No tracks in library. Search and add some!
            </div>
          )}
          {library.map(track => (
            <div key={track.id} className="glass-card p-3 flex items-center gap-3">
              {track.artwork_url && (
                <img src={track.artwork_url} alt="" className="w-12 h-12 rounded" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{track.track_name}</div>
                <div className="text-sm text-gray-500 truncate">{track.artist_name}</div>
              </div>
              {track.preview_url && (
                <button
                  onClick={() => handlePlayTrack(track)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <Play className="w-4 h-4 text-purple-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Playlists view */}
      {view === 'playlists' && (
        <div className="space-y-4">
          <Button onClick={() => setShowNewPlaylist(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Playlist
          </Button>

          <div className="grid md:grid-cols-2 gap-3">
            {playlists.map(playlist => (
              <div key={playlist.id} className="glass-card p-4">
                <div className="font-semibold">{playlist.title}</div>
                <div className="text-sm text-gray-500">{playlist.description || 'No description'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synced Listening view */}
      {view === 'listening' && (
        <div className="glass-card p-6 text-center space-y-4">
          <Users className="w-12 h-12 mx-auto text-purple-500" />
          <h3 className="font-semibold text-lg">Listen Together</h3>
          {currentTrack ? (
            <div className="space-y-3">
              {currentTrack.artwork_url && (
                <img src={currentTrack.artwork_url} alt="" className="w-32 h-32 mx-auto rounded-lg shadow-lg" />
              )}
              <div className="font-medium">{currentTrack.track_name || currentTrack.trackName}</div>
              <div className="text-sm text-gray-500">{currentTrack.artist_name || currentTrack.artistName}</div>
              <button
                onClick={handlePlayPause}
                className="p-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg transition-shadow"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No track playing. Search and play a song to start!</p>
          )}
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* New Playlist Dialog */}
      <Dialog open={showNewPlaylist} onClose={() => setShowNewPlaylist(false)} title="Create Playlist">
        <div className="space-y-4">
          <input
            type="text"
            value={playlistTitle}
            onChange={e => setPlaylistTitle(e.target.value)}
            placeholder="Playlist name"
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowNewPlaylist(false)}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <Button onClick={handleCreatePlaylist} disabled={!playlistTitle.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
