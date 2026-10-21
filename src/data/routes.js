// Many different route lines between two points, for drawing on the map.
// The lines are generated, not real roads (decision in #20). Keep this file free of map
// code so a real routing service can replace it later behind the same function.

const DEFAULT_SPREAD = 0.15 // how far a line can stray, as a share of each segment's length
const SMOOTHING_PASSES = 3

// Seeded random numbers (mulberry32), so the same trip always gets the same lines
function seededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Turns the inputs into a seed (FNV-1a hash of their text)
function hashSeed(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

// Bell-curve random number around 0, so most lines stay close and a few stray further
function randomNormal(random) {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Moves a point sideways from the direction a → b by offset (in degrees)
function pushSideways(point, a, b, offset) {
  const dLat = b.lat - a.lat
  const dLng = b.lng - a.lng
  const length = Math.hypot(dLat, dLng) || 1
  return { lat: point.lat + (dLng / length) * offset, lng: point.lng - (dLat / length) * offset }
}

const segmentLength = (a, b) => Math.hypot(b.lat - a.lat, b.lng - a.lng)

// Without checkpoints, add a few evenly spaced points so the lines can still bend
function straightBackbone(from, to, parts = 4) {
  return Array.from({ length: parts + 1 }, (_, i) => ({
    lat: from.lat + ((to.lat - from.lat) * i) / parts,
    lng: from.lng + ((to.lng - from.lng) * i) / parts,
  }))
}

// Chaikin's corner cutting: rounds the corners and keeps the first and last point
function smooth(line, passes) {
  let points = line
  for (let pass = 0; pass < passes; pass++) {
    const next = [points[0]]
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i], points[i + 1]]
      next.push(
        [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]],
        [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]
      )
    }
    next.push(points[points.length - 1])
    points = next
  }
  return points
}

function makeLine(backbone, random, spread) {
  const line = [[backbone[0].lat, backbone[0].lng]]

  for (let i = 1; i < backbone.length; i++) {
    const prev = backbone[i - 1]
    const point = backbone[i]
    const length = segmentLength(prev, point)

    // A point halfway along the segment, pushed to one side
    const middle = { lat: (prev.lat + point.lat) / 2, lng: (prev.lng + point.lng) / 2 }
    const bent = pushSideways(middle, prev, point, randomNormal(random) * spread * length)
    line.push([bent.lat, bent.lng])

    if (i === backbone.length - 1) {
      line.push([point.lat, point.lng]) // the end never moves
    } else {
      // Checkpoints move less than the halfway points, so lines still pass near them
      const next = backbone[i + 1]
      const moved = pushSideways(point, prev, next, randomNormal(random) * spread * 0.6 * length)
      line.push([moved.lat, moved.lng])
    }
  }

  return smooth(line, SMOOTHING_PASSES)
}

// Returns `count` different lines from `from` to `to`. Each line is a list of [lat, lng].
// `via` is an optional list of points to pass near, in order, without `from` and `to`.
// The same inputs always give the same lines.
export function getRouteLines({ from, to, via = [], count, spread = DEFAULT_SPREAD }) {
  const backbone = via.length > 0 ? [from, ...via, to] : straightBackbone(from, to)
  const baseSeed = hashSeed(JSON.stringify([from, to, via, spread]))

  return Array.from({ length: count }, (_, i) =>
    makeLine(backbone, seededRandom(baseSeed + i), spread)
  )
}
