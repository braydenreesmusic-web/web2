import { supabase } from '../lib/supabase'

// ============== User & Relationship ==============

export const getRelationshipData = async (userId) => {
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
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
  return data
}

export const deleteEvent = async (eventId) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
  
  if (error) throw error
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

export const createNote = async (noteData) => {
  const { data, error } = await supabase
    .from('notes')
    .insert([noteData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Real-time subscription for notes
export const subscribeToNotes = (userId, callback) => {
  return supabase
    .channel('notes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
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
  const { data, error } = await supabase
    .from('user_presence')
    .upsert({
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const getPresence = async () => {
  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
  
  if (error) throw error
  return data
}

export const subscribeToPresence = (callback) => {
  return supabase
    .channel('user_presence')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_presence'
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
