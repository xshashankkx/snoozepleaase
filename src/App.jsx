import { useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Header, Footer, CartDrawer, SearchOverlay, Toasts } from './components/Shell'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Checkout from './pages/Checkout'
import Info, { NotFound } from './pages/Info'
import { Account, Wishlist, Order } from './pages/Account'
import { setLenis, scrollTop, reducedMotion } from './lib/scroll'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const { pathname } = useLocation()

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
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Navigate to="/collections/all" replace />} />
          <Route path="/collections" element={<Navigate to="/collections/all" replace />} />
          <Route path="/collections/:slug" element={<Shop />} />
          <Route path="/search" element={<Shop mode="search" />} />
          <Route path="/products/:handle" element={<Product />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<Order />} />
          <Route path="/pages/:slug" element={<Info />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <Toasts />
    </>
  )
}
