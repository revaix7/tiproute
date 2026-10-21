const EARTH_RADIUS_KM = 6371

const toRadians = (deg) => (deg * Math.PI) / 180

// Straight-line distance in km between two { lat, lng } points (haversine)
export function distanceBetween(a, b) {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

// The start and end of a trip as labelled map points, the same on every page
export function startEndPoints(start, end) {
  if (!start || !end) return []
  return [
    { ...start, label: `Start: ${start.name}` },
    { ...end, label: `End: ${end.name}` },
  ]
}

// The start and end of a trip's whole route. An unfinished "I have time" trip also gets
// a hollow point where the time runs out, so the real end is never mistaken for the finish.
export function tripMapPoints(trip) {
  const points = startEndPoints(trip?.start, trip?.end)
  const reached = trip?.reachableCheckpoint
  if (points.length === 0 || trip.canComplete || !reached || reached.name === trip.start.name) {
    return points
  }
  return [...points, { ...reached, label: `You reach: ${reached.name}`, hollow: true }]
}

// Roads are longer than a straight line
export const ROAD_FACTOR = 1.3

// Estimated road distance in km between two { lat, lng } points
export function roadDistanceBetween(a, b) {
  return distanceBetween(a, b) * ROAD_FACTOR
}
