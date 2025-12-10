import { supabase } from '../lib/supabase'
import { sendFallbackEmail } from './notify'

// Helper: trigger a server-side push broadcast via our send-push endpoint.
// Keep payload small; server will broadcast to all stored subscriptions.
async function triggerNotification({ title, body, user_id = null } = {}) {
  try {
    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, user_id })
    })
  } catch (err) {
    console.warn('triggerNotification failed', err)
  }
}

// ============== User & Relationship ==============

export const getRelationshipData = async (userId) => {
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // If no row exists, maybeSingle returns { data: null, error: null }
  if (error) {
    // Log and rethrow unexpected errors
    console.error('getRelationshipData error', { userId, status: error?.status, message: error?.message, details: error?.details })
    throw error
  }

  return data || null
}

// Upsert relationship row for a given user_id. Used as a client-side fallback when server trigger
// didn't create the relationship row. Note: RLS may block upserting other users' rows.
export const upsertRelationship = async (userId, relationshipData) => {
  const payload = {
    user_id: userId,
    ...relationshipData
  }

  const { data, error } = await supabase
    .from('relationships')
    .upsert([payload], { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    console.error('upsertRelationship error', { userId, err: error })
    throw error
  }

  return data
}

// Helper to get both user IDs (you + partner)
export const getPartnerIds = async (userId) => {
  try {
    const relationship = await getRelationshipData(userId)
    if (relationship?.partner_user_id) {
      return [userId, relationship.partner_user_id]
    }
    return [userId]
  } catch (e) {
    return [userId]
  }
}

export const updateRelationshipData = async (userId, updates) => {
  const { data, error } = await supabase
    .from('relationships')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============== Check-ins ==============

export const getCheckIns = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export const createCheckIn = async (checkInData) => {
  const { data, error } = await supabase
    .from('check_ins')
    .insert([checkInData])
    .select()
    .single()
  
  if (error) throw error
  // Notify about new check-in
  triggerNotification({ title: 'New check-in', body: `${checkInData.user_name || 'Someone'} added a check-in` })
  return data
}

// Real-time subscription for check-ins
export const subscribeToCheckIns = (userId, callback) => {
  return supabase
    .channel('check_ins')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'check_ins',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// ============== Events ==============

export const getEvents = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })
  
  if (error) throw error
  return data
}

export const createEvent = async (eventData) => {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New event', body: `${eventData.title || 'Event'} created` })
  // Attempt email fallback for partner if configured
  (async () => {
    try {
      const rel = await getRelationshipData(eventData.user_id)
      const to = rel?.fallback_email || rel?.partner_email
      const enabled = rel?.email_fallback || rel?.enable_email_fallback
      if (to && enabled) {
        const subject = `New event: ${eventData.title || 'Event'}`
        const text = `${eventData.title || 'Event'} scheduled for ${new Date(eventData.date).toLocaleString()}\n\n${eventData.note || ''}`
        await sendFallbackEmail(to, subject, text)
      }
    } catch (e) {
      console.warn('email fallback check failed', e)
    }
  })()
  return data
}

export const updateEvent = async (eventId, updates) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'Event updated', body: `Event updated: ${updates.title || ''}` })
  return data
}

export const deleteEvent = async (eventId) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
  
  if (error) throw error
  triggerNotification({ title: 'Event deleted', body: 'An event was removed' })
}

// ============== Tasks ==============

export const getTasks = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createTask = async (taskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New task', body: `${taskData.title || 'Task'} added` })
  return data
}

export const updateTask = async (taskId, updates) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============== Media (Photos, Videos) ==============

export const getMedia = async (userId, type = null) => {
  // RLS policies automatically filter to show user + partner data
  let query = supabase
    .from('media')
    .select('*')
    .order('date', { ascending: false })
  
  if (type) {
    query = query.eq('type', type)
  }
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}

export const uploadMedia = async (file, metadata) => {
  // Upload file to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `${metadata.user_id}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath)

  // Save metadata to database
  const { data, error } = await supabase
    .from('media')
    .insert([{ ...metadata, url: publicUrl }])
    .select()
    .single()

  if (error) throw error
  triggerNotification({ title: 'New photo', body: `${metadata.user_name || 'Someone'} added a photo` })
  return data
}

export const toggleMediaFavorite = async (mediaId, favorite) => {
  const { data, error } = await supabase
    .from('media')
    .update({ favorite })
    .eq('id', mediaId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============== Notes ==============

export const getNotes = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

// Get game-related notes (TICTACTOE_*) so UI can surface persistent game notifications
export const getGameNotes = async (userId) => {
  // notes table stores game events; filter by content prefix
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .ilike('content', 'TICTACTOE_%')
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export const createNote = async (noteData) => {
  const { data, error } = await supabase
    .from('notes')
    .insert([noteData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New note', body: `${noteData.title || 'A note'} was created` })
  return data
}

// Real-time subscription for notes
export const subscribeToNotes = (userId, callback) => {
  const ch = supabase.channel('notes')
  // If userId provided, we still subscribe to whole table and let the client filter
  // to avoid missing partner rows that may be returned via RLS in queries but not emitted
  // for the filtered realtime channel. Subscribing to the whole table is acceptable
  // for small apps; if needed we can add server-side routing later.
  ch.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notes'
    },
    callback
  )

  return ch.subscribe()
}

// ============== Location & Pins ==============

export const getPins = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('pins')
    .select('*')
  
  if (error) throw error
  return data
}

export const createPin = async (pinData) => {
  const { data, error } = await supabase
    .from('pins')
    .insert([pinData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New pin', body: 'A new location pin was added' })
  return data
}

export const updateLocationShare = async (userId, lat, lng, active) => {
  const { data, error } = await supabase
    .from('location_shares')
    .upsert({ 
      user_id: userId, 
      lat, 
      lng, 
      active, 
      updated: new Date().toISOString() 
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getLocationShares = async (userId) => {
  const { data, error } = await supabase
    .from('location_shares')
    .select('*')
    .eq('user_id', userId)
  
  if (error) throw error
  return data
}

// ============== Bookmarks ==============

export const getBookmarks = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createBookmark = async (bookmarkData) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert([bookmarkData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New bookmark', body: `${bookmarkData.title || 'A bookmark'} added` })
  return data
}

export const updateBookmark = async (bookmarkId, updates) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .update(updates)
    .eq('id', bookmarkId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteBookmark = async (bookmarkId) => {
  // Return the deleted row so callers can verify the operation.
  const { data, error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .select()
    .maybeSingle()

  if (error) throw error
  triggerNotification({ title: 'Bookmark deleted', body: 'A bookmark was removed' })
  return data || null
}

/**
 * Bulk update bookmark orders.
 * Accepts an array of objects: [{ id: 'uuid', order: 0 }, ...]
 * Uses upsert on `id` so it's best-effort (RLS still applies).
 */
export const bulkUpdateBookmarkOrder = async (orders = []) => {
  if (!Array.isArray(orders) || orders.length === 0) return []

  // Normalize payload to only include id and order
  const payload = orders.map(o => ({ id: o.id, order: o.order }))

  const { data, error } = await supabase
    .from('bookmarks')
    .upsert(payload, { onConflict: 'id' })
    .select()

  if (error) {
    console.error('bulkUpdateBookmarkOrder error', { error })
    throw error
  }

  return data
}

// ============== Insights ==============

export const getInsights = async (userId) => {
  const { data, error } = await supabase
    .from('relationship_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const markInsightAsRead = async (insightId) => {
  const { data, error} = await supabase
    .from('relationship_insights')
    .update({ read: true })
    .eq('id', insightId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============== Savings Goals ==============

export const getSavingsGoals = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createSavingsGoal = async (goalData) => {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert([goalData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New savings goal', body: `${goalData.title || 'Savings goal'} created` })
  return data
}

export const updateSavingsGoal = async (goalId, updates) => {
  const { data, error } = await supabase
    .from('savings_goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteSavingsGoal = async (goalId) => {
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', goalId)
  
  if (error) throw error
}

export const addContribution = async (contributionData) => {
  const { data, error } = await supabase
    .from('savings_contributions')
    .insert([contributionData])
    .select()
    .single()
  
  if (error) throw error
  
  // Update goal current_amount
  const { data: goal } = await supabase
    .from('savings_goals')
    .select('current_amount')
    .eq('id', contributionData.goal_id)
    .single()
  
  if (goal) {
    await supabase
      .from('savings_goals')
      .update({ current_amount: (goal.current_amount || 0) + contributionData.amount })
      .eq('id', contributionData.goal_id)
  }
  triggerNotification({ title: 'New contribution', body: `A contribution of ${contributionData.amount} was added` })
  return data
}

export const getContributions = async (goalId) => {
  const { data, error } = await supabase
    .from('savings_contributions')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// ============== Music & Playlists ==============

export const searchItunesMusic = async (query) => {
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`
    )
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('iTunes search failed:', error)
    return []
  }
}

export const saveMusicTrack = async (trackData) => {
  const { data, error } = await supabase
    .from('music_tracks')
    .insert([trackData])
    .select()
    .single()
  
  if (error) throw error
  triggerNotification({ title: 'New track saved', body: `${trackData.title || 'Track'} saved` })
  return data
}

export const getMusicTracks = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('music_tracks')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const deleteMusicTrack = async (trackId) => {
  const { error } = await supabase
    .from('music_tracks')
    .delete()
    .eq('id', trackId)
  
  if (error) throw error
}

export const getPlaylists = async (userId) => {
  // RLS policies automatically filter to show user + partner data
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const createPlaylist = async (playlistData) => {
  const { data, error } = await supabase
    .from('playlists')
    .insert([playlistData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updatePlaylist = async (playlistId, updates) => {
  const { data, error } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', playlistId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deletePlaylist = async (playlistId) => {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
  
  if (error) throw error
}

export const getPlaylistTracks = async (playlistId) => {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select(`
      *,
      track:music_tracks(*)
    `)
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
  
  if (error) throw error
  return data
}

export const addTrackToPlaylist = async (playlistId, trackId, position, userId) => {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .insert([{
      playlist_id: playlistId,
      track_id: trackId,
      position,
      added_by: userId
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const removeTrackFromPlaylist = async (playlistTrackId) => {
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('id', playlistTrackId)
  
  if (error) throw error
}

// ============== Listening Sessions ==============

export const getListeningSession = async (userId) => {
  const { data, error } = await supabase
    .from('listening_sessions')
    .select(`
      *,
      track:music_tracks(*)
    `)
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export const updateListeningSession = async (userId, sessionData) => {
  const { data, error } = await supabase
    .from('listening_sessions')
    .upsert({
      user_id: userId,
      ...sessionData,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const subscribeToListeningSession = (userId, callback) => {
  return supabase
    .channel('listening_session')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'listening_sessions',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// ============== User Presence ==============

export const updatePresence = async (userId, isOnline) => {
  // When marking online, avoid touching last_seen so it remains the last-offline timestamp.
  const now = new Date().toISOString()
  const payload = {
    user_id: userId,
    is_online: isOnline,
    last_seen: isOnline ? null : now,
    updated_at: now
  }

  // Use atomic upsert to avoid duplicate key races
  const { data, error } = await supabase
    .from('user_presence')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .maybeSingle()

  // If a race still triggers a conflict, fall back to targeted update
  if (error) {
    const msg = error?.message || ''
    const isConflict = error?.code === '23505' || /duplicate key|conflict/i.test(msg)
    if (isConflict) {
      const updatePayload = isOnline
        ? { is_online: isOnline, updated_at: payload.updated_at }
        : { is_online: isOnline, last_seen: payload.last_seen, updated_at: payload.updated_at }
      const { data: upd, error: updErr } = await supabase
        .from('user_presence')
        .update(updatePayload)
        .eq('user_id', userId)
        .select()
        .maybeSingle()
      if (updErr) throw updErr
      return upd
    }
    throw error
  }
  return data
}

export const getPresence = async () => {
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
  
  if (error) throw error
  return data
}

export const subscribeToPresence = (userId, callback) => {
  if (!userId) {
    return {
      unsubscribe: () => {}
    }
  }

  return supabase
    .channel(`user_presence_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

// ============== Partner Requests ==============

export const sendPartnerRequest = async (fromUserId, fromEmail, fromName, toEmail) => {
  const { data, error } = await supabase
    .from('partner_requests')
    .insert([{
      from_user_id: fromUserId,
      from_email: fromEmail,
      from_name: fromName,
      to_email: toEmail,
      status: 'pending'
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getPartnerRequests = async (userEmail) => {
  const { data, error } = await supabase
    .from('partner_requests')
    .select('*')
    .or(`to_email.eq.${userEmail},from_email.eq.${userEmail}`)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export const acceptPartnerRequest = async (requestId) => {
  const { data, error } = await supabase
    .from('partner_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const rejectPartnerRequest = async (requestId) => {
  const { data, error } = await supabase
    .from('partner_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const subscribeToPartnerRequests = (userEmail, callback) => {
  return supabase
    .channel('partner_requests')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'partner_requests',
        filter: `to_email=eq.${userEmail}`
      },
      callback
    )
    .subscribe()
}
