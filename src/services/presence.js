import { supabase } from '../lib/supabase'

// Upsert the presence row for the given user. Intended to be called by the
// authenticated client (so RLS allows upsert for auth.uid()).
export const setPresence = async (userId, { online = true, meta = {} } = {}) => {
  const payload = {
    user_id: userId,
    online,
    last_active: new Date().toISOString(),
    meta
  }

  const { data, error } = await supabase
    .from('presence')
    .upsert([payload], { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

export const clearPresence = async (userId) => {
  const { error } = await supabase
    .from('presence')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
  return true
}

export const subscribeToPresence = (handler) => {
  // Subscribe to all changes on the presence table. The handler receives an
  // event object like other realtime subscriptions.
  return supabase
    .channel('presence')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, handler)
    .subscribe()
}

// Heartbeat helper for clients: call periodically to keep presence fresh.
export const startPresenceHeartbeat = (userId, intervalMs = 30_000) => {
  const id = setInterval(() => {
    setPresence(userId, { online: true }).catch(() => {})
  }, intervalMs)
  return () => clearInterval(id)
}
