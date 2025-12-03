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
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
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
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
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
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
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
  let query = supabase
    .from('media')
    .select('*')
    .eq('user_id', userId)
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
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
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
  const { data, error } = await supabase
    .from('pins')
    .select('*')
    .eq('user_id', userId)
  
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
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
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
  const { data, error } = await supabase
    .from('relationship_insights')
    .update({ read: true })
    .eq('id', insightId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
