import { describe, it, expect } from 'vitest'
import { calculateTrip, compareTransportModes, estimateTrip, getDifficulty } from './tripCalculator'
import { countries, transportModes } from './countries'

// Round numbers so every expected value can be worked out by hand
const testMode = {
  id: 'test',
  name: 'Test',
  emoji: '',
  kmPerDay: { min: 100, max: 200 },
  costPerKm: 0.1,
  dailyCost: 10,
  difficulty: 2,
}

const checkpoints = ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({ name, lat: i, lng: i }))

// 1,000 km with 5 checkpoints, so each segment is 250 km
const testCountry = {
  name: 'Testland',
  tipToTip: {
    start: { name: 'South Tip', lat: 0, lng: 0 },
    end: { name: 'North Tip', lat: 4, lng: 4 },
    distanceKm: 1000,
    checkpoints,
  },
}

const motorbike = transportModes.find((m) => m.id === 'motorbike')
const japan = countries.find((c) => c.name === 'Japan')

describe('estimateTrip', () => {
  it('works out days, cost and difficulty from a distance alone', () => {
    // 1000 / 200 = 5 days, 1000 / 100 = 10 days, average 7.5 rounds to 8
    // per day: 10 base + (1000 / 8) * 0.1 + 20 living = 42.5
    expect(estimateTrip({ distanceKm: 1000, transportMode: testMode, dailyBudget: 20 })).toEqual({
      minDays: 5,
      maxDays: 10,
      avgDays: 8,
      dailyCost: 43,
      totalBudget: 340,
      difficulty: { score: 2, label: 'Moderate' },
    })
  })

  it('gives the numbers from issue #18 for 500 km by motorbike', () => {
    expect(estimateTrip({ distanceKm: 500, transportMode: motorbike, dailyBudget: 30 })).toEqual({
      minDays: 2,
      maxDays: 3,
      avgDays: 3,
      dailyCost: 68,
      totalBudget: 205,
      difficulty: { score: 2, label: 'Moderate' },
    })
  })
})

describe('calculateTrip in "route" mode', () => {
  const trip = calculateTrip({
    country: testCountry,
    transportMode: testMode,
    dailyBudget: 20,
    planningMode: 'route',
  })

  it('uses the same maths as estimateTrip', () => {
    expect(trip).toMatchObject(
      estimateTrip({ distanceKm: 1000, transportMode: testMode, dailyBudget: 20 })
    )
  })

  it('covers the whole route', () => {
    expect(trip.canComplete).toBe(true)
    expect(trip.reachableDistance).toBe(1000)
    expect(trip.checkpoints).toEqual(checkpoints)
    expect(trip.reachableCheckpoint).toEqual(checkpoints[4])
    expect(trip.startPoint).toBe('South Tip')
    expect(trip.endPoint).toBe('North Tip')
  })

  it('matches what the app shows for Japan by motorbike at $30 a day', () => {
    const japanTrip = calculateTrip({
      country: japan,
      transportMode: motorbike,
      dailyBudget: 30,
      planningMode: 'route',
    })
    expect(japanTrip).toMatchObject({ minDays: 7, maxDays: 14, dailyCost: 75, totalBudget: 829 })
  })
})

describe('calculateTrip in "time" mode', () => {
  it('finishes the route when there are enough days', () => {
    const trip = calculateTrip({
      country: testCountry,
      transportMode: testMode,
      dailyBudget: 20,
      planningMode: 'time',
      tripDays: 10,
    })
    // 150 km a day reaches 1,500 km, more than the 1,000 km route.
    // Transport stops after ceil(1000 / 150) = 7 days: 7 * 10 + 1000 * 0.1 = 170.
    // Living costs cover all 10 days: 170 + 10 * 20 = 370.
    expect(trip).toMatchObject({
      canComplete: true,
      minDays: 10,
      maxDays: 10,
      avgDays: 10,
      reachableDistance: 1000,
      totalBudget: 370,
      dailyCost: 37,
    })
    expect(trip.checkpoints).toEqual(checkpoints)
    expect(trip.reachableCheckpoint).toEqual(checkpoints[4])
  })

  it('stops part way when there are not enough days', () => {
    const trip = calculateTrip({
      country: testCountry,
      transportMode: testMode,
      dailyBudget: 20,
      planningMode: 'time',
      tripDays: 4,
    })
    // 4 * 150 = 600 km, which is 2 full segments of 250 km, so checkpoint C.
    // Cost: 4 * 10 + 600 * 0.1 + 4 * 20 = 180.
    expect(trip).toMatchObject({
      canComplete: false,
      reachableDistance: 600,
      totalBudget: 180,
      dailyCost: 45,
    })
    expect(trip.reachableCheckpoint).toEqual(checkpoints[2])
    expect(trip.checkpoints).toEqual(checkpoints.slice(0, 3))
    expect(trip.allCheckpoints).toEqual(checkpoints)
  })

  it('never goes past the last checkpoint', () => {
    const trip = calculateTrip({
      country: testCountry,
      transportMode: testMode,
      dailyBudget: 20,
      planningMode: 'time',
      tripDays: 100,
    })
    expect(trip.reachableDistance).toBe(1000)
    expect(trip.reachableCheckpoint).toEqual(checkpoints[4])
  })
})

describe('getDifficulty', () => {
  it('adds nothing for a short, quick trip', () => {
    expect(getDifficulty(1, 3000, 60)).toEqual({ score: 1, label: 'Easy' })
  })

  it('adds 0.5 above 3,000 km and another 0.5 above 5,000 km', () => {
    expect(getDifficulty(1, 3001, 10).score).toBe(1.5)
    expect(getDifficulty(1, 5000, 10).score).toBe(1.5)
    expect(getDifficulty(1, 5001, 10).score).toBe(2)
  })

  it('adds 0.5 above 60 days and another 0.5 above 100 days', () => {
    expect(getDifficulty(1, 100, 61).score).toBe(1.5)
    expect(getDifficulty(1, 100, 100).score).toBe(1.5)
    expect(getDifficulty(1, 100, 101).score).toBe(2)
  })

  it('keeps the score between 1 and 5', () => {
    expect(getDifficulty(5, 6000, 120)).toEqual({ score: 5, label: 'Extreme' })
    expect(getDifficulty(0, 100, 10)).toEqual({ score: 1, label: 'Easy' })
  })

  it('labels each whole score', () => {
    expect([1, 2, 3, 4, 5].map((s) => getDifficulty(s, 0, 0).label)).toEqual([
      'Easy',
      'Moderate',
      'Challenging',
      'Hard',
      'Extreme',
    ])
  })
})

describe('compareTransportModes', () => {
  it('flags the cheapest and the fastest mode for a route', () => {
    const options = compareTransportModes({
      country: japan,
      transportModes,
      dailyBudget: 30,
      planningMode: 'route',
    })
    expect(options.map((o) => o.id)).toEqual(['motorbike', 'bicycle', 'public', 'walking'])
    expect(options.filter((o) => o.isCheapest).map((o) => o.id)).toEqual(['public'])
    expect(options.filter((o) => o.isFastest).map((o) => o.id)).toEqual(['motorbike'])
  })

  it('ranks by distance when the number of days is fixed', () => {
    const options = compareTransportModes({
      country: japan,
      transportModes,
      dailyBudget: 30,
      planningMode: 'time',
      tripDays: 5,
    })
    expect(options.filter((o) => o.isFastest).map((o) => o.id)).toEqual(['motorbike'])
    const walking = options.find((o) => o.id === 'walking')
    expect(walking.canComplete).toBe(false)
    expect(walking.percentOfRoute).toBe(Math.round((walking.reachableDistance / 2800) * 100))
  })
})
