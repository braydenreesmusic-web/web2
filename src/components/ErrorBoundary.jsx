import React from 'react'
import { SourceMapConsumer } from 'source-map-js'

function parseStackFrames(stack) {
  if (!stack) return []
  const lines = String(stack).split('\n')
  const frames = []
  const re = /(https?:\/\/[\w\-.:@\/]+\/assets\/[\w\-\.]+\.js):(\d+):(\d+)/
  for (const l of lines) {
    const m = l.match(re)
    if (m) {
      frames.push({ raw: l, url: m[1], line: parseInt(m[2], 10), column: parseInt(m[3], 10) })
    } else {
      frames.push({ raw: l })
    }
  }
  return frames
}

async function fetchSourceMap(url) {
  try {
    const mapUrl = url + '.map'
    const res = await fetch(mapUrl, { credentials: 'omit' })
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    return null
  }
}

async function mapFrames(frames) {
  const mapped = []
  const cache = {}
  for (const f of frames) {
    if (!f.url) {
      mapped.push(f.raw)
      continue
    }
    if (!cache[f.url]) {
      const raw = await fetchSourceMap(f.url)
      cache[f.url] = raw
    }
    const rawMap = cache[f.url]
    if (!rawMap) {
      mapped.push(f.raw)
      continue
    }
    try {
      const smc = await SourceMapConsumer.with(rawMap, null, consumer => {
        const pos = consumer.originalPositionFor({ line: f.line, column: f.column })
        return pos
      })
      if (smc && smc.source) {
        mapped.push(`${smc.source}:${smc.line}:${smc.column} ${f.raw}`)
      } else {
        mapped.push(f.raw)
      }
    } catch (e) {
      mapped.push(f.raw)
    }
  }
  return mapped
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null, mapped: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  async componentDidCatch(error, info) {
    this.setState({ error, info })
    if (typeof console !== 'undefined') console.error('ErrorBoundary caught', error, info)

    try {
      const stack = (error && error.stack) || (info && info.componentStack) || ''
      const frames = parseStackFrames(stack)
      const mapped = await mapFrames(frames)
      this.setState({ mapped: mapped.join('\n') })
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('Source-map mapping failed', e)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-2xl p-6 shadow border">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-600 mb-4">An unexpected error occurred while rendering this page. This is most likely a browser compatibility issue — try updating iOS or opening the app in Safari on a Mac to inspect errors.</p>
          <details className="text-xs text-gray-500 mb-4 whitespace-pre-wrap">
            <summary className="cursor-pointer">Error details</summary>
            <div>
              {(this.state.error && this.state.error.toString()) || 'No error message'}
              {this.state.info && '\n' + (this.state.info.componentStack || '')}
            </div>
          </details>
          {this.state.mapped ? (
            <details className="text-xs text-gray-500 mb-4 whitespace-pre-wrap">
              <summary className="cursor-pointer">Mapped stack (sourcemap)</summary>
              <pre className="text-xs text-gray-700 max-h-72 overflow-auto p-2 bg-slate-50 rounded">{this.state.mapped}</pre>
            </details>
          ) : null}
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-slate-700 text-white">Reload</button>
            <a className="px-4 py-2 rounded border" href={`mailto:support@example.com?subject=App%20Error&body=${encodeURIComponent(String(this.state.error) + '\n\n' + String(this.state.info?.componentStack || ''))}`}>Report</a>
          </div>
        </div>
      </div>
    )
  }
}
