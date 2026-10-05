import { useLocation, useNavigate, Link } from 'react-router-dom'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const trip = location.state?.trip

  if (!trip) {
    return (
      <div className="results empty-state">
        <h1>No trip planned yet</h1>
        <p>Head to the planner to create your adventure.</p>
        <Link to="/planner" className="cta-button">Go to Planner</Link>
      </div>
    )
  }

  const difficultyColor = {
    Easy: '#4ade80',
    Moderate: '#facc15',
    Challenging: '#fb923c',
    Hard: '#f87171',
    Extreme: '#ef4444',
  }

  return (
    <div className="results">
      <div className="results-header">
        <h1>{trip.country} Tip-to-Tip</h1>
        <p className="results-route">
          {trip.startPoint} {'\u2192'} {trip.endPoint}
        </p>
      </div>

      <div className="results-grid">
        {/* Key Stats */}
        <div className="stat-card">
          <span className="stat-icon">{'\u{1F4CF}'}</span>
          <div className="stat-info">
            <span className="stat-value">{trip.distance.toLocaleString()} km</span>
            <span className="stat-label">Total Distance</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">{'\u{23F1}\uFE0F'}</span>
          <div className="stat-info">
            <span className="stat-value">
              {trip.minDays === trip.maxDays
                ? `${trip.minDays} days`
                : `${trip.minDays}\u2013${trip.maxDays} days`}
            </span>
            <span className="stat-label">Estimated Time</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">{trip.transport.emoji}</span>
          <div className="stat-info">
            <span className="stat-value">{trip.transport.name}</span>
            <span className="stat-label">Transport</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">{'\u{1F4B0}'}</span>
          <div className="stat-info">
            <span className="stat-value">${trip.totalBudget.toLocaleString()}</span>
            <span className="stat-label">Est. Total Budget</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">{'\u{1F4B5}'}</span>
          <div className="stat-info">
            <span className="stat-value">${trip.dailyCost}/day</span>
            <span className="stat-label">Daily Cost</span>
          </div>
        </div>

        <div className="stat-card difficulty-card">
          <span className="stat-icon">{'\u{26A0}\uFE0F'}</span>
          <div className="stat-info">
            <span
              className="stat-value"
              style={{ color: difficultyColor[trip.difficulty.label] }}
            >
              {trip.difficulty.label} ({trip.difficulty.score}/5)
            </span>
            <span className="stat-label">Difficulty</span>
          </div>
        </div>
      </div>

      {/* Completion Status (for "I have time" mode) */}
      {!trip.canComplete && (
        <div className="completion-warning">
          <p>
            {'\u{26A0}\uFE0F'} With {trip.avgDays} days by {trip.transport.name.toLowerCase()}, you'd cover ~
            {trip.reachableDistance.toLocaleString()} km and reach <strong>{trip.reachableCheckpoint}</strong>.
            That's {Math.round((trip.reachableDistance / trip.distance) * 100)}% of the full route.
          </p>
        </div>
      )}

      {trip.planningMode === 'time' && trip.canComplete && (
        <div className="completion-success">
          <p>
            {'\u2705'} You can complete the full tip-to-tip! With {trip.avgDays} days by{' '}
            {trip.transport.name.toLowerCase()}, you've got enough time to make it all the way.
          </p>
        </div>
      )}

      {/* Checkpoints */}
      <div className="checkpoints-section">
        <h2>Route Checkpoints</h2>
        <div className="checkpoint-list">
          {trip.checkpoints.map((cp, i) => (
            <div key={cp} className="checkpoint">
              <div className="checkpoint-marker">
                {i === 0 ? '\u{1F7E2}' : i === trip.checkpoints.length - 1 ? '\u{1F534}' : '\u{1F7E1}'}
              </div>
              <span className="checkpoint-name">{cp}</span>
              {i < trip.checkpoints.length - 1 && <div className="checkpoint-line" />}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="results-actions">
        <button className="cta-button" onClick={() => navigate('/trip-card', { state: { trip } })}>
          Generate Trip Card
        </button>
        <button className="secondary-button" onClick={() => navigate('/planner')}>
          Plan Another Trip
        </button>
      </div>
    </div>
  )
}
