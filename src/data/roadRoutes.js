// Real routes by road between two points, for drawing on the map (#50, the "roads later"
// half of #20). Routes come from the free OSRM servers run by FOSSGIS on OpenStreetMap
// data. They are shared, so this sends few requests, caches them, and lets callers cancel.

import { distanceBetween, wrapLng } from './geo'

export const ROUTING_URL = 'https://routing.openstreetmap.de'

// OSRM profile for each way to travel
const PROFILES = { motorbike: 'car', public: 'car', bicycle: 'bike', walking: 'foot' }

// OSRM moves each point onto the nearest road it can route on. Further than this from
// the start or the end, the route would not really start or end there (a point in the
// sea, or on a continent with no road to the other point), so there is no route.
export const MAX_END_SNAP_KM = 25
// Extra routes go through a point off to the side. It may move this share of the trip's
// length to find a road, or the extra route is dropped.
const MAX_VIA_SNAP_SHARE = 0.08
// Extra routes longer than this times the shortest one are silly detours
const MAX_DETOUR = 1.5
// Points to the side for extra routes: how far along the trip, and how far to the side,
// as shares of the trip's length
const SIDE_POINTS = [
  [0.5, 0.12],
  [0.5, -0.12],
  [0.4, 0.25],
  [0.6, -0.25],
]
const PARALLEL_REQUESTS = 2
// Give up on a request after this long, so the page doesn't say "Finding routes" forever
export const REQUEST_TIMEOUT_MS = 15000

const cache = new Map()

// GET a routing URL. Answers are cached; requests in progress are not shared, so one
// caller cancelling never cancels another.
async function getJson(url, { signal, fetchImpl }) {
  if (cache.has(url)) return cache.get(url)

  // Stop on whichever comes first: the caller cancelling, or the time running out
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('The routing server took too long', 'TimeoutError')),
    REQUEST_TIMEOUT_MS
  )
  const cancel = () => controller.abort(signal.reason)
  if (signal?.aborted) cancel()
  signal?.addEventListener('abort', cancel, { once: true })

  try {
    const response = await fetchImpl(url, { signal: controller.signal })
    // OSRM answers 400 with a JSON body for "no route" and similar
    if (!response.ok && response.status !== 400) {
      throw new Error(`Routing server answered ${response.status}`)
    }
    const data = await response.json()
    cache.set(url, data)
    return data
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', cancel)
  }
}

export function clearRouteCache() {
  cache.clear()
}

// OSRM wants longitudes between -180 and 180, written "lng,lat"
const coordText = (p) => `${wrapLng(p.lng).toFixed(5)},${p.lat.toFixed(5)}`

export function routeUrl(points, profile, { alternatives = false } = {}) {
  const coords = points.map(coordText).join(';')
  const options = `overview=full&geometries=geojson&alternatives=${alternatives ? 3 : 'false'}`
  return `${ROUTING_URL}/routed-${profile}/route/v1/driving/${coords}?${options}`
}

// OSRM gives longitudes between -180 and 180. Shift them so the line starts next to
// startLng and never jumps across the map at the date line.
export function continuousLine(coords, startLng) {
  const line = []
  let previous = startLng
  for (const [lng, lat] of coords) {
    let shifted = lng
    while (shifted - previous > 180) shifted -= 360
    while (shifted - previous < -180) shifted += 360
    line.push([lat, shifted])
    previous = shifted
  }
  return line
}

// A point part way along the straight line from a to b, moved to the side.
// along and side are shares of the line's length; side > 0 is to the left.
export function sidePoint(a, b, along, side) {
  const scale = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180)
  const ax = a.lng * scale
  const bx = b.lng * scale
  const dx = bx - ax
  const dy = b.lat - a.lat
  const x = ax + dx * along - dy * side
  const y = a.lat + dy * along + dx * side
  return { lat: Math.max(-85, Math.min(85, y)), lng: x / scale }
}

// The routes in one OSRM answer, or [] when its points moved too far to find roads
function readRoutes(data, { maxViaSnapKm, startLng }) {
  if (data?.code !== 'Ok' || !Array.isArray(data.routes)) return []
  const snaps = data.waypoints.map((w) => w.distance / 1000)
  const ends = [snaps[0], snaps[snaps.length - 1]]
  if (ends.some((km) => km > MAX_END_SNAP_KM)) return []
  if (snaps.slice(1, -1).some((km) => km > maxViaSnapKm)) return []
  return data.routes.map((route) => ({
    line: continuousLine(route.geometry.coordinates, startLng),
    distanceKm: route.distance / 1000,
  }))
}

// Two routes are the same if they pass close to each other all along
function sameRoute(a, b) {
  if (Math.abs(a.distanceKm - b.distanceKm) > Math.max(a.distanceKm, b.distanceKm) * 0.02) return false
  const samples = 10
  for (let i = 1; i < samples; i++) {
    const pa = a.line[Math.floor((a.line.length - 1) * (i / samples))]
    const pb = b.line[Math.floor((b.line.length - 1) * (i / samples))]
    const km = distanceBetween({ lat: pa[0], lng: pa[1] }, { lat: pb[0], lng: pb[1] })
    if (km > Math.max(1, a.distanceKm * 0.01)) return false
  }
  return true
}

// Runs the jobs at most `limit` at a time
async function runLimited(jobs, limit) {
  const results = new Array(jobs.length)
  let next = 0
  async function worker() {
    while (next < jobs.length) {
      const i = next++
      results[i] = await jobs[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker))
  return results
}

const isAbort = (error) => error?.name === 'AbortError'

// Routes by road from `from` to `to` for a way to travel (a transport id).
// `via` are points a route must pass through, like a country's checkpoints.
// Returns { status: 'ok', routes: [{ line, distanceKm }] } with the shortest first, or
// { status: 'none' } when there is no route by road. Throws if the server can't be reached.
export async function fetchRoadRoutes({ from, to, via = [], transportId, signal, fetchImpl = fetch }) {
  const profile = PROFILES[transportId] ?? 'car'
  const straightKm = distanceBetween(from, to)
  const options = { signal, fetchImpl }
  const read = (data, maxViaSnapKm = 0) => readRoutes(data, { maxViaSnapKm, startLng: from.lng })

  // The direct route and its alternatives decide whether there is a route at all
  const direct = read(await getJson(routeUrl([from, to], profile, { alternatives: true }), options))
  if (direct.length === 0) return { status: 'none' }

  // More routes: through the checkpoints, and through points to each side
  const viaSnapKm = Math.max(5, straightKm * MAX_VIA_SNAP_SHARE)
  const extraPoints = [
    ...(via.length > 0 ? [via] : []),
    ...SIDE_POINTS.map(([along, side]) => [sidePoint(from, to, along, side)]),
  ]
  const extras = await runLimited(
    extraPoints.map((points) => async () => {
      try {
        const data = await getJson(routeUrl([from, ...points, to], profile), options)
        return read(data, via.length > 0 && points === via ? Infinity : viaSnapKm)
      } catch (error) {
        // A missing extra route is fine; cancelling is not an error to hide
        if (isAbort(error)) throw error
        return []
      }
    }),
    PARALLEL_REQUESTS
  )

  const shortest = Math.min(...direct.map((r) => r.distanceKm))
  const routes = []
  for (const route of [...direct, ...extras.flat()]) {
    if (route.distanceKm > shortest * MAX_DETOUR) continue
    if (routes.some((kept) => sameRoute(kept, route))) continue
    routes.push(route)
  }
  routes.sort((a, b) => a.distanceKm - b.distanceKm)
  return { status: 'ok', routes }
}
