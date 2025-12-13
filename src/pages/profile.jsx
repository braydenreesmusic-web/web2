import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, User, Heart, Calendar, Camera, FileText, Edit2, Check, Send, UserPlus, CheckCircle, XCircle, Mail } from 'lucide-react'
import AvatarMaker from '../components/AvatarMaker'
import Dialog from '../components/ui/dialog'
import Input from '../components/ui/input'
import { getNotes, getMedia, getEvents, getRelationshipData, updateRelationshipData, sendPartnerRequest, getPartnerRequests, acceptPartnerRequest, rejectPartnerRequest, subscribeToPartnerRequests } from '../lib/lazyApi'
import NotificationsButton from '../components/NotificationsButton'
import { useToast } from '../contexts/ToastContext'
import NotificationPrompt from '../components/NotificationPrompt'
import { sendFallbackEmail } from '../services/notify'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const navigate = useNavigate()
  const avatarInitials = (() => {
    try {
      const name = user?.user_metadata?.name || (user?.email || '').split('@')[0] || ''
      const parts = name.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
      return name.slice(0, 2).toUpperCase()
    } catch (e) { return '' }
  })()
  const [counts, setCounts] = useState({ notes: 0, photos: 0, events: 0 })
  const [editing, setEditing] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [partners, setPartners] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [fallbackEmail, setFallbackEmail] = useState('')
  const [emailFallbackEnabled, setEmailFallbackEnabled] = useState(false)
  const [sending, setSending] = useState(false)
  const [linked, setLinked] = useState(false)
  const [relationshipRaw, setRelationshipRaw] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const { showToast } = useToast()

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
          setFallbackEmail(relationship.fallback_email || relationship.partner_email || '')
          setEmailFallbackEnabled(Boolean(relationship.email_fallback || relationship.enable_email_fallback))
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
      const accepted = await acceptPartnerRequest(requestId)
      alert('✅ Partner linked! You can now see each other\'s online status.')

      // Try to upsert our own relationships row as a fallback if server trigger didn't run.
      try {
        const fromUserId = accepted?.from_user_id
        const fromName = accepted?.from_name || ''
        const today = new Date().toISOString().slice(0, 10)
        await upsertRelationship(user.id, {
          partner_user_id: fromUserId,
          partner_a: user.user_metadata?.name || user.email.split('@')[0],
          partner_b: fromName,
          start_date: today
        })
      } catch (upsertErr) {
        console.warn('Could not upsert relationship locally:', upsertErr)
      }

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
      console.error('accept error', e)
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
        ,
        fallback_email: fallbackEmail || null,
        email_fallback: !!emailFallbackEnabled
      })
      setEditing(false)
      alert('Relationship updated')
    } catch (e) {
      console.error('Failed to save relationship', e)
      alert('Failed to save relationship')
    }
  }

  const sendTestEmail = async () => {
    const to = fallbackEmail?.trim()
    if (!to) return alert('Please enter a fallback email first')
    try {
      setSending(true)
      const subject = `Test: Notifications from your app`
      const text = `This is a test notification email. If you received this, fallback emails are working. Sent: ${new Date().toLocaleString()}`
      const res = await sendFallbackEmail(to, subject, text)
      if (res?.ok) {
        alert('Test email sent — check the inbox (or spam).')
      } else {
        // show detailed server response for debugging
        const details = res?.body || `status: ${res?.status || 'unknown'}`
        alert(`Failed to send test email — server response: ${details}`)
        console.error('send test email failed', res)
      }
    } catch (e) {
      console.error('test email error', e)
      alert('An error occurred while sending the test email')
    } finally {
      setSending(false)
    }
  }

  const sendTestPush = async () => {
    if (!user) return
    try {
      showToast && showToast('Sending test push…', { type: 'info' })
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Push', body: 'This is a test push from the server', user_id: user.id })
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('send-push failed', res.status, txt)
        showToast && showToast('Server push failed — check server envs (VAPID/Supabase keys)', { type: 'error' })
        return
      }
      const j = await res.json().catch(() => null)
      console.debug('send-push result', j)
      showToast && showToast('Test push sent (server attempted delivery)', { type: 'success' })
    } catch (e) {
      console.error('sendTestPush error', e)
      showToast && showToast('Failed to send test push — see console', { type: 'error' })
    }
  }

  return (
    <section className="space-y-6">
      <NotificationPrompt />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--accent-600), var(--accent-700))'}}>
              {/* Avatar preview: prefer uploaded/data URL, emoji, initials, or fallback icon */}
              {user?.user_metadata?.avatar ? (
                user.user_metadata.avatar.startsWith('data:') || user.user_metadata.avatar.startsWith('http') ? (
                  <img src={user.user_metadata.avatar} alt="avatar" className="w-16 h-16 object-cover" />
                ) : user.user_metadata.avatar.startsWith('color:') ? (
                  <div style={{background: user.user_metadata.avatar.replace('color:','')}} className="w-16 h-16 flex items-center justify-center text-white text-lg font-semibold">{avatarInitials}</div>
                ) : (
                  <span className="text-white text-lg font-semibold">{avatarInitials}</span>
                )
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <button title="Edit avatar" onClick={()=>setShowAvatarEditor(v=>!v)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" /> Edit Avatar
              </button>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-xl">{user?.user_metadata?.name || 'User'}</div>
              <div className="text-sm text-gray-500 flex items-center justify-between">
                <span>{user?.email}</span>
                <div className="flex items-center gap-2">
                  <NotificationsButton />
                  <button
                    onClick={sendTestPush}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs"
                  >
                    Send Test Push
                  </button>
                </div>
              </div>
                <div className="mt-3">
                  <SubscriptionDebug />
                </div>
          </div>
        </div>
        <Dialog open={showAvatarEditor} onClose={()=>setShowAvatarEditor(false)} title="Edit Avatar">
          <AvatarMaker initialAvatar={user?.user_metadata?.avatar || ''} onSaved={(payload)=>{ setShowAvatarEditor(false); showToast && showToast('Avatar updated') }} />
        </Dialog>
        
        {/* Partner Linking Status */}
        {linked ? (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">Partner Linked!</span>
            </div>
            <p className="text-xs text-slate-700 mt-2">
              You can now see each other's online status in the header
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
            <div className="mt-4 p-4 rounded-xl border" style={{background: 'linear-gradient(90deg, var(--accent-50), rgba(255,255,255,0.8))', borderColor: 'var(--border)'}}>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5" style={{color: 'var(--accent-600)'}} />
                <span className="text-sm font-semibold" style={{color: 'var(--text)'}}>Partner Requests</span>
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
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs flex items-center gap-1"
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
                <div className="text-xs" style={{color: 'var(--muted)'}}>No pending requests</div>
              )}
            </div>

            {/* Sent Requests */}
            {sentRequests.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border" style={{background: 'linear-gradient(90deg, rgba(240,249,255,1), rgba(250,255,255,1))', borderColor: 'var(--border)'}}>
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4" style={{color: 'var(--accent-700)'}} />
                    <span className="text-sm font-semibold" style={{color: 'var(--text)'}}>Request Sent</span>
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
              <div className="mt-4 p-4 rounded-xl border" style={{background: 'linear-gradient(90deg, var(--accent-50), rgba(255,255,255,0.9))', borderColor: 'var(--border)'}}>
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-5 h-5" style={{color: 'var(--accent-600)'}} />
                  <span className="text-sm font-semibold" style={{color: 'var(--text)'}}>Link Your Partner</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={partnerEmail}
                    onChange={e => setPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    onKeyPress={e => e.key === 'Enter' && sendRequest()}
                  />
                  <button
                    onClick={sendRequest}
                    disabled={sending || !partnerEmail.trim()}
                    className="btn"
                  >
                    <Mail className="w-4 h-4" />
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{color: 'var(--muted)'}}>
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
              <Heart className="w-5 h-5" style={{color: 'var(--accent-600)'}} />
              <div className="font-semibold">Relationship</div>
            </div>
            <button
              onClick={() => {
                if (editing) return saveRelationship()
                setEditing(true)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {editing ? <Check className="w-4 h-4 text-slate-600" /> : <Edit2 className="w-4 h-4 text-gray-400" />}
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
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Partners</label>
                <input
                  type="text"
                  value={partners}
                  onChange={e => setPartners(e.target.value)}
                  placeholder="Partner A & Partner B"
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Email Fallback</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={fallbackEmail}
                    onChange={e => setFallbackEmail(e.target.value)}
                    placeholder="partner-fallback@example.com"
                    className="input text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={emailFallbackEnabled} onChange={e => setEmailFallbackEnabled(e.target.checked)} />
                    <span>Enable</span>
                  </label>
                  <button
                    onClick={sendTestEmail}
                    disabled={!fallbackEmail || sending}
                    className="px-3 py-1 rounded bg-indigo-600 text-white text-xs ml-2"
                  >
                    {sending ? 'Sending…' : 'Send test'}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">If enabled, your partner will receive an email when push fails.</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 space-y-1">
              <div>Start: {startDate || 'Not set'}</div>
              <div>Partners: {partners || 'Not set'}</div>
              {relationshipRaw && (
                <div className="text-xs text-gray-500">Email fallback: {relationshipRaw.fallback_email ? `${relationshipRaw.fallback_email} (${relationshipRaw.email_fallback ? 'enabled' : 'disabled'})` : 'Not configured'}</div>
              )}
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
              <FileText className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
              <span>Notes: {counts.notes}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Camera className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
              <span>Photos: {counts.photos}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" style={{color: 'var(--accent-600)'}} />
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

function SubscriptionDebug(){
  const [subs, setSubs] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        const { data, error } = await supabase.from('push_subscriptions').select('*')
        if (error) throw error
        if (mounted) setSubs(data)
      }catch(e){
        console.error('Failed to load subscriptions', e)
        if (mounted) setSubs([])
      }finally{
        if (mounted) setLoading(false)
      }
    }
    load()
    return ()=>{ mounted=false }
  },[])

  if (loading) return <div className="text-xs text-gray-500">Loading subscriptions…</div>
  return (
    <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
      <div className="font-medium">Push Subscriptions</div>
      {(!subs || subs.length===0) && <div className="text-sm text-gray-500">No subscriptions for this user</div>}
      {subs && subs.map(s=> (
        <div key={s.id} className="mt-2">
          <div><strong>ID:</strong> {s.id}</div>
          <div className="truncate"><strong>Endpoint:</strong> {s.subscription?.endpoint}</div>
          <div><strong>Created:</strong> {new Date(s.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  )
}
