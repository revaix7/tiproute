import { describe, it, expect } from 'vitest'
import { distanceBetween, roadDistanceBetween, startEndPoints, tripMapPoints, ROAD_FACTOR } from './geo'

const london = { lat: 51.5074, lng: -0.1278 }
const paris = { lat: 48.8566, lng: 2.3522 }

describe('distanceBetween', () => {
  it('measures a known straight distance', () => {
    // London to Paris is about 344 km in a straight line
    expect(distanceBetween(london, paris)).toBeCloseTo(344, -1)
  })

  it('is 0 for the same point and the same both ways', () => {
    expect(distanceBetween(london, london)).toBe(0)
    expect(distanceBetween(london, paris)).toBeCloseTo(distanceBetween(paris, london), 9)
  })

  it('handles longitudes past 180 from a repeated copy of the world map', () => {
    const tokyo = { lat: 35.68, lng: 139.69 }
    const tokyoNextWorld = { lat: 35.68, lng: 139.69 + 360 }
    expect(distanceBetween(london, tokyoNextWorld)).toBeCloseTo(distanceBetween(london, tokyo), 6)
  })
})

describe('roadDistanceBetween', () => {
  it('is the straight distance times 1.3', () => {
    expect(ROAD_FACTOR).toBe(1.3)
    expect(roadDistanceBetween(london, paris)).toBeCloseTo(distanceBetween(london, paris) * 1.3, 9)
  })
})

describe('startEndPoints', () => {
  it('labels the start and the end', () => {
    const points = startEndPoints({ ...london, name: 'London' }, { ...paris, name: 'Paris' })
    expect(points.map((p) => p.label)).toEqual(['Start: London', 'End: Paris'])
    expect(points[0]).toMatchObject(london)
  })

  it('gives no points when one is missing', () => {
    expect(startEndPoints(null, paris)).toEqual([])
    expect(startEndPoints(london, undefined)).toEqual([])
  })
})

describe('tripMapPoints', () => {
  const start = { ...london, name: 'London' }
  const end = { ...paris, name: 'Paris' }
  const calais = { lat: 50.95, lng: 1.86, name: 'Calais' }

  it('shows only the start and the end of a finished trip', () => {
    const points = tripMapPoints({ start, end, canComplete: true, reachableCheckpoint: end })
    expect(points.map((p) => p.label)).toEqual(['Start: London', 'End: Paris'])
  })

  it('adds a hollow point where an unfinished trip stops, and keeps the real end', () => {
    const points = tripMapPoints({ start, end, canComplete: false, reachableCheckpoint: calais })
    expect(points.map((p) => p.label)).toEqual(['Start: London', 'End: Paris', 'You reach: Calais'])
    expect(points[2]).toMatchObject({ lat: calais.lat, lng: calais.lng, hollow: true })
    expect(points[0].hollow).toBeUndefined()
  })

  it('puts the start and reach labels on different sides so they do not cover each other', () => {
    // Calais is south and east of London
    const points = tripMapPoints({ start, end, canComplete: false, reachableCheckpoint: calais })
    expect(points[0].labelDirection).toBe('top')
    expect(points[2].labelDirection).toBe('right')
    // From Paris, Calais is north and west
    const fromParis = tripMapPoints({ start: end, end: start, canComplete: false, reachableCheckpoint: calais })
    expect(fromParis[0].labelDirection).toBe('bottom')
    expect(fromParis[2].labelDirection).toBe('left')
  })

  it('adds no extra point when an unfinished trip never leaves the start', () => {
    const points = tripMapPoints({ start, end, canComplete: false, reachableCheckpoint: start })
    expect(points).toHaveLength(2)
  })

  it('gives no points without a trip', () => {
    expect(tripMapPoints(undefined)).toEqual([])
  })
})
