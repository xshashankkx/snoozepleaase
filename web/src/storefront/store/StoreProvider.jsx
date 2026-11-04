'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useSite } from '../lib/site'
import { lockScroll, unlockScroll } from '../lib/scroll'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const read = (k, d) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d }
}
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

const ageCookie = () => {
  const m = typeof document !== 'undefined' && /(?:^|; )sp_age=([^;]+)/.exec(document.cookie)
  return m ? decodeURIComponent(m[1]) : null
}

const initial = { cart: [], wish: [], user: null, orders: [], address: null, code: '' }

const reducer = (s, a) => {
  switch (a.type) {
    case 'load': return { ...s, ...a.state }
    case 'add': {
      const i = s.cart.findIndex((l) => l.variantId === a.line.variantId)
      const cart = [...s.cart]
      if (i >= 0) cart[i] = { ...cart[i], qty: Math.min(a.line.variant.stock, cart[i].qty + a.qty), variant: a.line.variant }
      else cart.push({ ...a.line, qty: Math.min(a.line.variant.stock, a.qty) })
      return { ...s, cart }
    }
    case 'qty': return { ...s, cart: s.cart.map((l) => (l.variantId === a.variantId ? { ...l, qty: Math.max(1, Math.min(l.variant.stock, a.qty)) } : l)) }
    case 'remove': return { ...s, cart: s.cart.filter((l) => l.variantId !== a.variantId) }
    // The server is the source of truth for price and stock; keep the bag's snapshot in step with it.
    case 'sync': {
      let changed = false
      const cart = s.cart.map((l) => {
        const r = a.report.find((x) => x.variantId === l.variantId)
        if (!r || r.status === 'gone' || r.status === 'soldout') return l
        if (r.price === l.variant.price && r.stock === l.variant.stock && r.qty === l.qty) return l
        changed = true
        return { ...l, qty: r.qty, variant: { ...l.variant, price: r.price, stock: r.stock } }
      })
      return changed ? { ...s, cart } : s
    }
    case 'code': return { ...s, code: a.code }
    case 'wish': return { ...s, wish: s.wish.includes(a.handle) ? s.wish.filter((h) => h !== a.handle) : [...s.wish, a.handle] }
    case 'user': return { ...s, user: a.user }
    case 'order': return { ...s, orders: [a.order, ...s.orders], cart: [], code: '' }
    case 'addr': return { ...s, address: a.address }
    default: return s
  }
}

// What the server says we know about this shopper, from orders saved in this browser.
// It is a demo-level check: real customer history arrives with accounts and real orders.
export function customerHints(orders, ident = {}) {
  const email = (ident.email || '').trim().toLowerCase()
  const phone = (ident.phone || '').replace(/\D/g, '')
  const mine = email || phone
    ? orders.filter((o) => (email && (o.contact?.email || '').toLowerCase() === email) || (phone && (o.contact?.phone || '') === phone))
    : orders
  return { firstOrder: mine.length === 0, usedOfferIds: mine.flatMap((o) => (o.discounts || []).map((d) => String(d.id))) }
}

// A rough local price while the server answers: the bag total with no offers.
function localQuote(lines, method, settings) {
  const subtotal = lines.reduce((t, l) => t + l.variant.price * l.qty, 0)
  const base = method === 'express' ? settings.expressShipping : settings.standardShipping
  const free = method === 'standard' && subtotal >= settings.freeShippingOver
  const shipping = lines.length === 0 || free ? 0 : base
  return {
    subtotal, applied: [], discountTotal: 0, afterDiscount: subtotal, shippingBase: lines.length ? base : 0, shipping, total: subtotal + shipping,
    freeAway: Math.max(0, settings.freeShippingOver - subtotal), count: lines.reduce((t, l) => t + l.qty, 0), code: { entered: null, status: 'none' }, lines: [],
  }
}

// Asks the server what the bag costs (prices, stock, offers and codes are all checked there).
export function useQuote(method = 'standard', ident = null) {
  const { lines, code, orders, user, syncLines } = useStore()
  const site = useSite()
  const customer = useMemo(() => customerHints(orders, ident || { email: user?.email }), [orders, user, ident?.email, ident?.phone])
  const [state, setState] = useState({ q: null, loading: false, error: null })
  const local = useMemo(() => localQuote(lines, method, site.settings), [lines, method, site.settings])
  const key = JSON.stringify([lines.map((l) => [l.handle, l.variantId, l.qty]), code, method, customer])

  useEffect(() => {
    if (!lines.length) { setState({ q: null, loading: false, error: null }); return }
    let dead = false
    setState((s) => ({ ...s, loading: true }))
    const id = setTimeout(async () => {
      try {
        const r = await fetch('/api/storefront/quote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines: lines.map((l) => ({ handle: l.handle, variantId: l.variantId, qty: l.qty })), code, method, customer }),
        })
        const q = await r.json()
        if (dead) return
        if (q.error) setState({ q: null, loading: false, error: q.error })
        else { setState({ q, loading: false, error: null }); syncLines(q.lines) }
      } catch {
        if (!dead) setState({ q: null, loading: false, error: 'We could not check prices just now.' })
      }
    }, 250)
    return () => { dead = true; clearTimeout(id) }
  }, [key])

  const status = Object.fromEntries((state.q?.lines || []).map((l) => [l.variantId, l.status]))
  const unavailable = lines.some((l) => status[l.variantId] === 'gone' || status[l.variantId] === 'soldout')
  return { quote: state.q ?? local, loading: state.loading, fresh: !!state.q, error: state.error, status, unavailable }
}

export function StoreProvider({ children, initialAge = null }) {
  const [s, dispatch] = useReducer(reducer, initial)
  const [hydrated, setHydrated] = useState(false)
  const [ui, setUi] = useState({ cart: false, search: false, menu: false })
  const [toasts, setToasts] = useState([])
  const [age, setAgeState] = useState(initialAge)

  // Browser storage is read after the first render so the server and browser HTML always match.
  useEffect(() => {
    dispatch({ type: 'load', state: { cart: read('sp.cart', []), wish: read('sp.wish', []), user: read('sp.user', null), orders: read('sp.orders', []), address: read('sp.address', null), code: read('sp.code', '') } })
    const c = ageCookie()
    if (c) setAgeState(c)
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) write('sp.cart', s.cart) }, [s.cart, hydrated])
  useEffect(() => { if (hydrated) write('sp.wish', s.wish) }, [s.wish, hydrated])
  useEffect(() => { if (hydrated) write('sp.user', s.user) }, [s.user, hydrated])
  useEffect(() => { if (hydrated) write('sp.orders', s.orders) }, [s.orders, hydrated])
  useEffect(() => { if (hydrated) write('sp.address', s.address) }, [s.address, hydrated])
  useEffect(() => { if (hydrated) write('sp.code', s.code) }, [s.code, hydrated])

  const setAge = useCallback((k) => {
    setAgeState(k)
    // A session cookie: it lasts until the browser closes and lets the server render the right page.
    document.cookie = k ? `sp_age=${encodeURIComponent(k)}; path=/; SameSite=Lax` : 'sp_age=; path=/; max-age=0'
  }, [])

  const lines = s.cart
  const open = useCallback((k, v = true) => setUi((u) => ({ ...u, [k]: v })), [])
  useEffect(() => {
    const locked = ui.cart || ui.search || ui.menu
    if (locked) lockScroll(); else unlockScroll()
    document.documentElement.classList.toggle('is-locked', locked)
  }, [ui])

  const toast = useCallback((msg, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  // The bag keeps a small snapshot of each product so it can show without loading the catalog.
  const addToCart = useCallback((product, variant, qty = 1) => {
    if (!product || !variant) return false
    if (variant.stock <= 0) { toast('That size just sold out.', 'warn'); return false }
    const line = {
      handle: product.handle, variantId: variant.id,
      product: { title: product.title, images: [product.images?.[0]?.card || ''] },
      variant: { size: variant.size, price: variant.price, stock: variant.stock },
    }
    dispatch({ type: 'add', line, qty })
    return true
  }, [toast])

  const api = useMemo(() => ({
    ...s, lines, ui, open, toasts, toast, addToCart, age, setAge, hydrated,
    setQty: (variantId, qty) => dispatch({ type: 'qty', variantId, qty }),
    remove: (variantId) => dispatch({ type: 'remove', variantId }),
    syncLines: (report) => dispatch({ type: 'sync', report }),
    setCode: (code) => dispatch({ type: 'code', code }),
    toggleWish: (handle) => {
      const had = s.wish.includes(handle)
      dispatch({ type: 'wish', handle })
      toast(had ? 'Removed from wishlist' : 'Saved to your wishlist')
    },
    isWished: (h) => s.wish.includes(h),
    signIn: (user) => dispatch({ type: 'user', user }),
    signOut: () => dispatch({ type: 'user', user: null }),
    saveAddress: (address) => dispatch({ type: 'addr', address }),
    // `quote` is the server's answer for exactly what the shopper saw at checkout.
    placeOrder: ({ quote, ...details }) => {
      const order = {
        id: 'SP' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10),
        placed: new Date().toISOString(),
        lines: lines.map((l) => ({ handle: l.handle, title: l.product.title, size: l.variant.size, qty: l.qty, price: l.variant.price, image: l.product.images[0] })),
        totals: { subtotal: quote.subtotal, discount: quote.discountTotal, shipping: quote.shipping, total: quote.total },
        discounts: quote.applied.map((a) => ({ id: a.id, title: a.title, amount: a.amount, code: a.code })),
        ...details,
      }
      dispatch({ type: 'order', order })
      return order
    },
  }), [s, lines, ui, open, toasts, toast, addToCart, age, setAge, hydrated])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
