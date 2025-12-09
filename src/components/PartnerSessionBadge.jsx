import { Users } from 'lucide-react'

export default function PartnerSessionBadge({ partnerListeningSession, joined }) {
  return (
    <div className="text-sm">
      {partnerListeningSession ? (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
          <span className="text-xs" style={{color: 'var(--muted)'}}>Partner {joined ? '— following' : '— available'}</span>
        </div>
      ) : (
        <span className="text-xs" style={{color: 'var(--muted)'}}>Not listening with anyone</span>
      )}
    </div>
  )
}
