import { useLayoutEffect, useRef, useState } from 'react'

export default function NavIndicator({ children, route, collapsed, className }) {
  const container = useRef(null)
  const [position, setPosition] = useState(null)
  useLayoutEffect(() => {
    const nav = container.current
    const measure = () => {
      const active = nav.querySelector('.glass-nav-active')
      if (!active) return setPosition(null)
      const bounds = nav.getBoundingClientRect()
      const rect = active.getBoundingClientRect()
      setPosition({ top: rect.top - bounds.top + nav.scrollTop, left: rect.left - bounds.left, width: rect.width, height: rect.height })
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(nav)
    return () => observer?.disconnect()
  }, [route, collapsed, children])
  return <div ref={container} className={`relative ${position ? 'has-nav-indicator' : ''} ${className}`}>
    {position && <div aria-hidden="true" className="nav-indicator" style={{ width: position.width, height: position.height, transform: `translate(${position.left}px, ${position.top}px)` }} />}
    <div className="space-y-6">{children}</div>
  </div>
}
