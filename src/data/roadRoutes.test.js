import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fetchRoadRoutes,
  clearRouteCache,
  continuousLine,
  routeUrl,
  sidePoint,
  MAX_END_SNAP_KM,
  REQUEST_TIMEOUT_MS,
} from './roadRoutes'

const paris = { lat: 48.8566, lng: 2.3522 }
const lyon = { lat: 45.764, lng: 4.8357 }

// A fake OSRM route: a straight-ish line through the given [lng, lat] points
const route = (km, coords) => ({ distance: km * 1000, geometry: { coordinates: coords } })
const answer = (routes, snapsKm = [0.1, 0.1]) => ({
  code: 'Ok',
  routes,
  waypoints: snapsKm.map((km) => ({ distance: km * 1000 })),
})
const directLine = [
  [2.35, 48.86],
  [3.5, 47.5],
  [4.84, 45.76],
]
const eastLine = [
  [2.35, 48.86],
  [5.5, 47.5],
  [4.84, 45.76],
]
const westLine = [
  [2.35, 48.86],
  [1.5, 47.0],
  [4.84, 45.76],
]

// A fake fetch: the direct request (with alternatives) gets `direct`, others get `extra`
function fakeFetch({ direct, extra = () => answer([]), fail = false }) {
  const calls = []
  const fetchImpl = async (url, { signal } = {}) => {
    calls.push(url)
    if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    if (fail) throw new TypeError('Failed to fetch')
    const body = url.includes('alternatives=3') ? direct : extra(url, calls.length)
    return { ok: true, status: 200, json: async () => body }
  }
  return { fetchImpl, calls }
}

beforeEach(() => clearRouteCache())

describe('fetchRoadRoutes', () => {
  it('gives the direct route and its alternatives, shortest first', async () => {
    const { fetchImpl } = fakeFetch({
      direct: answer([route(480, eastLine), route(466, directLine)]),
    })
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    expect(result.status).toBe('ok')
    expect(result.routes.map((r) => r.distanceKm)).toEqual([466, 480])
    // Leaflet wants [lat, lng]
    expect(result.routes[0].line[0]).toEqual([48.86, 2.35])
  })

  it('uses the profile for the way to travel', async () => {
    for (const [transportId, profile] of [
      ['motorbike', 'car'],
      ['public', 'car'],
      ['bicycle', 'bike'],
      ['walking', 'foot'],
    ]) {
      clearRouteCache()
      const { fetchImpl, calls } = fakeFetch({ direct: answer([route(466, directLine)]) })
      await fetchRoadRoutes({ from: paris, to: lyon, transportId, fetchImpl })
      expect(calls.every((url) => url.includes(`/routed-${profile}/`))).toBe(true)
    }
  })

  it('says there is no route when the server finds none', async () => {
    const { fetchImpl, calls } = fakeFetch({ direct: { code: 'NoRoute', message: 'Impossible route' } })
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'walking', fetchImpl })
    expect(result).toEqual({ status: 'none' })
    // No extra requests once it knows there is no route
    expect(calls).toHaveLength(1)
  })

  it('says there is no route when the end had to move far to find a road (Paris to New York)', async () => {
    // The real server moves New York 5,534 km to Lisbon rather than say "no route"
    const { fetchImpl } = fakeFetch({ direct: answer([route(1776, directLine)], [0, 5534]) })
    const result = await fetchRoadRoutes({
      from: paris,
      to: { lat: 40.7, lng: -74 },
      transportId: 'motorbike',
      fetchImpl,
    })
    expect(result).toEqual({ status: 'none' })
  })

  it('accepts an end a little way from the nearest road', async () => {
    const { fetchImpl } = fakeFetch({
      direct: answer([route(466, directLine)], [0.1, MAX_END_SNAP_KM - 1]),
    })
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    expect(result.status).toBe('ok')
  })

  it('adds routes through points to the side, and drops ones whose point is far from a road', async () => {
    const { fetchImpl } = fakeFetch({
      direct: answer([route(466, directLine)]),
      // The first extra route is fine, the others went to a point in the sea
      extra: (url, n) =>
        n === 2 ? answer([route(500, westLine)], [0.1, 3, 0.1]) : answer([route(520, eastLine)], [0.1, 400, 0.1]),
    })
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    expect(result.routes.map((r) => r.distanceKm)).toEqual([466, 500])
  })

  it('drops big detours and routes that are the same as one already kept', async () => {
    const { fetchImpl } = fakeFetch({
      direct: answer([route(466, directLine)]),
      extra: (url, n) =>
        n === 2
          ? answer([route(800, westLine)], [0.1, 1, 0.1]) // more than 1.5 times longer
          : answer([route(467, directLine)], [0.1, 1, 0.1]), // the direct route again
    })
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    expect(result.routes.map((r) => r.distanceKm)).toEqual([466])
  })

  it('routes through the checkpoints, however far they are from the straight line', async () => {
    const checkpoint = { lat: 46.2, lng: 6.14 }
    const { fetchImpl, calls } = fakeFetch({
      direct: answer([route(466, directLine)]),
      extra: (url) =>
        url.includes('6.14000,46.20000')
          ? answer([route(560, eastLine)], [0.1, 60, 0.1])
          : answer([]),
    })
    const result = await fetchRoadRoutes({
      from: paris,
      to: lyon,
      via: [checkpoint],
      transportId: 'bicycle',
      fetchImpl,
    })
    expect(calls.some((url) => url.includes('2.35220,48.85660;6.14000,46.20000;4.83570,45.76400'))).toBe(true)
    expect(result.routes.map((r) => r.distanceKm)).toEqual([466, 560])
  })

  it('still gives the direct routes when an extra request fails', async () => {
    const { fetchImpl } = fakeFetch({
      direct: answer([route(466, directLine)]),
      extra: () => {
        throw new Error('server busy')
      },
    })
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    expect(result.routes).toHaveLength(1)
  })

  it('throws when the server cannot be reached', async () => {
    const { fetchImpl } = fakeFetch({ fail: true })
    await expect(
      fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    ).rejects.toThrow('Failed to fetch')
  })

  it('stops when cancelled', async () => {
    const { fetchImpl } = fakeFetch({ direct: answer([route(466, directLine)]) })
    const controller = new AbortController()
    controller.abort()
    await expect(
      fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl, signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('gives up on a request that takes too long, as an error and not a cancel', async () => {
    vi.useFakeTimers()
    try {
      // A server that never answers, but stops when told to
      const fetchImpl = (url, { signal }) =>
        new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
      const pending = fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
      const check = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1)
      await check
    } finally {
      vi.useRealTimers()
    }
  })

  it('asks the server once for the same trip', async () => {
    const { fetchImpl, calls } = fakeFetch({ direct: answer([route(466, directLine)]) })
    await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    const first = calls.length
    await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'motorbike', fetchImpl })
    expect(calls).toHaveLength(first)
    expect(first).toBe(5) // direct, then 4 to the side
  })

  it('asks again after a failed request', async () => {
    let fail = true
    const fetchImpl = async () => {
      if (fail) throw new TypeError('Failed to fetch')
      return { ok: true, status: 200, json: async () => answer([route(466, directLine)]) }
    }
    await expect(fetchRoadRoutes({ from: paris, to: lyon, transportId: 'walking', fetchImpl })).rejects.toThrow()
    fail = false
    const result = await fetchRoadRoutes({ from: paris, to: lyon, transportId: 'walking', fetchImpl })
    expect(result.status).toBe('ok')
  })
})

describe('routeUrl', () => {
  it('writes the points as lng,lat between -180 and 180', () => {
    const url = routeUrl([{ lat: 10, lng: 190 }, paris], 'foot', { alternatives: true })
    expect(url).toBe(
      'https://routing.openstreetmap.de/routed-foot/route/v1/driving/-170.00000,10.00000;2.35220,48.85660' +
        '?overview=full&geometries=geojson&alternatives=3'
    )
  })
})

describe('continuousLine', () => {
  it('keeps a line across the date line continuous, next to where it starts', () => {
    const line = continuousLine(
      [
        [179.5, 0],
        [-179.5, 0],
        [-179, 1],
      ],
      539.5
    )
    expect(line).toEqual([
      [0, 539.5],
      [0, 540.5],
      [1, 541],
    ])
  })
})

describe('sidePoint', () => {
  it('is on the straight line with no side offset', () => {
    const p = sidePoint({ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, 0.5, 0)
    expect(p.lat).toBeCloseTo(0)
    expect(p.lng).toBeCloseTo(5)
  })

  it('moves to the left of the direction of travel', () => {
    // Going east, left is north
    expect(sidePoint({ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, 0.5, 0.2).lat).toBeCloseTo(2)
    expect(sidePoint({ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, 0.5, -0.2).lat).toBeCloseTo(-2)
  })
})
