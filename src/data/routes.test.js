import { describe, it, expect } from 'vitest'
import { getRouteLines } from './routes'
import { countries } from './countries'

const from = { lat: 30.99, lng: 130.66 }
const to = { lat: 45.52, lng: 141.94 }

const japan = countries.find((c) => c.name === 'Japan')
const japanVia = japan.tipToTip.checkpoints.slice(1, -1)

// Smallest straight distance (in degrees) from a point to any point of a line
function closestDistance(point, line) {
  return Math.min(...line.map(([lat, lng]) => Math.hypot(lat - point.lat, lng - point.lng)))
}

describe('getRouteLines', () => {
  it('returns as many lines as asked for', () => {
    expect(getRouteLines({ from, to, count: 40 })).toHaveLength(40)
    expect(getRouteLines({ from, to, count: 1 })).toHaveLength(1)
    expect(getRouteLines({ from, to, count: 0 })).toEqual([])
  })

  it('starts every line exactly at from and ends it exactly at to', () => {
    for (const via of [[], japanVia]) {
      for (const line of getRouteLines({ from, to, via, count: 40 })) {
        expect(line[0]).toEqual([from.lat, from.lng])
        expect(line[line.length - 1]).toEqual([to.lat, to.lng])
      }
    }
  })

  it('gives each line as a list of [lat, lng] numbers', () => {
    const [line] = getRouteLines({ from, to, via: japanVia, count: 1 })
    expect(line.length).toBeGreaterThan(10)
    for (const point of line) {
      expect(point).toHaveLength(2)
      expect(Number.isFinite(point[0]) && Number.isFinite(point[1])).toBe(true)
    }
  })

  it('makes every line different from the others', () => {
    for (const via of [[], japanVia]) {
      const lines = getRouteLines({ from, to, via, count: 50 })
      const distinct = new Set(lines.map((line) => JSON.stringify(line)))
      expect(distinct.size).toBe(50)
    }
  })

  it('gives the same lines for the same inputs', () => {
    expect(getRouteLines({ from, to, via: japanVia, count: 40 })).toEqual(
      getRouteLines({ from, to, via: japanVia, count: 40 })
    )
  })

  it('keeps the first lines the same when asking for more', () => {
    const few = getRouteLines({ from, to, count: 5 })
    const many = getRouteLines({ from, to, count: 40 })
    expect(many.slice(0, 5)).toEqual(few)
  })

  it('gives other lines for another trip', () => {
    const other = { lat: 31, lng: 130.66 }
    expect(getRouteLines({ from: other, to, count: 1 })).not.toEqual(
      getRouteLines({ from, to, count: 1 })
    )
  })

  it('passes near every checkpoint', () => {
    const backbone = [from, ...japanVia, to]
    const lines = getRouteLines({ from, to, via: japanVia, count: 40 })
    japanVia.forEach((checkpoint, i) => {
      // allowed distance: half of the longer segment next to this checkpoint
      const before = backbone[i]
      const after = backbone[i + 2]
      const allowed =
        0.5 *
        Math.max(
          Math.hypot(checkpoint.lat - before.lat, checkpoint.lng - before.lng),
          Math.hypot(after.lat - checkpoint.lat, after.lng - checkpoint.lng)
        )
      for (const line of lines) {
        expect(closestDistance(checkpoint, line)).toBeLessThan(allowed)
      }
    })
  })

  it('keeps every line close to a straight trip when there are no checkpoints', () => {
    const tripLength = Math.hypot(to.lat - from.lat, to.lng - from.lng)
    for (const line of getRouteLines({ from, to, count: 40 })) {
      for (const [lat, lng] of line) {
        // distance from the straight line from → to
        const cross =
          Math.abs((to.lng - from.lng) * (lat - from.lat) - (to.lat - from.lat) * (lng - from.lng)) /
          tripLength
        expect(cross).toBeLessThan(tripLength * 0.25)
      }
    }
  })

  it('makes a dot, not an error, when start and end are the same point', () => {
    const lines = getRouteLines({ from, to: from, count: 3 })
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      for (const point of line) expect(point).toEqual([from.lat, from.lng])
    }
  })
})
