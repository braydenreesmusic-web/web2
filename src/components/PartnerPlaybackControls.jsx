import React from 'react'
import { Play, Pause, Radio, UserPlus, UserMinus } from 'lucide-react'
import Button from './ui/button'

export default function PartnerPlaybackControls({ partnerSession, partnerId, joined, onJoin, onLeave, onFollowPlay }) {
  const partnerTrack = partnerSession?.track

  return (
    <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Partner</div>
          <div className="text-xs text-gray-600">{partnerId ? partnerId : 'No partner linked'}</div>
        </div>
        <div className="flex items-center gap-2">
          {!joined ? (
            <Button onClick={onJoin}><UserPlus className="w-4 h-4 mr-2"/>Join</Button>
          ) : (
            <Button onClick={onLeave} className="bg-red-100 text-red-600"><UserMinus className="w-4 h-4 mr-2"/>Leave</Button>
          )}
        </div>
      </div>

      {partnerTrack && (
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">{partnerTrack.title || partnerTrack.track_name || 'Unknown'}</div>
            <div className="text-xs text-gray-600">{partnerTrack.artist || partnerTrack.artist_name || ''}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onFollowPlay} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
              <Radio className="w-4 h-4" />
            </button>
            <div className="text-xs text-gray-600">{partnerSession.is_playing ? 'Playing' : 'Paused'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
