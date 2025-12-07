#!/usr/bin/env node
// ESM cleanup script for web-push subscriptions
// Tries sending a small ping to each subscription and removes ones that return
// permanent errors (410/404). Usage: set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// VAPID_PUBLIC, VAPID_PRIVATE and run:
//
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VAPID_PUBLIC=... VAPID_PRIVATE=... \
//   node scripts/cleanup-push-subscriptions.mjs [--dry-run]

const argv = process.argv.slice(2)
const args = { dryRun: argv.includes('--dry-run') }

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUBLIC = process.env.VAPID_PUBLIC
const VAPID_PRIVATE = process.env.VAPID_PRIVATE

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('Set VAPID_PUBLIC and VAPID_PRIVATE')
  process.exit(1)
}

const webpush = (await import('web-push')).default
webpush.setVapidDetails('mailto:admin@example.com', VAPID_PUBLIC, VAPID_PRIVATE)

async function fetchSubscriptions(){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  })
  if (!res.ok) throw new Error('Failed to fetch subscriptions: ' + res.status + ' ' + res.statusText)
  return res.json()
}

async function deleteSubscription(id){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=representation'
    }
  })
  if (!res.ok) throw new Error('Failed to delete subscription ' + id + ': ' + res.status)
  return res.json()
}

async function main(){
  console.log(args.dryRun ? 'Running in dry-run mode; no deletions will be performed' : 'Running cleanup; stale subscriptions will be deleted')
  const subs = await fetchSubscriptions()
  console.log('Found', subs.length, 'subscriptions')

  const payload = JSON.stringify({ title: 'Ping', body: 'Health check' })
  const toRemove = []

  for (let s of subs) {
    try {
      await webpush.sendNotification(s.subscription, payload)
      console.log('OK:', s.id)
    } catch (err) {
      // web-push error may include statusCode or a nested response
      const code = err && (err.statusCode || (err.status && err.status.code) || (err.response && err.response.status))
      if (code === 410 || code === 404) {
        console.log('Stale subscription (will remove):', s.id, 'code=', code)
        toRemove.push(s.id)
      } else {
        console.error('Transient/unknown error for', s.id, '-', err.message || err)
      }
    }
  }

  if (toRemove.length === 0) {
    console.log('No stale subscriptions detected')
    return
  }

  if (args.dryRun) {
    console.log('Dry-run: would remove', toRemove.length, 'subscriptions:', toRemove.join(', '))
    return
  }

  console.log('Removing', toRemove.length, 'stale subscriptions')
  for (let id of toRemove) {
    try {
      await deleteSubscription(id)
      console.log('Deleted', id)
    } catch (err) {
      console.error('Failed to delete', id, err.message || err)
    }
  }
}

main().catch(err=>{ console.error(err); process.exitCode = 1 })
