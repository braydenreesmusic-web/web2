// Minimal client helper to call our server SendGrid endpoint
export async function sendFallbackEmail(to, subject, text, html) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html })
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      console.warn('sendFallbackEmail failed', res.status, txt)
      return false
    }
    return true
  } catch (err) {
    console.warn('sendFallbackEmail error', err)
    return false
  }
}
