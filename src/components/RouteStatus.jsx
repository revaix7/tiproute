// The line under a map that says how the road routes are doing
export default function RouteStatus({ status, routes, onRetry }) {
  // Keep the line's space while there is nothing to say, so the page doesn't jump
  if (status === 'idle') return <p className="route-status" aria-hidden="true">&nbsp;</p>
  if (status === 'loading') return <p className="route-status">Finding routes by road…</p>
  if (status === 'none') {
    return (
      <p className="route-status warning">
        No route by road between these points. There may be a sea in the way, or a point far
        from any road.
      </p>
    )
  }
  if (status === 'error') {
    return (
      <p className="route-status warning">
        Couldn't load routes from the routing server.{' '}
        <button className="link-button" onClick={onRetry}>
          Try again
        </button>
      </p>
    )
  }
  const shortest = Math.round(routes[0].distanceKm).toLocaleString()
  return (
    <p className="route-status">
      {routes.length === 1 ? '1 route' : `${routes.length} routes`} by road, the shortest is{' '}
      {shortest} km
    </p>
  )
}
