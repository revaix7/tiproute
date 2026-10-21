import { useLocation, Link } from 'react-router-dom'
import { useMemo, useRef } from 'react'
import RouteMap from '../components/RouteMap'
import { tripMapPoints } from '../data/geo'
import { progressText } from '../data/tripCalculator'

export default function TripCard() {
  const location = useLocation()
  const trip = location.state?.trip
  const cardRef = useRef(null)

  // Same points as the results page: the whole route, plus where an unfinished trip stops
  const mapPoints = useMemo(() => tripMapPoints(trip), [trip])

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
  // A found trip leads with the average, like the results page, because that is what fits
  const days =
    trip.planningMode === 'find'
      ? `~${trip.avgDays}`
      : trip.minDays === trip.maxDays
        ? `${trip.minDays}`
        : `${trip.minDays}-${trip.maxDays}`
  // A "plan your own trip" card has no country
  const title = trip.country ?? 'Your Route'
  const unfinished = !trip.canComplete
  const tagline = !trip.country
    ? 'Your own start and end'
    : trip.planningMode === 'find'
      ? 'Found by the trip finder'
      : unfinished
        ? 'Part of the Tip-to-Tip'
        : 'Tip-to-Tip'
  const planAnotherPath = trip.country ? '/planner' : '/custom'

  const handleShare = async () => {
    const progress = unfinished ? `\nGets ${progressText(trip)} of the way to ${trip.endPoint}` : ''
    const text = `TIPROUTE Challenge\n${trip.country ?? 'My own route'}: ${trip.startPoint} \u2192 ${endPoint}${progress}\n${trip.transport.emoji} ${trip.transport.name} | ${days} days | $${trip.totalBudget.toLocaleString()}\nDifficulty: ${trip.difficulty.label} (${trip.difficulty.score}/5)\n\nPlan yours at tiproute.app`

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
          <h2 className="card-country">{title}</h2>
          <p className="card-tagline">{tagline}</p>
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

        {unfinished && <p className="card-progress">{progressText(trip)} of the route</p>}

        {/* Only the points, no route lines, and it cannot be dragged or zoomed */}
        {mapPoints.length > 0 && (
          <RouteMap points={mapPoints} interactive={false} fitPadding={12} className="card-map" />
        )}

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
        <Link to={planAnotherPath} className="secondary-button">Plan Another</Link>
      </div>
    </div>
  )
}
