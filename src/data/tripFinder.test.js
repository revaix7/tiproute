import { describe, it, expect } from 'vitest'
import { findTrip, ROAD_FACTOR } from './tripFinder'
import { DIFFICULTY_LABELS, estimateTrip } from './tripCalculator'
import { countries, transportModes } from './countries'
import { distanceBetween } from './geo'

const country = (name) => countries.find((c) => c.name === name)
const mode = (id) => transportModes.find((m) => m.id === id)
const japan = country('Japan')

const level = (label) => DIFFICULTY_LABELS.indexOf(label)

// Checks the three limits from the issue
function expectFits(trip, { days, budget, difficulty }) {
  expect(trip.avgDays).toBeLessThanOrEqual(days)
  expect(trip.totalBudget).toBeLessThanOrEqual(budget)
  expect(level(trip.difficulty.label)).toBeLessThanOrEqual(level(difficulty))
}

describe('findTrip', () => {
  it('finds a trip inside Japan for a bicycle, 10 days, $600 and Hard (issue #26)', () => {
    const limits = { days: 10, budget: 600, difficulty: 'Hard' }
    const result = findTrip({ country: japan, transportMode: mode('bicycle'), ...limits })

    expect(result.found).toBe(true)
    expect(result.problems).toBeUndefined()
    expectFits(result.trip, limits)

    const names = japan.tipToTip.checkpoints.map((c) => c.name)
    const startIndex = names.indexOf(result.trip.start.name)
    const endIndex = names.indexOf(result.trip.end.name)
    expect(startIndex).toBeGreaterThanOrEqual(0)
    expect(endIndex).toBeGreaterThan(startIndex)
    expect(result.trip.checkpoints.map((c) => c.name)).toEqual(names.slice(startIndex, endIndex + 1))
    expect(result.trip.country).toBe('Japan')
  })

  it('uses the road distance: straight legs between checkpoints times 1.3', () => {
    const { trip } = findTrip({
      country: japan,
      transportMode: mode('bicycle'),
      days: 10,
      budget: 600,
      difficulty: 'Hard',
    })
    let straight = 0
    for (let i = 1; i < trip.checkpoints.length; i++) {
      straight += distanceBetween(trip.checkpoints[i - 1], trip.checkpoints[i])
    }
    expect(trip.distance).toBe(Math.round(straight * ROAD_FACTOR))
  })

  it('picks the fitting trip with the most days', () => {
    const limits = { days: 10, budget: 600, difficulty: 'Hard' }
    const transportMode = mode('bicycle')
    const { trip } = findTrip({ country: japan, transportMode, ...limits })

    // Try every pair by hand: none that fits may take more days
    const points = japan.tipToTip.checkpoints
    for (let from = 0; from < points.length - 1; from++) {
      for (let to = from + 1; to < points.length; to++) {
        let straight = 0
        for (let i = from + 1; i <= to; i++) straight += distanceBetween(points[i - 1], points[i])
        const estimate = estimateTrip({
          distanceKm: Math.round(straight * ROAD_FACTOR),
          transportMode,
          dailyBudget: 30,
        })
        const fits =
          estimate.avgDays <= limits.days &&
          estimate.totalBudget <= limits.budget &&
          level(estimate.difficulty.label) <= level(limits.difficulty)
        if (fits) expect(estimate.avgDays).toBeLessThanOrEqual(trip.avgDays)
      }
    }
  })

  it('takes the whole route when there is plenty of time and money', () => {
    const { found, trip } = findTrip({
      country: japan,
      transportMode: mode('motorbike'),
      days: 365,
      budget: 100000,
      difficulty: 'Extreme',
    })
    expect(found).toBe(true)
    expect(trip.start).toEqual(japan.tipToTip.checkpoints[0])
    expect(trip.end).toEqual(japan.tipToTip.checkpoints.at(-1))
  })

  it('counts living costs at $30 a day unless told otherwise', () => {
    const args = { country: japan, transportMode: mode('motorbike'), days: 365, budget: 100000, difficulty: 'Extreme' }
    const normal = findTrip(args).trip
    const richer = findTrip({ ...args, dailyBudget: 100 }).trip
    expect(normal.budgetPerDay).toBe(30)
    expect(richer.totalBudget - normal.totalBudget).toBe(70 * normal.avgDays)
  })

  it('says when there is too little time and money', () => {
    const result = findTrip({
      country: japan,
      transportMode: mode('motorbike'),
      days: 1,
      budget: 50,
      difficulty: 'Extreme',
    })
    expect(result.found).toBe(false)
    expect(result.problems.map((p) => p.limit)).toEqual(['time', 'money'])
    expect(result.problems[0].message).toMatch(/too little time/i)
    expect(result.problems[1].message).toMatch(/too little money/i)
    // The closest trip is the shortest leg of the route
    expect(result.trip.checkpoints).toHaveLength(2)
  })

  it('says only the money is the problem when only the money is short', () => {
    const result = findTrip({
      country: japan,
      transportMode: mode('public'),
      days: 30,
      budget: 10,
      difficulty: 'Extreme',
    })
    expect(result.found).toBe(false)
    expect(result.problems.map((p) => p.limit)).toEqual(['money'])
  })

  it('explains that walking can never be Easy', () => {
    const result = findTrip({
      country: japan,
      transportMode: mode('walking'),
      days: 30,
      budget: 5000,
      difficulty: 'Easy',
    })
    expect(result.found).toBe(false)
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0].limit).toBe('difficulty')
    expect(result.problems[0].message).toMatch(/too low for this transport/i)
    expect(result.problems[0].message).toMatch(/walking/)
    // Still a useful trip: it fits the time and the money
    expect(result.trip.avgDays).toBeLessThanOrEqual(30)
    expect(result.trip.totalBudget).toBeLessThanOrEqual(5000)
  })

  it('finds a fitting trip in every country when the limits allow it', () => {
    for (const c of countries) {
      for (const m of transportModes) {
        const limits = { days: 365, budget: 100000, difficulty: 'Extreme' }
        const result = findTrip({ country: c, transportMode: m, ...limits })
        expect(result.found).toBe(true)
        expectFits(result.trip, limits)
      }
    }
  })

  it('rejects a difficulty it does not know', () => {
    expect(() =>
      findTrip({ country: japan, transportMode: mode('bicycle'), days: 10, budget: 600, difficulty: 'Medium' })
    ).toThrow(/Unknown difficulty/)
  })
})
