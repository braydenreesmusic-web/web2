#!/usr/bin/env node
// ESM-compatible sender for web-push
// Usage: set env vars SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC, VAPID_PRIVATE

const argv = process.argv.slice(2)
function parseArgs(arr){
  const out = {}
  for (let i=0;i<arr.length;i++){
    if (arr[i].startsWith('--')){
      const key = arr[i].slice(2)
      const val = arr[i+1] && !arr[i+1].startsWith('--') ? arr[++i] : true
      out[key]=val
    }
  }
  return out
}

const args = parseArgs(argv)

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
  if (!res.ok) throw new Error('Failed to fetch subscriptions: ' + res.statusText)
  return res.json()
}

async function main(){
  const title = args.title || 'Notification'
  const body = args.body || 'You have a new message'
  const icon = args.icon

  const subs = await fetchSubscriptions()
  console.log('Found', subs.length, 'subscriptions')

  const payload = JSON.stringify({ title, body, icon })

  for (let s of subs) {
    try {
      await webpush.sendNotification(s.subscription, payload)
      console.log('Sent to', s.id)
    } catch (err) {
      console.error('Failed to send to', s.id, err.message || err)
    }
  }
}

main().catch(err=>{ console.error(err); process.exit(1) })
