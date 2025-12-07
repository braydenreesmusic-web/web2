// send-push endpoint removed
export default function handler(req, res) {
  res.status(410).json({ error: 'Push subscriptions feature removed. Use alternative notification service.' })
}
