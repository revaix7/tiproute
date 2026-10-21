import { describe, it, expect } from 'vitest'
import { tripSearch, tripFromSearch, MAX_TRIP_DAYS } from './tripLink'
import { calculateTrip, compareTransportModes } from './tripCalculator'
import { findTrip } from './tripFinder'
import { countries, transportModes } from './countries'

const country = (code) => countries.find((c) => c.code === code)
const mode = (id) => transportModes.find((m) => m.id === id)

const routeInputs = { mode: 'route', country: 'JP', transport: 'bicycle', daily: 30 }
const timeInputs = { mode: 'time', country: 'NZ', transport: 'walking', daily: 30, days: 14 }
const findInputs = {
  mode: 'find',
  country: 'JP',
  transport: 'bicycle',
  days: 10,
  budget: 600,
  difficulty: 'Hard',
}
const customInputs = {
  mode: 'custom',
  from: { lat: 48.8566, lng: 2.3522 },
  to: { lat: 51.5074, lng: -0.1278 },
  transport: 'walking',
  daily: 30,
}

describe('tripSearch and tripFromSearch', () => {
  it('gives back the same "I have a route" trip as the planner', () => {
    const search = tripSearch(routeInputs)
    expect(search).toBe('mode=route&country=JP&transport=bicycle&daily=30')
    const inputs = { country: country('JP'), dailyBudget: 30, planningMode: 'route' }
    expect(tripFromSearch(search)).toEqual({
      trip: calculateTrip({ ...inputs, transportMode: mode('bicycle') }),
      comparison: compareTransportModes({ ...inputs, transportModes }),
    })
  })

  it('gives back the same "I have time" trip, unfinished as in issue #11', () => {
    const { trip } = tripFromSearch(tripSearch(timeInputs))
    expect(trip).toEqual(
      calculateTrip({
        country: country('NZ'),
        transportMode: mode('walking'),
        dailyBudget: 30,
        planningMode: 'time',
        tripDays: 14,
      })
    )
    expect(trip.canComplete).toBe(false)
  })

  it('finds the same trip for "Find me a trip" and keeps what was asked', () => {
    const search = tripSearch(findInputs)
    expect(search).not.toContain('daily=')
    const { trip } = tripFromSearch(search)
    const expected = findTrip({ ...findInputs, country: country('JP'), transportMode: mode('bicycle') })
    expect(trip).toMatchObject(expected.trip)
    expect(trip.finder).toEqual({ found: true, problems: [], days: 10, budget: 600, difficulty: 'Hard' })
  })

  it('works out a custom trip from two points', () => {
    const { trip, comparison } = tripFromSearch(tripSearch(customInputs))
    expect(trip).toMatchObject({
      country: null,
      planningMode: 'custom',
      startPoint: '48.86° N, 2.35° E',
      endPoint: '51.51° N, 0.13° W',
      canComplete: true,
    })
    // Paris to London is about 344 km in a straight line, times 1.3 for roads
    expect(trip.distance).toBeGreaterThan(430)
    expect(trip.distance).toBeLessThan(460)
    expect(comparison).toHaveLength(transportModes.length)
  })

  it('keeps longitudes from a repeated copy of the world map', () => {
    const { trip } = tripFromSearch(
      tripSearch({ ...customInputs, from: { lat: 0, lng: 179.5 }, to: { lat: 0, lng: 180.5 } })
    )
    expect(trip.distance).toBeLessThan(200)
  })
})

describe('tripFromSearch with a broken link', () => {
  const broken = (inputs, changes) => {
    const params = new URLSearchParams(tripSearch(inputs))
    for (const [name, value] of Object.entries(changes)) {
      if (value === null) params.delete(name)
      else params.set(name, value)
    }
    return tripFromSearch(params.toString())
  }

  it('returns null for an empty or unknown link', () => {
    expect(tripFromSearch('')).toBeNull()
    expect(tripFromSearch('?hello=1')).toBeNull()
    expect(broken(routeInputs, { mode: 'teleport' })).toBeNull()
    expect(broken(routeInputs, { mode: null })).toBeNull()
  })

  it('returns null for an unknown country or transport', () => {
    expect(broken(routeInputs, { country: 'XX' })).toBeNull()
    expect(broken(routeInputs, { country: null })).toBeNull()
    expect(broken(routeInputs, { transport: 'rocket' })).toBeNull()
    expect(broken(routeInputs, { transport: 'constructor' })).toBeNull()
  })

  it('returns null for numbers that are missing, out of range or not whole', () => {
    for (const daily of [null, '', '0', '4', '151', '30.5', '-30', 'abc', '1e1', ' 30']) {
      expect(broken(routeInputs, { daily })).toBeNull()
    }
    for (const days of [null, '0', String(MAX_TRIP_DAYS + 1), '9'.repeat(400), '7.5']) {
      expect(broken(timeInputs, { days })).toBeNull()
    }
    for (const budget of [null, '99', '20001', 'lots']) {
      expect(broken(findInputs, { budget })).toBeNull()
    }
  })

  it('accepts the edges of each range', () => {
    expect(broken(routeInputs, { daily: '5' })).not.toBeNull()
    expect(broken(routeInputs, { daily: '150' })).not.toBeNull()
    expect(broken(timeInputs, { days: '1' })).not.toBeNull()
    expect(broken(timeInputs, { days: String(MAX_TRIP_DAYS) })).not.toBeNull()
    expect(broken(findInputs, { budget: '100' })).not.toBeNull()
    expect(broken(findInputs, { budget: '20000' })).not.toBeNull()
  })

  it('returns null for an unknown difficulty', () => {
    expect(broken(findInputs, { difficulty: 'hard' })).toBeNull()
    expect(broken(findInputs, { difficulty: null })).toBeNull()
  })

  it('returns null for custom points that are missing, malformed or too close', () => {
    for (const from of [null, '', '48.8', '48.8,', 'a,b', '91,0', '-91,0', '48.8,2.3,1', '1e2,3']) {
      expect(broken(customInputs, { from })).toBeNull()
    }
    expect(broken(customInputs, { to: '48.85660,2.35220' })).toBeNull()
    expect(broken(customInputs, { daily: '200' })).toBeNull()
  })
})
