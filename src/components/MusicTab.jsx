import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, List, Music2, Users } from 'lucide-react'
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
} from '../services/api'
import { usePresence } from '../hooks/usePresence'
import { syncToLeader, stopSync } from '../lib/listeningSync'
import PartnerPlaybackControls from './PartnerPlaybackControls'
import PlaybackControls from './PlaybackControls'
import ProgressBar from './ProgressBar'
import VolumeControl from './VolumeControl'
import PartnerSessionBadge from './PartnerSessionBadge'
import TrackCard from './TrackCard'

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
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const [volume, setVolume] = useState(0.9)
  const { partnerListeningSession, partnerUserId, setMyListeningSession } = usePresence()
  const [joinedSession, setJoinedSession] = useState(false)

  useEffect(() => {
    if (!user) return
    loadLibrary()
    loadPlaylists()
    
    // We no longer subscribe here for partner updates; usePresence handles partner subscription
    return () => {}
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
      await setMyListeningSession({
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
      await setMyListeningSession({
        track_id: currentTrack?.id,
        is_playing: false,
        playback_position: audioRef.current.currentTime
      })
    } else {
      audioRef.current.play()
      await setMyListeningSession({
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
    const handleLoaded = () => setDuration(audioRef.current.duration || 0)
    
    audioRef.current.addEventListener('timeupdate', updateTime)
    audioRef.current.addEventListener('ended', handleEnded)
    audioRef.current.addEventListener('loadedmetadata', handleLoaded)
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', updateTime)
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('loadedmetadata', handleLoaded)
      }
    }
  }, [])

  // Sync follower behavior if user has joined partner's session
  useEffect(() => {
    if (!audioRef.current) return
    if (!joinedSession) {
      stopSync(audioRef.current)
      return
    }

    // If partner session exists and user joined, follow partner
    if (partnerListeningSession) {
      syncToLeader(audioRef.current, partnerListeningSession)
    }
    const interval = setInterval(() => {
      if (partnerListeningSession && joinedSession) {
        syncToLeader(audioRef.current, partnerListeningSession)
      }
    }, 1500)

    return () => {
      clearInterval(interval)
      stopSync(audioRef.current)
    }
  }, [partnerListeningSession, joinedSession])

  // Keyboard controls: space toggles play/pause, arrows seek, up/down adjust volume
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayPause()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (!audioRef.current) return
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
        setCurrentTime(audioRef.current.currentTime)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (!audioRef.current) return
        audioRef.current.currentTime = Math.min((duration || 0), audioRef.current.currentTime + 5)
        setCurrentTime(audioRef.current.currentTime)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const v = Math.min(1, (volume || 0) + 0.05)
        setVolume(v)
        if (audioRef.current) audioRef.current.volume = v
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const v = Math.max(0, (volume || 0) - 0.05)
        setVolume(v)
        if (audioRef.current) audioRef.current.volume = v
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlePlayPause, duration, volume])

  const skipBack = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10)
    setCurrentTime(audioRef.current.currentTime)
  }

  const skipForward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min((duration || 0), audioRef.current.currentTime + 10)
    setCurrentTime(audioRef.current.currentTime)
  }

  const formatTime = (t = 0) => {
    if (!t || !isFinite(t)) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = pct * (duration || 0)
    audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const handleVolumeChange = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  return (
    <div className="space-y-4">
      {/* View tabs */}
      <div className="glass-card p-2 grid grid-cols-4 gap-2">
        {['search', 'library', 'playlists', 'listening'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 rounded-xl capitalize transition-all ${view === v ? 'text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            style={ view === v ? { background: 'linear-gradient(90deg, var(--accent-700), var(--accent-600))' } : {} }
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
              className="flex-1 input"
            />
            <Button onClick={handleSearch} disabled={searching}>
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {searching && <div className="text-center text-gray-500">Searching...</div>}

          <div className="grid md:grid-cols-2 gap-3">
            {searchResults.map(track => (
              <TrackCard key={track.trackId} track={track} onPlay={handlePlayTrack} onAdd={handleAddToLibrary} />
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
            <TrackCard key={track.id} track={track} onPlay={handlePlayTrack} compact />
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
          <Users className="w-12 h-12 mx-auto" style={{color: 'var(--accent-600)'}} />
          <h3 className="font-semibold text-lg">Listen Together</h3>
          {currentTrack ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-4 md:col-span-1">
                {(currentTrack.artwork_url || currentTrack.artworkUrl100) && (
                  <motion.img
                    layout
                    src={currentTrack.artwork_url || currentTrack.artworkUrl100}
                    alt="album art"
                    className="w-36 h-36 rounded-lg shadow-2xl"
                    whileHover={{ scale: 1.02 }}
                  />
                )}
                <div className="hidden md:block">
                  <div className="font-semibold text-lg">{currentTrack.track_name || currentTrack.trackName}</div>
                  <div className="text-sm text-gray-400">{currentTrack.artist_name || currentTrack.artistName}</div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <PlaybackControls
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onSkipBack={skipBack}
                  onSkipForward={skipForward}
                />

                <div className="w-full">
                  <ProgressBar currentTime={currentTime} duration={duration} onSeek={handleSeek} />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <div>{formatTime(currentTime)}</div>
                    <div>{formatTime(duration)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <VolumeControl volume={volume} onChange={handleVolumeChange} />
                  <PartnerSessionBadge partnerListeningSession={partnerListeningSession} joined={joinedSession} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No track playing. Search and play a song to start!</p>
          )}

          {/* Partner controls: join/leave and see partner playback */}
          <PartnerPlaybackControls
            partnerSession={partnerListeningSession}
            partnerId={partnerUserId}
            joined={joinedSession}
            onJoin={() => setJoinedSession(true)}
            onLeave={() => setJoinedSession(false)}
            onFollowPlay={() => {
              // If partner is playing, attempt to load their track preview and play
              if (!partnerListeningSession || !partnerListeningSession.track) return
              const track = partnerListeningSession.track
              setCurrentTrack(track)
              if (audioRef.current) {
                audioRef.current.src = track.preview_url || track.previewUrl
                audioRef.current.currentTime = partnerListeningSession.playback_position || 0
                audioRef.current.play()
                setIsPlaying(true)
              }
            }}
          />
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
            className="w-full input"
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
