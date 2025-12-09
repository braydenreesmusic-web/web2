// Minimal client helper to call our server SendGrid endpoint
export async function sendFallbackEmail(to, subject, text, html) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html })
    })
    const body = await res.text().catch(() => '')
    if (!res.ok) {
      console.warn('sendFallbackEmail failed', res.status, body)
      return { ok: false, status: res.status, body }
    }
    return { ok: true, status: res.status, body }
  } catch (err) {
    console.warn('sendFallbackEmail error', err)
    return { ok: false, status: 0, body: String(err) }
  }
}
