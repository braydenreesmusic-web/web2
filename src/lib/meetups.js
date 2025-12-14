import { supabase } from './supabase'

/**
 * Supabase helpers for persisting a user's meetup and custom milestones.
 *
 * Expected table (example SQL in docs/MEETUPS_SCHEMA.md):
 *  - meetups (user_id text primary key, target_at timestamptz, milestones jsonb, updated_at timestamptz)
 */

export async function getMeetup(userId) {
  try {
    const { data, error } = await supabase
      .from('meetups')
      .select('user_id, target_at, milestones')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return data || null
  } catch (e) {
    console.error('getMeetup error', e)
    return null
  }
}

export async function upsertMeetup(userId, { target_at = null, milestones = null } = {}) {
  try {
    const payload = {
      user_id: userId,
      target_at: target_at || null,
      milestones: milestones || null
    }
    const { data, error } = await supabase
      .from('meetups')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle()
    if (error) throw error
    return data || null
  } catch (e) {
    console.error('upsertMeetup error', e)
    return null
  }
}

export default { getMeetup, upsertMeetup }
