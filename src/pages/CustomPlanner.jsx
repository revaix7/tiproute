import { useMemo, useState } from 'react'
import RouteMap from '../components/RouteMap'

// Leaflet gives longitudes past ±180 when you click a repeated copy of the world
function wrapLng(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180
}

function formatPoint({ lat, lng }) {
  const wrapped = wrapLng(lng)
  const latText = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`
  const lngText = `${Math.abs(wrapped).toFixed(4)}° ${wrapped >= 0 ? 'E' : 'W'}`
  return `${latText}, ${lngText}`
}

// "Plan your own trip": click a start and an end anywhere in the world.
// Estimating time and cost comes next (#24).
export default function CustomPlanner() {
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)

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
  const lines = useMemo(
    () => (start && end ? [[[start.lat, start.lng], [end.lat, end.lng]]] : []),
    [start, end]
  )

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
    </div>
  )
}
