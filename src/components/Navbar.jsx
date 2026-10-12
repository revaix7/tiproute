import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-text">TipRoute</span>
      </Link>
      <div className="navbar-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
        <Link to="/planner" className={location.pathname === '/planner' ? 'active' : ''}>Planner</Link>
      </div>
    </nav>
  )
}
