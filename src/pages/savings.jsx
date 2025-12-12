import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { PiggyBank, Plus, TrendingUp, DollarSign, Calendar, Trash2 } from 'lucide-react'
import Dialog from '../components/ui/dialog'
import Button from '../components/ui/button'
import { getSavingsGoals, createSavingsGoal, addContribution, deleteSavingsGoal } from '../services/api'

export default function SavingsGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [showContribution, setShowContribution] = useState(null)
  
  // New goal form
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [category, setCategory] = useState('vacation')
  const [deadline, setDeadline] = useState('')
  
  // Contribution form
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!user) return
    loadGoals()
  }, [user])

  const loadGoals = async () => {
    setLoading(true)
    try {
      const data = await getSavingsGoals(user.id)
      setGoals(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async () => {
    if (!title.trim() || !target) return
    try {
      const newGoal = await createSavingsGoal({
        user_id: user.id,
        title: title.trim(),
        target_amount: parseFloat(target),
        current_amount: 0,
        category,
        deadline: deadline || null
      })
      setGoals(prev => [newGoal, ...prev])
      setTitle('')
      setTarget('')
      setCategory('vacation')
      setDeadline('')
      setShowNewGoal(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddContribution = async () => {
    if (!amount || !showContribution) return
    try {
      await addContribution({
        goal_id: showContribution.id,
        user_id: user.id,
        amount: parseFloat(amount),
        note: note.trim() || null
      })
      
      // Update local state
      setGoals(prev => prev.map(g => 
        g.id === showContribution.id 
          ? { ...g, current_amount: (g.current_amount || 0) + parseFloat(amount) }
          : g
      ))
      
      setAmount('')
      setNote('')
      setShowContribution(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Delete this savings goal?')) return
    try {
      await deleteSavingsGoal(goalId)
      setGoals(prev => prev.filter(g => g.id !== goalId))
    } catch (e) {
      console.error(e)
    }
  }

  const categories = ['vacation', 'wedding', 'home', 'emergency', 'other']

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="w-6 h-6 text-slate-600" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-500 bg-clip-text text-transparent">
            Savings Goals
          </h2>
        </div>
        <Button onClick={() => setShowNewGoal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {loading && <div className="text-center text-gray-500 py-8">Loading goals...</div>}
      
      {!loading && !goals.length && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <PiggyBank className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <EmptyState title="No savings goals" description="Start a savings goal to begin tracking progress together." action={<button className="btn">Create Goal</button>} />
          <Button onClick={() => setShowNewGoal(true)}>Create Your First Goal</Button>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {goals.map((goal, idx) => {
          const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
          const daysUntil = goal.deadline 
            ? Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24))
            : null
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{goal.title}</h3>
                  <div className="text-xs text-gray-500 capitalize">{goal.category}</div>
                </div>
                <button 
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-slate-700">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{background: 'linear-gradient(90deg, var(--accent-700), var(--accent-600))'}}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-600" />
                    <span className="font-semibold">${goal.current_amount?.toFixed(2) || '0.00'}</span>
                    <span className="text-gray-400">/ ${goal.target_amount.toFixed(2)}</span>
                  </div>
                  {daysUntil !== null && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {daysUntil > 0 ? `${daysUntil} days left` : 'Deadline passed'}
                    </div>
                  )}
                </div>

                <Button onClick={() => setShowContribution(goal)} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Add Contribution
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* New Goal Dialog */}
      <Dialog open={showNewGoal} onClose={() => setShowNewGoal(false)} title="Create Savings Goal">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
            <Input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Summer Vacation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
            <Input
              type="number"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="5000"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input capitalize"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="capitalize">{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
            <Input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowNewGoal(false)}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <Button onClick={handleCreateGoal} disabled={!title.trim() || !target}>
              Create Goal
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Contribution Dialog */}
      <Dialog 
        open={!!showContribution} 
        onClose={() => setShowContribution(null)} 
        title={`Add to ${showContribution?.title}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="100.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <Input
              as="textarea"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Birthday money"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowContribution(null)}
              className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <Button onClick={handleAddContribution} disabled={!amount}>
              Add ${amount || '0'}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
