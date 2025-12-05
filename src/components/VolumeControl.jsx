import { Volume2 } from 'lucide-react'

export default function VolumeControl({ volume = 0.9, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Volume2 className="w-4 h-4" />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={onChange}
        aria-label="Volume"
        className="w-40"
      />
    </div>
  )
}
