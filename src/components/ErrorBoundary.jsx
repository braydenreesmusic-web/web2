import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
    // You can also forward this to your monitoring service here
    if (typeof console !== 'undefined') console.error('ErrorBoundary caught', error, info)
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
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-slate-700 text-white">Reload</button>
            <a className="px-4 py-2 rounded border" href="mailto:support@example.com?subject=App%20Error&body=I%20saw%20an%20error%20in%20the%20app">Report</a>
          </div>
        </div>
      </div>
    )
  }
}
