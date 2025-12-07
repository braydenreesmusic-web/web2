#!/usr/bin/env node
// Generate a VAPID keypair and print JSON to stdout
const webpush = (await import('web-push')).default
const keys = webpush.generateVAPIDKeys()
console.log(JSON.stringify(keys, null, 2))
