'use client'
import { useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { reducedMotion } from './scroll'

// Navigate inside a View Transition so the clicked box can glide into the next page.
// The transition waits until the new route has actually rendered (see ViewTransitionGate).
let pending = null

export function useGo() {
  const router = useRouter()
  return useCallback((to, opts) => {
    const run = () => (opts?.replace ? router.replace(to) : router.push(to))
    if (typeof document !== 'undefined' && document.startViewTransition && !reducedMotion()) {
      document.startViewTransition(() => new Promise((resolve) => {
        pending = resolve
        run()
        setTimeout(() => { if (pending === resolve) { pending = null; resolve() } }, 2000)
      }))
    } else run()
  }, [router])
}

export function ViewTransitionGate() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pending) return
    const done = pending
    pending = null
    requestAnimationFrame(() => requestAnimationFrame(() => done()))
  }, [pathname])
  return null
}

export function linkClick(go, to, before) {
  return (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    before?.(e)
    go(to)
  }
}
