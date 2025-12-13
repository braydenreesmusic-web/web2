import { supabase } from './supabase'

// Normalize avatar/storage paths into public URLs when possible.
// Returns the original string when it cannot be resolved.
export async function normalizeAvatarUrl(avatar) {
  if (!avatar) return null
  try {
    // Already a data URL or absolute URL
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar

    // strip any leading slash
    const path = avatar.startsWith('/') ? avatar.slice(1) : avatar

    // Try common bucket 'media' (used elsewhere in app). If avatars live
    // in a different bucket, this will just return the original string.
    try {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      if (data && data.publicUrl) return data.publicUrl
    } catch (e) {
      // ignore — fallthrough to return original
      console.debug('normalizeAvatarUrl: supabase getPublicUrl failed', e)
    }

    // Fallback: if value looks like a relative path, attempt to construct
    // a public URL using the Supabase storage public URL pattern. This is
    // a best-effort heuristic and may be environment-specific.
    const urlBase = import.meta.env.VITE_SUPABASE_URL
    if (urlBase && path) {
      const trimmed = urlBase.replace(/\/+$/, '')
      return `${trimmed}/storage/v1/object/public/media/${encodeURI(path)}`
    }
  } catch (err) {
    console.debug('normalizeAvatarUrl error', err)
  }
  return avatar
}
