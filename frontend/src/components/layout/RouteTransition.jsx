import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useOutlet } from 'react-router-dom'

// Snapshot only the content region; navigation and authentication stay in the router.
export default function RouteTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const [page, setPage] = useState({ key: location.key, outlet })
  const transition = useRef(null)

  useLayoutEffect(() => {
    if (page.key === location.key) return
    const next = { key: location.key, outlet }
    transition.current?.skipTransition()
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPage(next)
      return
    }
    // Run outside the React commit so flushSync can capture the incoming DOM.
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        transition.current = document.startViewTransition(() => flushSync(() => setPage(next)))
        transition.current.ready.catch(() => {}) // A hidden tab may skip snapshots.
      } catch {
        // Snapshot failure must never prevent navigation.
        setPage(next)
      }
    })
    return () => { cancelled = true }
  }, [location.key, page.key, outlet])

  useLayoutEffect(() => () => transition.current?.skipTransition(), [])

  return <div className="route-content"><div key={page.key} className="route-enter">{page.outlet}</div></div>
}
