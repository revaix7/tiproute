// A trip as a link: the planner's inputs go in the URL, and the results page and the
// trip card recalculate the trip from them. Anyone opening the link sees the same trip.
//
//   /results?mode=route&country=JP&transport=bicycle&daily=30
//   /results?mode=time&country=NZ&transport=walking&daily=30&days=14
//   /results?mode=find&country=JP&transport=bicycle&days=10&budget=600&difficulty=Hard
//   /trip-card?mode=custom&from=48.85660,2.35220&to=51.50740,-0.12780&transport=walking&daily=30

import { countries, transportModes } from './countries'
import {
  calculateTrip,
  compareEstimates,
  compareTransportModes,
  estimateTrip,
  DIFFICULTY_LABELS,
} from './tripCalculator'
import { findTrip, DEFAULT_DAILY_BUDGET } from './tripFinder'
import { distanceBetween, formatPoint, roadDistanceBetween } from './geo'

// Long enough to walk the longest route at the slowest pace
export const MAX_TRIP_DAYS = Math.ceil(
  Math.max(...countries.map((c) => c.tipToTip.distanceKm)) /
    Math.min(...transportModes.map((t) => t.kmPerDay.min))
)
export const DAILY_BUDGET = { min: 5, max: 150 }
// Total money for "Find me a trip", transport and living costs together
export const TOTAL_BUDGET = { min: 100, max: 20000 }
// Closer than this, a custom trip has nothing to estimate
export const MIN_DISTANCE_KM = 1

// About a metre. Points are rounded to this when picked, so the link holds the exact points.
export const COORD_DECIMALS = 5

// The query string for a trip, without the "?"
export function tripSearch({ mode, country, transport, daily, days, budget, difficulty, from, to }) {
  const params = new URLSearchParams({ mode })
  if (country) params.set('country', country)
  if (from) params.set('from', `${from.lat.toFixed(COORD_DECIMALS)},${from.lng.toFixed(COORD_DECIMALS)}`)
  if (to) params.set('to', `${to.lat.toFixed(COORD_DECIMALS)},${to.lng.toFixed(COORD_DECIMALS)}`)
  params.set('transport', transport)
  if (mode !== 'find') params.set('daily', daily)
  if (mode !== 'route' && mode !== 'custom') params.set('days', days)
  if (mode === 'find') {
    params.set('budget', budget)
    params.set('difficulty', difficulty)
  }
  return params.toString()
}

// A whole number between min and max, or null
function readInteger(params, name, { min, max }) {
  const text = params.get(name)
  if (text === null || !/^\d+$/.test(text)) return null
  const value = Number(text)
  return value >= min && value <= max ? value : null
}

// "lat,lng", or null. Any longitude is allowed: past ±180 is a repeated copy of the world map.
function readPoint(params, name) {
  const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(params.get(name) ?? '')
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  return Math.abs(lat) <= 90 && Number.isFinite(lng) ? { lat, lng } : null
}

// The trip for a query string, as { trip, comparison }, or null when the link is not a
// whole, valid trip. Every value is checked, because links can be typed or cut short.
export function tripFromSearch(search) {
  const params = new URLSearchParams(search)
  const mode = params.get('mode')
  const transportMode = transportModes.find((t) => t.id === params.get('transport'))
  if (!transportMode) return null

  if (mode === 'custom') return customTrip(params, transportMode)

  const country = countries.find((c) => c.code === params.get('country'))
  if (!country) return null

  if (mode === 'route' || mode === 'time') {
    const dailyBudget = readInteger(params, 'daily', DAILY_BUDGET)
    const tripDays = mode === 'time' ? readInteger(params, 'days', { min: 1, max: MAX_TRIP_DAYS }) : undefined
    if (dailyBudget === null || tripDays === null) return null
    const inputs = { country, dailyBudget, planningMode: mode, tripDays }
    return {
      trip: calculateTrip({ ...inputs, transportMode }),
      comparison: compareTransportModes({ ...inputs, transportModes }),
    }
  }

  if (mode === 'find') {
    const days = readInteger(params, 'days', { min: 1, max: MAX_TRIP_DAYS })
    const budget = readInteger(params, 'budget', TOTAL_BUDGET)
    const difficulty = params.get('difficulty')
    if (days === null || budget === null || !DIFFICULTY_LABELS.includes(difficulty)) return null
    const { found, trip, problems } = findTrip({ country, transportMode, days, budget, difficulty })
    return {
      trip: { ...trip, finder: { found, problems: problems ?? [], days, budget, difficulty } },
      comparison: compareEstimates({
        distanceKm: trip.distance,
        transportModes,
        dailyBudget: DEFAULT_DAILY_BUDGET,
      }),
    }
  }

  return null
}

// "Plan your own trip": two points anywhere, no country
function customTrip(params, transportMode) {
  const start = readPoint(params, 'from')
  const end = readPoint(params, 'to')
  const dailyBudget = readInteger(params, 'daily', DAILY_BUDGET)
  if (!start || !end || dailyBudget === null) return null
  if (distanceBetween(start, end) < MIN_DISTANCE_KM) return null

  const distanceKm = Math.round(roadDistanceBetween(start, end))
  const named = (point) => ({ ...point, name: formatPoint(point, 2) })
  return {
    trip: {
      country: null,
      start: named(start),
      end: named(end),
      startPoint: formatPoint(start, 2),
      endPoint: formatPoint(end, 2),
      distance: distanceKm,
      ...estimateTrip({ distanceKm, transportMode, dailyBudget }),
      budgetPerDay: dailyBudget,
      transport: transportMode,
      planningMode: 'custom',
      canComplete: true,
      reachableDistance: distanceKm,
    },
    comparison: compareEstimates({ distanceKm, transportModes, dailyBudget }),
  }
}
