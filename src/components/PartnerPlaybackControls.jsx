import React, { useEffect, useState } from 'react'
import { Play, Pause, Radio, UserPlus, UserMinus } from 'lucide-react'
import Button from './ui/button'
import { supabase } from '../lib/supabase'

export default function PartnerPlaybackControls({ partnerSession, partnerId, joined, onJoin, onLeave, onFollowPlay }) {
  const partnerTrack = partnerSession?.track
  const [partnerProfile, setPartnerProfile] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!partnerId) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, avatar, full_name, display_name')
          .eq('id', partnerId)
          .maybeSingle()
        if (error) throw error
        if (!cancelled) setPartnerProfile(data || null)
      } catch (e) {
        console.debug('fetch partner profile failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [partnerId])

  return (
    <div className="mt-4 bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {partnerProfile?.avatar ? (
            <img src={partnerProfile.avatar} alt="partner" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><UserPlus className="w-5 h-5 text-gray-500" /></div>
          )}
          <div>
            <div className="text-sm font-medium">Partner</div>
            <div className="text-xs text-gray-600">{partnerId ? partnerId : 'No partner linked'}</div>
          </div>
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
