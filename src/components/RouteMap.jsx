import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'

const WORLD_CENTER = [20, 0]
const FIT_OPTIONS = { padding: [30, 30] }

function contentCoords(points, lines) {
  return [...points.map((p) => [p.lat, p.lng]), ...lines.flat()]
}

// Zooms the map so every point and line is in view when they change
function FitToContent({ points, lines }) {
  const map = useMap()

  useEffect(() => {
    const coords = contentCoords(points, lines)
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 8)
    } else {
      map.fitBounds(coords, FIT_OPTIONS)
    }
  }, [map, points, lines])

  return null
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

// One map for every page: points are { lat, lng, label }, lines are lists of [lat, lng].
// With interactive false the map cannot be dragged or zoomed (for the trip card).
// With showLabels the point labels are always visible instead of only on hover.
export default function RouteMap({
  points = [],
  lines = [],
  onMapClick,
  interactive = true,
  showLabels = false,
  className = '',
}) {
  // Open on the content so the map does not start on the whole world and then zoom in
  const coords = contentCoords(points, lines)
  const initialView =
    coords.length > 1
      ? { bounds: coords, boundsOptions: FIT_OPTIONS }
      : { center: coords[0] ?? WORLD_CENTER, zoom: coords.length === 1 ? 8 : 2 }

  return (
    <MapContainer
      // Leaflet reads these options only once, so remount when interactive changes
      key={interactive ? 'interactive' : 'static'}
      className={`route-map ${className}`}
      {...initialView}
      dragging={interactive}
      // The mouse wheel scrolls the page, not the map, so the map never traps the scroll.
      // Use the buttons, a double click or a pinch to zoom.
      scrollWheelZoom={false}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      zoomControl={interactive}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {lines.map((line, i) => (
        <Polyline key={i} positions={line} pathOptions={{ color: '#000', weight: 2, opacity: 0.8 }} />
      ))}
      {points.map((p, i) => (
        <CircleMarker
          key={`${p.lat},${p.lng},${i}`}
          center={[p.lat, p.lng]}
          radius={7}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#000', fillOpacity: 1 }}
        >
          {p.label && (
            <Tooltip direction="top" offset={[0, -6]} permanent={showLabels}>
              {p.label}
            </Tooltip>
          )}
        </CircleMarker>
      ))}
      <FitToContent points={points} lines={lines} />
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
    </MapContainer>
  )
}
