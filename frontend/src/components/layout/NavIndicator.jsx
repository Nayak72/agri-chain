import { useLayoutEffect, useRef, useState } from 'react'

export default function NavIndicator({ children, route, collapsed, className }) {
  const container = useRef(null)
  const [position, setPosition] = useState(null)

  useLayoutEffect(() => {
    const nav = container.current
    if (!nav) return

    let rafId = null

    const computeAndSet = () => {
      if (!container.current) return
      const active = container.current.querySelector('.glass-nav-active')
      if (!active) {
        setPosition(null)
        return
      }
      const bounds = container.current.getBoundingClientRect()
      const rect = active.getBoundingClientRect()
      const next = {
        top: rect.top - bounds.top + container.current.scrollTop,
        left: rect.left - bounds.left,
        width: rect.width,
        height: rect.height,
      }
      setPosition(prev => {
        if (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev
        }
        return next
      })
    }

    const scheduleMeasure = () => {
      if (typeof requestAnimationFrame !== 'undefined') {
        if (rafId) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(computeAndSet)
      } else {
        computeAndSet()
      }
    }

    computeAndSet()

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null
    observer?.observe(nav)

    return () => {
      if (rafId && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId)
      }
      observer?.disconnect()
    }
  }, [route, collapsed, children])

  return (
    <div ref={container} className={`relative ${position ? 'has-nav-indicator' : ''} ${className}`}>
      {position && (
        <div
          aria-hidden="true"
          className="nav-indicator"
          style={{
            width: position.width,
            height: position.height,
            transform: `translate(${position.left}px, ${position.top}px)`,
          }}
        />
      )}
      <div className="space-y-6">{children}</div>
    </div>
  )
}
