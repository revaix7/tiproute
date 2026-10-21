import { describe, it, expect } from 'vitest'
import { distanceBetween, roadDistanceBetween, startEndPoints, ROAD_FACTOR } from './geo'

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
