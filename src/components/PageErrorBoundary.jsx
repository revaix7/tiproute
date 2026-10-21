import { Component } from 'react'
import { Link, useLocation } from 'react-router-dom'

class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error('[TipRoute] page crashed', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="page empty-state">
        <h1>Something went wrong</h1>
        <p>This page couldn't show your trip. Plan it again to get a fresh one.</p>
        <Link to="/start" className="cta-button">Plan a Trip</Link>
      </div>
    )
  }
}

// When a page crashes, show a message instead of a blank screen. The navbar stays,
// and going to another page tries again.
export default function PageErrorBoundary({ children }) {
  const location = useLocation()
  return <ErrorBoundary key={location.key}>{children}</ErrorBoundary>
}
