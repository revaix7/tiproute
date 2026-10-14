import { Link } from 'react-router-dom'

// Placeholder until the "plan your own trip" page is built (#23)
export default function CustomTrip() {
  return (
    <div className="custom-trip empty-state">
      <h1>Coming soon</h1>
      <p>Planning your own trip on a map is on its way. For now, try a pre-planned trip.</p>
      <Link to="/planner" className="cta-button">Go to Planner</Link>
    </div>
  )
}
