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
