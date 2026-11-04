'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnnouncementBar, Header, Footer, CartDrawer, SearchOverlay, Toasts } from './Shell'
import { ViewTransitionGate } from '../lib/useGo'
import { setLenis, scrollTop, reducedMotion } from '../lib/scroll'

gsap.registerPlugin(ScrollTrigger)

// Smooth scrolling, scroll-to-top on every new page, and the pieces that sit on every page.
export default function AppShell({ children, preview }) {
  const pathname = usePathname()

  useEffect(() => {
    if (reducedMotion()) return
    const lenis = new Lenis({ duration: 1.05, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 0.95 })
    setLenis(lenis)
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(tick); lenis.destroy(); setLenis(null) }
  }, [])

  useEffect(() => {
    scrollTop()
    const id = setTimeout(() => ScrollTrigger.refresh(), 200)
    return () => clearTimeout(id)
  }, [pathname])

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      {preview && (
        <div className="preview-bar" role="status">
          Preview mode: you are seeing saved drafts.{' '}
          <a href="/api/preview/exit">Exit preview</a>
        </div>
      )}
      <AnnouncementBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <Toasts />
      <ViewTransitionGate />
    </>
  )
}
