import { useNavigate } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { useCallback } from 'react'
import { reducedMotion } from './scroll'

// Navigate inside a View Transition so the clicked box can glide into the next page.
export function useGo() {
  const navigate = useNavigate()
  return useCallback((to, opts) => {
    const run = () => flushSync(() => navigate(to, opts))
    if (document.startViewTransition && !reducedMotion()) document.startViewTransition(run)
    else navigate(to, opts)
  }, [navigate])
}

export function linkClick(go, to, before) {
  return (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    before?.(e)
    go(to)
  }
}
