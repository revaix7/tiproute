import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page empty-state">
      <h1>Page not found</h1>
      <p>There is nothing at this address.</p>
      <Link to="/" className="cta-button">Go Home</Link>
    </div>
  )
}
