#!/usr/bin/env node
// Send payload to a single subscription by id and print detailed errors
// Usage:
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... VAPID_PUBLIC=... VAPID_PRIVATE=... \
//   node scripts/send-to-subscription.mjs --id <subscription-id>

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
const id = args.id
if (!id) {
  console.error('Provide --id <subscription-id>')
  process.exit(1)
}

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

async function fetchSubscription(id){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}&select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  })
  if (!res.ok) throw new Error('Failed to fetch subscription: ' + res.status + ' ' + res.statusText)
  const data = await res.json()
  return data[0]
}

async function main(){
  console.log('Sending test payload to', id)
  const s = await fetchSubscription(id)
  if (!s) { console.error('No subscription found with id', id); process.exit(1) }
  const payload = JSON.stringify({ title: 'Direct test', body: 'Direct test payload' })
  try {
    await webpush.sendNotification(s.subscription, payload)
    console.log('Send succeeded for', id)
  } catch (err) {
    console.error('Send failed for', id)
    console.error('Error name:', err.name)
    console.error('Error message:', err.message)
    if (err.statusCode) console.error('statusCode:', err.statusCode)
    if (err.body) console.error('body:', err.body)
    // try to show any nested response
    if (err.response) {
      try {
        const text = await err.response.text()
        console.error('response text:', text)
      } catch (e) {}
    }
    process.exitCode = 2
  }
}

main().catch(err=>{ console.error(err); process.exitCode = 1 })
