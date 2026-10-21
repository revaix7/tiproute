import { useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import RouteMap from '../components/RouteMap'
import ComparisonTable from '../components/ComparisonTable'
import { DIFFICULTY_COLORS } from '../components/difficultyColors'
import { tripMapPoints } from '../data/geo'
import { routeProgress } from '../data/tripCalculator'
import { getRouteLines } from '../data/routes'
import { ROUTE_LINE_COUNT, ROUTE_LINE_STYLE } from '../components/routeLineStyle'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const trip = location.state?.trip
  const comparison = location.state?.comparison

  // Kept stable between renders so the map does not zoom back on every render.
  // Always the full route; an unfinished "I have time" trip also marks where it stops.
  const start = trip?.start
  const end = trip?.end
  const mapPoints = useMemo(() => tripMapPoints(trip), [trip])
  // Many ways to get there, passing near the whole route's checkpoints
  const routeCheckpoints = trip?.allCheckpoints ?? trip?.checkpoints
  const mapLines = useMemo(
    () =>
      start && end
        ? getRouteLines({
            from: start,
            to: end,
            via: (routeCheckpoints ?? []).slice(1, -1),
            count: ROUTE_LINE_COUNT,
          })
        : [],
    [start, end, routeCheckpoints]
  )

  if (!trip) {
    return (
      <div className="results empty-state">
        <h1>No trip planned yet</h1>
        <p>Head to the planner to create your adventure.</p>
        <Link to="/planner" className="cta-button">Go to Planner</Link>
      </div>
    )
  }

  // Only "I have time" trips have a fixed day count
  const isTimeMode = trip.planningMode === 'time'
  // "Find me a trip" picked this start and end; finder says whether it fits the limits
  const finder = trip.planningMode === 'find' ? trip.finder : null
  const title = finder
    ? `${trip.country}: ${finder.found ? 'Your Trip' : 'Closest Trip'}`
    : `${trip.country} Tip-to-Tip`
  // Every checkpoint on the route; the ones after the last one reached are greyed out
  const allCheckpoints = trip.allCheckpoints ?? trip.checkpoints
  const reachedCount = trip.checkpoints.length

  return (
    <div className="results">
      <div className="results-header">
        <h1>{title}</h1>
        <p className="results-route">
          {trip.startPoint} {'\u2192'} {trip.endPoint}
        </p>
      </div>

      <div className="results-grid">
        {/* Key Stats */}
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-value">{trip.distance.toLocaleString()} km</span>
            <span className="stat-label">Total Distance</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            {/* The finder checks the average against the user's days, so lead with it */}
            <span className="stat-value">
              {finder
                ? `About ${trip.avgDays} ${trip.avgDays === 1 ? 'day' : 'days'}`
                : trip.minDays === trip.maxDays
                  ? `${trip.minDays} days`
                  : `${trip.minDays}\u2013${trip.maxDays} days`}
            </span>
            <span className="stat-label">
              Estimated Time
              {finder && trip.minDays !== trip.maxDays && ` (${trip.minDays}\u2013${trip.maxDays})`}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-value">{trip.transport.name}</span>
            <span className="stat-label">Transport</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-value">${trip.totalBudget.toLocaleString()}</span>
            <span className="stat-label">Est. Total Budget</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-value">${trip.dailyCost}/day</span>
            <span className="stat-label">Daily Cost</span>
          </div>
        </div>

        <div className="stat-card difficulty-card">
          <div className="stat-info">
            <span
              className="stat-value"
              style={{ color: DIFFICULTY_COLORS[trip.difficulty.label] }}
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
            With {trip.avgDays} days by {trip.transport.name.toLowerCase()}, you'd cover ~
            {trip.reachableDistance.toLocaleString()} km and reach <strong>{trip.reachableCheckpoint.name}</strong>.
            That's {routeProgress(trip).percent}% of the full route.
          </p>
        </div>
      )}

      {trip.planningMode === 'time' && trip.canComplete && (
        <div className="completion-success">
          <p>
            You can complete the full tip-to-tip! With {trip.avgDays} days by{' '}
            {trip.transport.name.toLowerCase()}, you've got enough time to make it all the way.
          </p>
        </div>
      )}

      {/* Trip finder: does the trip fit, and if not, which limit is the problem */}
      {finder?.found && (
        <div className="completion-success">
          <p>
            Found it! This trip fits your {finder.days} {finder.days === 1 ? 'day' : 'days'}, $
            {finder.budget.toLocaleString()} and {finder.difficulty} at most.
          </p>
        </div>
      )}

      {finder && !finder.found && (
        <div className="completion-warning">
          <p>No trip in {trip.country} fits all your limits. This is the closest one:</p>
          <ul className="finder-problems">
            {finder.problems.map((p) => (
              <li key={p.limit}>{p.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Map */}
      {mapPoints.length > 0 && (
        <div className="map-section">
          <h2>Route Map</h2>
          <RouteMap points={mapPoints} lines={mapLines} lineStyle={ROUTE_LINE_STYLE} showLabels />
        </div>
      )}

      {/* Checkpoints */}
      <div className="checkpoints-section">
        <h2>Route Checkpoints</h2>
        <div className="checkpoint-list">
          {allCheckpoints.map((cp, i) => (
            <div key={cp.name} className={`checkpoint ${i < reachedCount ? '' : 'not-reached'}`}>
              <span className="checkpoint-marker">{String(i + 1).padStart(2, '0')}</span>
              <span className="checkpoint-name">{cp.name}</span>
              {!trip.canComplete && i === reachedCount - 1 && (
                <span className="checkpoint-tag">You reach here</span>
              )}
              {i >= reachedCount && <span className="checkpoint-tag">Not reached</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Transport Comparison */}
      {comparison && (
        <div className="comparison-section">
          <h2>Compare Your Options</h2>
          <p className="section-note">Same route and daily budget, every way to travel</p>
          <ComparisonTable
            options={comparison}
            selectedId={trip.transport.id}
            isTimeMode={isTimeMode}
          />
        </div>
      )}

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
