import { useEffect, useMemo, useState } from 'react'
import { fetchRoadRoutes } from '../data/roadRoutes'

// Wait this long after the points change before asking the server, so clicking around
// the map doesn't send a request for every click
const WAIT_MS = 400

// Road routes for the map. status is 'idle' (no points yet), 'loading', 'ok' (with
// routes, shortest first), 'none' (no route by road) or 'error'; retry asks again.
export function useRoadRoutes({ from, to, via, transportId }) {
  const [result, setResult] = useState({ key: null, status: 'idle', routes: [] })
  const [attempt, setAttempt] = useState(0)

  // One text key for the inputs, so new objects with the same points don't ask again
  const key = from && to ? JSON.stringify([from.lat, from.lng, to.lat, to.lng, via ?? [], transportId]) : null
  const inputs = useMemo(() => ({ from, to, via, transportId }), [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const found = await fetchRoadRoutes({ ...inputs, signal: controller.signal })
        setResult({ key, status: found.status, routes: found.routes ?? [] })
      } catch (error) {
        if (error?.name !== 'AbortError') setResult({ key, status: 'error', routes: [] })
      }
    }, WAIT_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [key, inputs, attempt])

  // Anything worked out for older points is out of date
  const current = result.key === key
  return {
    status: !key ? 'idle' : current ? result.status : 'loading',
    routes: current ? result.routes : [],
    retry: () => {
      setResult({ key: null, status: 'idle', routes: [] })
      setAttempt((n) => n + 1)
    },
  }
}
