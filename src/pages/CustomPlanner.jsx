import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RouteMap from '../components/RouteMap'
import TransportPicker from '../components/TransportPicker'
import BudgetSlider from '../components/BudgetSlider'
import ComparisonTable from '../components/ComparisonTable'
import { DIFFICULTY_COLORS } from '../components/difficultyColors'
import { transportModes } from '../data/countries'
import { distanceBetween, roadDistanceBetween } from '../data/geo'
import { estimateTrip, compareEstimates } from '../data/tripCalculator'
import { getRouteLines } from '../data/routes'
import { ROUTE_LINE_COUNT, ROUTE_LINE_STYLE } from '../components/routeLineStyle'

// Closer than this, there is no trip to estimate
const MIN_DISTANCE_KM = 1
// Further than this, the trip probably crosses a sea, which the estimate does not know about
const LONG_TRIP_KM = 5000

// Leaflet gives longitudes past ±180 when you click a repeated copy of the world
function wrapLng(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

function formatPoint({ lat, lng }, decimals = 4) {
  const wrapped = wrapLng(lng)
  const latText = `${Math.abs(lat).toFixed(decimals)}° ${lat >= 0 ? 'N' : 'S'}`
  const lngText = `${Math.abs(wrapped).toFixed(decimals)}° ${wrapped >= 0 ? 'E' : 'W'}`
  return `${latText}, ${lngText}`
}

const STORAGE_KEY = 'tiproute.custom'

// Points and choices from the last visit in this tab, so coming back from the trip card
// doesn't lose the trip
function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

const isPoint = (p) => p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)

// "Plan your own trip": click a start and an end anywhere in the world, and the time
// and cost are worked out from the distance. Nothing to type in, everything updates live.
export default function CustomPlanner() {
  const navigate = useNavigate()
  const [saved] = useState(loadSaved)
  const [start, setStart] = useState(isPoint(saved.start) ? saved.start : null)
  const [end, setEnd] = useState(isPoint(saved.start) && isPoint(saved.end) ? saved.end : null)
  const [transportMode, setTransportMode] = useState(
    transportModes.find((t) => t.id === saved.transportId) ?? transportModes[0]
  )
  const [dailyBudget, setDailyBudget] = useState(
    Number.isInteger(saved.dailyBudget) && saved.dailyBudget >= 5 && saved.dailyBudget <= 150
      ? saved.dailyBudget
      : 30
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ start, end, transportId: transportMode.id, dailyBudget })
      )
    } catch {
      // Storage unavailable: the page still works, it just won't remember
    }
  }, [start, end, transportMode, dailyBudget])

  const tooClose = start && end && distanceBetween(start, end) < MIN_DISTANCE_KM
  const distanceKm = start && end && !tooClose ? Math.round(roadDistanceBetween(start, end)) : null
  const estimate = distanceKm ? estimateTrip({ distanceKm, transportMode, dailyBudget }) : null
  const comparison = distanceKm ? compareEstimates({ distanceKm, transportModes, dailyBudget }) : null

  // The first click sets the start, every later click sets or moves the end
  const handleMapClick = (point) => {
    if (!start) {
      setStart(point)
    } else {
      setEnd(point)
    }
  }

  const resetPoints = () => {
    setStart(null)
    setEnd(null)
  }

  const points = useMemo(
    () => [
      ...(start ? [{ ...start, label: 'Start' }] : []),
      ...(end ? [{ ...end, label: 'End' }] : []),
    ],
    [start, end]
  )
  // Many ways to get there once both points are set (generated lines, see #20)
  const lines = useMemo(
    () =>
      start && end && !tooClose
        ? getRouteLines({ from: start, to: end, count: ROUTE_LINE_COUNT })
        : [],
    [start, end, tooClose]
  )

  // The trip card reads the same fields as a pre-planned trip; there is no country
  const openTripCard = () => {
    const named = (point) => ({ ...point, name: formatPoint(point, 2) })
    const trip = {
      country: null,
      start: named(start),
      end: named(end),
      startPoint: formatPoint(start, 2),
      endPoint: formatPoint(end, 2),
      distance: distanceKm,
      ...estimate,
      budgetPerDay: dailyBudget,
      transport: transportMode,
      planningMode: 'custom',
      canComplete: true,
      reachableDistance: distanceKm,
    }
    navigate('/trip-card', { state: { trip } })
  }

  const instruction = !start
    ? 'Click the map to set your start'
    : !end
      ? 'Now click your end point'
      : 'Click the map again to move your end point'

  return (
    <div className="custom-planner">
      <div className="planner-header">
        <h1>Plan Your Own Trip</h1>
        <p>Pick any start and end in the world.</p>
      </div>

      <div className="map-section">
        <p className="map-instruction">{instruction}</p>
        {/* Keeps its view while you click, so the map does not jump to each new point */}
        <RouteMap
          points={points}
          lines={lines}
          lineStyle={ROUTE_LINE_STYLE}
          onMapClick={handleMapClick}
          showLabels
          fitToContent={false}
          className="route-map-large"
        />

        <div className="picked-points">
          <div className="picked-point">
            <span className="stat-label">Start</span>
            <span className="picked-coords">{start ? formatPoint(start) : 'Not set yet'}</span>
          </div>
          <div className="picked-point">
            <span className="stat-label">End</span>
            <span className="picked-coords">{end ? formatPoint(end) : 'Not set yet'}</span>
          </div>
          <button className="secondary-button" onClick={resetPoints} disabled={!start}>
            Reset points
          </button>
        </div>
      </div>

      {/* Estimate */}
      <div className="estimate-section">
        <h2>Your Estimate</h2>
        {!end && <p className="section-note">Set a start and an end on the map to see the estimate.</p>}
        {tooClose && (
          <p className="estimate-warning">
            Your start and end are less than {MIN_DISTANCE_KM} km apart. Move the end point to plan a trip.
          </p>
        )}
        {estimate && (
          <>
            <p className="section-note">
              These are estimates. The distance is the straight line times 1.3 for roads, and real
              trips vary.
            </p>
            {distanceKm > LONG_TRIP_KM && (
              <p className="estimate-warning">
                This is a very long trip. The estimate assumes you can travel overland the whole way
                and does not know about seas.
              </p>
            )}
            <div className="results-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-value">{distanceKm.toLocaleString()} km</span>
                  <span className="stat-label">Distance by road</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-value">
                    {estimate.minDays === estimate.maxDays
                      ? `${estimate.minDays} ${estimate.minDays === 1 ? 'day' : 'days'}`
                      : `${estimate.minDays}–${estimate.maxDays} days`}
                  </span>
                  <span className="stat-label">Estimated Time</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-value">{transportMode.name}</span>
                  <span className="stat-label">Transport</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-value">${estimate.totalBudget.toLocaleString()}</span>
                  <span className="stat-label">Est. Total Cost</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-value">${estimate.dailyCost}/day</span>
                  <span className="stat-label">Cost per Day</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <span
                    className="stat-value"
                    style={{ color: DIFFICULTY_COLORS[estimate.difficulty.label] }}
                  >
                    {estimate.difficulty.label} ({estimate.difficulty.score}/5)
                  </span>
                  <span className="stat-label">Difficulty</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="planner-section">
        <h2>Choose Your Ride</h2>
        <TransportPicker selected={transportMode} onSelect={setTransportMode} />
      </div>

      <div className="planner-section">
        <h2>Daily Budget (Living Costs)</h2>
        <p className="section-note">Food, accommodation, misc — not transport</p>
        <BudgetSlider value={dailyBudget} onChange={setDailyBudget} />
      </div>

      {comparison && (
        <div className="comparison-section">
          <h2>Compare Your Options</h2>
          <p className="section-note">Same start, end and daily budget, every way to travel</p>
          <ComparisonTable options={comparison} selectedId={transportMode.id} />
        </div>
      )}

      {estimate && (
        <div className="results-actions">
          <button className="cta-button" onClick={openTripCard}>
            Generate Trip Card
          </button>
        </div>
      )}
    </div>
  )
}
