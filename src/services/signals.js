import { supabase } from '../lib/supabase'

// Send a signal row (typing, reaction, etc.). Clients should call this via
// the authenticated Supabase client so RLS checks apply. For broadcast
// signals, omit target_user_id.
export const sendSignal = async ({ user_id, type, target_user_id = null, payload = {} }) => {
  const { data, error } = await supabase
    .from('signals')
    .insert([{ user_id, type, target_user_id, payload }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Subscribe to signals (the handler will be called on any insert/update/delete
// to `signals`). Handler receives a realtime event that includes new/old rows.
export const subscribeToSignals = (handler) => {
  return supabase
    .channel('signals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, handler)
    .subscribe()
}
