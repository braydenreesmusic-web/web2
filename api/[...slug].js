import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const path = require('path')
const fs = require('fs')

// A lightweight router that dispatches to handlers in server/api-handlers
export default async function (req, res) {
  try {
    const slug = req.url.replace(/^\//, '').split('?')[0]
    const parts = slug.split('/').filter(Boolean)
    const name = parts[0] || 'index'

    const handlersDir = path.resolve(process.cwd(), 'server', 'api-handlers')
    const targetFile = path.join(handlersDir, `${name}.js`)

    if (!fs.existsSync(targetFile)) {
      res.statusCode = 404
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }

    const handler = (await import(`../../server/api-handlers/${name}.js`)).default
    if (typeof handler !== 'function') {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Handler not a function' }))
      return
    }

    // adapt Node's req/res shape to the handler signature (req, res)
    await handler(req, res)
  } catch (err) {
    console.error('router error', err)
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: String(err) }))
  }
}
