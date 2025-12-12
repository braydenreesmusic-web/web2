import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function PartnerSessionBadge({ partnerListeningSession, partnerUserId, joined }) {
  const [partnerProfile, setPartnerProfile] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!partnerUserId) return
    ;(async () => {
      try {
        // Try to read a public `profiles` table for partner metadata (avatar etc.)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, avatar, full_name, display_name')
          .eq('id', partnerUserId)
          .maybeSingle()
        if (error) throw error
        if (!cancelled) setPartnerProfile(data || null)
      } catch (e) {
        console.debug('partner profile fetch failed', e)
      }
    })()
    return () => { cancelled = true }
  }, [partnerUserId])

  return (
    <div className="text-sm">
      {partnerListeningSession ? (
        <div className="flex items-center gap-2">
          {partnerProfile?.avatar ? (
            <img src={partnerProfile.avatar} alt="partner" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <Users className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
          )}
          <span className="text-xs" style={{color: 'var(--muted)'}}>Partner {joined ? '— following' : '— available'}</span>
        </div>
      ) : (
        <span className="text-xs" style={{color: 'var(--muted)'}}>Not listening with anyone</span>
      )}
    </div>
  )
}
