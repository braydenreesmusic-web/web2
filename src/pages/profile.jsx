import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, User, Heart, Calendar, Camera, FileText, Edit2, Check, Send, UserPlus, CheckCircle, XCircle, Mail } from 'lucide-react'
import { getNotes, getMedia, getEvents, getRelationshipData, updateRelationshipData, sendPartnerRequest, getPartnerRequests, acceptPartnerRequest, rejectPartnerRequest, subscribeToPartnerRequests } from '../services/api'

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ notes: 0, photos: 0, events: 0 })
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [partners, setPartners] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [linked, setLinked] = useState(false)
  const [relationshipRaw, setRelationshipRaw] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])

  useEffect(() => {
    if (!user) return
    
    const loadData = async () => {
      try {
        const [notes, photos, events, relationship, requests] = await Promise.all([
          getNotes(user.id),
          getMedia(user.id, 'photo'),
          getEvents(user.id),
          getRelationshipData(user.id),
          getPartnerRequests(user.email)
        ])
        setCounts({ notes: notes?.length || 0, photos: photos?.length || 0, events: events?.length || 0 })
        
        if (relationship) {
          setRelationshipRaw(relationship)
          setStartDate(relationship.start_date || '')
          // Prefer stored partner display names if present
          const a = relationship.partner_a || ''
          const b = relationship.partner_b || ''
          setPartners(a && b ? `${a} & ${b}` : (relationship.display_name || ''))
          if (relationship.partner_user_id) {
            setLinked(true)
          } else {
            setLinked(false)
          }
        } else {
          setRelationshipRaw(null)
          setLinked(false)
        }
        
        // Separate incoming and sent requests
        console.log('All requests:', requests)
        console.log('User email:', user.email)
        const pending = requests?.filter(r => r.to_email === user.email && r.status === 'pending') || []
        const sent = requests?.filter(r => r.from_email === user.email && r.status === 'pending') || []
        console.log('Pending requests (incoming):', pending)
        console.log('Sent requests (outgoing):', sent)
        setPendingRequests(pending)
        setSentRequests(sent)
      } catch (e) { 
        console.error('Error loading profile data:', e) 
      }
    }
    
    loadData()
    
    // Subscribe to real-time updates
    const subscription = subscribeToPartnerRequests(user.email, () => {
      loadData()
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const sendRequest = async () => {
    const email = partnerEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }
    if (email === user.email) {
      alert('You cannot send a request to yourself!')
      return
    }
    setSending(true)
    try {
      await sendPartnerRequest(
        user.id,
        user.email,
        user.user_metadata?.name || user.email.split('@')[0],
        email
      )
      alert('✅ Partner request sent!')
      setPartnerEmail('')
      // Refresh requests
      const requests = await getPartnerRequests(user.email)
      const sent = requests?.filter(r => r.from_email === user.email && r.status === 'pending') || []
      setSentRequests(sent)
    } catch (e) {
      console.error(e)
      alert('Failed to send request. They might need to register first!')
    } finally {
      setSending(false)
    }
  }

  const handleAccept = async (requestId) => {
    try {
      await acceptPartnerRequest(requestId)
      alert('✅ Partner linked! You can now see each other\'s online status.')
      // Refresh relationship data after accepting so UI reflects new link
      const rel = await getRelationshipData(user.id)
      if (rel) {
        setRelationshipRaw(rel)
        setStartDate(rel.start_date || '')
        const a = rel.partner_a || ''
        const b = rel.partner_b || ''
        setPartners(a && b ? `${a} & ${b}` : (rel.display_name || ''))
        setLinked(!!rel.partner_user_id)
      }
      setPendingRequests([])
    } catch (e) {
      console.error(e)
      alert('Failed to accept request')
    }
  }

  const handleReject = async (requestId) => {
    try {
      await rejectPartnerRequest(requestId)
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (e) {
      console.error(e)
    }
  }

  const refreshRequests = async () => {
    try {
      const requests = await getPartnerRequests(user.email)
      console.log('Refreshed requests:', requests)
      const pending = requests?.filter(r => r.to_email === user.email && r.status === 'pending') || []
      const sent = requests?.filter(r => r.from_email === user.email && r.status === 'pending') || []
      setPendingRequests(pending)
      setSentRequests(sent)
    } catch (e) {
      console.error('Error refreshing requests:', e)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const saveRelationship = async () => {
    // Split partners input into two names if possible
    const parts = partners.split(/&|,| and /i).map(p => p.trim()).filter(Boolean)
    const partner_a = parts[0] || ''
    const partner_b = parts[1] || ''

    try {
      await updateRelationshipData(user.id, {
        start_date: startDate || null,
        partner_a,
        partner_b
      })
      setEditing(false)
      alert('Relationship updated')
    } catch (e) {
      console.error('Failed to save relationship', e)
      alert('Failed to save relationship')
    }
  }

  return (
    <section className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-xl">{user?.user_metadata?.name || 'User'}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
          </div>
        </div>
        
        {/* Partner Linking Status */}
        {linked ? (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-900">Partner Linked!</span>
            </div>
            <p className="text-xs text-green-700 mt-2">
              You can now see each other's online status in the header 💚
            </p>
          </div>
        ) : (
          <>
            {/* Debug Info */}
            <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Debug Info</span>
                <button
                  onClick={refreshRequests}
                  className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs"
                >
                  Refresh
                </button>
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Your email: {user?.email}</div>
                <div>Pending requests: {pendingRequests.length}</div>
                <div>Sent requests: {sentRequests.length}</div>
                  <div>Linked: {linked ? 'Yes' : 'No'}</div>
                  {relationshipRaw && (
                    <div className="mt-2 text-xs text-gray-500">
                      <div className="font-semibold">Raw relationship (debug)</div>
                      <pre className="text-xs overflow-auto max-h-40 p-2 bg-white rounded mt-1 border text-gray-700">{JSON.stringify(relationshipRaw, null, 2)}</pre>
                    </div>
                  )}
              </div>
            </div>

            {/* Pending Requests (Incoming) - Always show section */}
            <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-pink-600" />
                <span className="text-sm font-semibold text-pink-900">Partner Requests</span>
              </div>
              {pendingRequests.length > 0 ? (
                <>
                  {pendingRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{req.from_name || req.from_email}</div>
                          <div className="text-xs text-gray-500">{req.from_email}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(req.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-xs flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-xs text-gray-500">No pending requests</div>
              )}
            </div>

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">Request Sent</span>
                </div>
                {sentRequests.map(req => (
                  <div key={req.id} className="text-xs text-blue-700">
                    Waiting for {req.to_email} to accept...
                  </div>
                ))}
              </div>
            )}

            {/* Send New Request */}
            {sentRequests.length === 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">Link Your Partner</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={e => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyPress={e => e.key === 'Enter' && sendRequest()}
                  />
                  <button
                    onClick={sendRequest}
                    disabled={sending || !partnerEmail.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition text-sm flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  Enter your partner's email address. They'll get a request to link accounts!
                </p>
              </div>
            )}
          </>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <div className="font-semibold">Relationship</div>
            </div>
            <button
              onClick={() => {
                if (editing) return saveRelationship()
                setEditing(true)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {editing ? <Check className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Partners</label>
                <input
                  type="text"
                  value={partners}
                  onChange={e => setPartners(e.target.value)}
                  placeholder="Partner A & Partner B"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 space-y-1">
              <div>Start: {startDate || 'Not set'}</div>
              <div>Partners: {partners || 'Not set'}</div>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="font-semibold mb-3">Stats</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-purple-500" />
              <span>Notes: {counts.notes}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4 text-pink-500" />
              <span>Photos: {counts.photos}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Events: {counts.events}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.button 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSignOut}
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 flex items-center justify-center gap-2 font-medium text-gray-700 transition-all"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </motion.button>
    </section>
  )
}
