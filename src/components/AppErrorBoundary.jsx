import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Crown] render error', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crown-error-fallback" style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>Crown — kuch load nahi hua</h1>
          <p style={{ margin: '0 0 1rem', color: '#b91c1c' }}>{String(this.state.error?.message || this.state.error)}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid #ccc',
              cursor: 'pointer',
              background: '#fff',
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
