import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router keeps the scroll position between routes, so reset it on every page change
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
