import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createCheckIn } from '../../services/api'
import { motion } from 'framer-motion'
import { Smile, Zap, Heart } from 'lucide-react'
import Dialog from '../../components/ui/dialog.jsx'
import Button from '../../components/ui/button.jsx'

const emotions = ['happy','excited','calm','stressed','tired','loved','lonely','energized']
const loveLangs = ['words','quality','gifts','acts','touch']

export default function DailyCheckIn({ open, onClose, onSubmit, initial }) {
  const [emotion, setEmotion] = useState(initial?.emotion || 'happy')
  const [energy, setEnergy] = useState(initial?.energy ?? 5)
  const [love, setLove] = useState(initial?.loveLanguage || 'words')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const submit = async () => {
    const checkInData = { 
      emotion, 
      energy: Number(energy), 
      loveLanguage: love, 
      date: new Date().toISOString().slice(0,10),
      user_id: user?.id
    }
    
    // Call parent callback for immediate UI update
    onSubmit?.(checkInData)
    
    // Save to backend if user is authenticated
    if (user) {
      setLoading(true)
      try {
        await createCheckIn(checkInData)
      } catch (error) {
        console.error('Failed to save check-in:', error)
      } finally {
        setLoading(false)
      }
    }
    
    onClose?.()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Daily Check-In">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <Smile className="w-4 h-4 text-purple-500" />
            <div className="text-sm font-medium text-gray-700">How are you feeling?</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {emotions.map(e => (
              <motion.button 
                key={e} 
                onClick={()=>setEmotion(e)} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-2 rounded-xl capitalize transition-all ${emotion===e?'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md':'bg-gray-100 hover:bg-gray-200'}`}
              >
                {e}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Energy Level</span>
            </div>
            <span className="text-lg font-bold text-purple-600">{energy}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={energy} 
            onChange={e=>setEnergy(e.target.value)} 
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-pink-500" />
            <div className="text-sm font-medium text-gray-700">Preferred Love Language Today</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {loveLangs.map(l => (
              <motion.button 
                key={l} 
                onClick={()=>setLove(l)} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-xl capitalize transition-all ${love===l?'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md':'bg-gray-100 hover:bg-gray-200'}`}
              >
                {l}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="flex justify-end pt-2">
          <Button onClick={submit} disabled={loading}>
            {loading ? 'Saving...' : 'Submit Check-In'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}