import { Users } from 'lucide-react'

export default function PartnerSessionBadge({ partnerListeningSession, joined }) {
  return (
    <div className="text-sm text-gray-500">
      {partnerListeningSession ? (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-500" />
          <span className="text-xs">Partner {joined ? '— following' : '— available'}</span>
        </div>
      ) : (
        <span className="text-xs">Not listening with anyone</span>
      )}
    </div>
  )
}
