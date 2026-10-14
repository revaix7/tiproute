import { useLocation, Link } from 'react-router-dom'
import { useRef } from 'react'

export default function TripCard() {
  const location = useLocation()
  const trip = location.state?.trip
  const cardRef = useRef(null)

  if (!trip) {
    return (
      <div className="trip-card-page empty-state">
        <h1>No trip to show</h1>
        <p>Plan a trip first to generate your card.</p>
        <Link to="/planner" className="cta-button">Go to Planner</Link>
      </div>
    )
  }

  const difficultyBars = () => {
    const bars = []
    for (let i = 1; i <= 5; i++) {
      bars.push(
        <span
          key={i}
          className={`diff-bar ${i <= Math.round(trip.difficulty.score) ? 'filled' : ''}`}
        />
      )
    }
    return bars
  }

  // An unfinished "I have time" trip ends at the last checkpoint reached
  const endPoint = trip.canComplete ? trip.endPoint : trip.reachableCheckpoint.name
  const distance = trip.canComplete ? trip.distance : trip.reachableDistance
  const days = trip.minDays === trip.maxDays ? `${trip.minDays}` : `${trip.minDays}-${trip.maxDays}`

  const handleShare = async () => {
    const text = `TIPROUTE Challenge\n${trip.country}: ${trip.startPoint} \u2192 ${endPoint}\n${trip.transport.emoji} ${trip.transport.name} | ${days} days | $${trip.totalBudget.toLocaleString()}\nDifficulty: ${trip.difficulty.label} (${trip.difficulty.score}/5)\n\nPlan yours at tiproute.app`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TipRoute Challenge', text })
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        alert('Trip card copied to clipboard!')
      } catch {
        alert("Couldn't copy the trip card. Your browser blocked clipboard access.")
      }
    }
  }

  return (
    <div className="trip-card-page">
      <h1>Your Trip Card</h1>
      <p className="trip-card-subtitle">Challenge accepted?</p>

      <div className="trip-card" ref={cardRef}>
        <div className="card-header">
          <span className="card-badge">CHALLENGE</span>
          <h2 className="card-country">{trip.country}</h2>
          <p className="card-tagline">Tip-to-Tip</p>
        </div>

        <div className="card-route">
          <div className="card-point start">
            <span className="point-label">From</span>
            <span>{trip.startPoint}</span>
          </div>
          <div className="card-arrow">{'\u2193'}</div>
          <div className="card-point end">
            <span className="point-label">To</span>
            <span>{endPoint}</span>
          </div>
        </div>

        <div className="card-stats">
          <div className="card-stat">
            <span className="card-stat-value">{distance.toLocaleString()} km</span>
            <span className="card-stat-label">Distance</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-value">{days}</span>
            <span className="card-stat-label">Days</span>
          </div>
          <div className="card-stat">
            <span className="card-stat-value">${trip.totalBudget.toLocaleString()}</span>
            <span className="card-stat-label">Budget</span>
          </div>
        </div>

        <div className="card-transport">
          <span className="transport-badge">
            {trip.transport.emoji} {trip.transport.name}
          </span>
        </div>

        <div className="card-difficulty">
          <span className="diff-label">Difficulty</span>
          <div className="diff-bars">{difficultyBars()}</div>
          <span className="diff-text">{trip.difficulty.label}</span>
        </div>

        <div className="card-footer">
          <span className="card-brand">TipRoute</span>
        </div>
      </div>

      <div className="trip-card-actions">
        <button className="cta-button" onClick={handleShare}>
          Share Trip Card
        </button>
        <Link to="/planner" className="secondary-button">Plan Another</Link>
      </div>
    </div>
  )
}
