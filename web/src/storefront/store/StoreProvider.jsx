'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { useSite, SALE_PERCENT } from '../lib/site'
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

const initial = { cart: [], wish: [], user: null, orders: [], address: null }

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
    case 'wish': return { ...s, wish: s.wish.includes(a.handle) ? s.wish.filter((h) => h !== a.handle) : [...s.wish, a.handle] }
    case 'user': return { ...s, user: a.user }
    case 'order': return { ...s, orders: [a.order, ...s.orders], cart: [] }
    case 'addr': return { ...s, address: a.address }
    default: return s
  }
}

export function priceCart(lines, method = 'standard', settings = {}, percent = SALE_PERCENT) {
  const freeOver = settings.freeShippingOver ?? 1999
  const standard = settings.standardShipping ?? 79
  const express = settings.expressShipping ?? 149
  const subtotal = lines.reduce((t, l) => t + l.variant.price * l.qty, 0)
  const discount = Math.round((subtotal * percent) / 100)
  const afterSale = subtotal - discount
  const free = afterSale >= freeOver
  const base = method === 'express' ? express : standard
  const shipping = lines.length === 0 ? 0 : free && method === 'standard' ? 0 : base
  return {
    subtotal, discount, afterSale, shipping, total: afterSale + shipping,
    freeAway: Math.max(0, freeOver - afterSale),
    count: lines.reduce((t, l) => t + l.qty, 0),
  }
}

export function StoreProvider({ children, initialAge = null }) {
  const site = useSite()
  const [s, dispatch] = useReducer(reducer, initial)
  const [hydrated, setHydrated] = useState(false)
  const [ui, setUi] = useState({ cart: false, search: false, menu: false })
  const [toasts, setToasts] = useState([])
  const [age, setAgeState] = useState(initialAge)

  // Browser storage is read after the first render so the server and browser HTML always match.
  useEffect(() => {
    dispatch({ type: 'load', state: { cart: read('sp.cart', []), wish: read('sp.wish', []), user: read('sp.user', null), orders: read('sp.orders', []), address: read('sp.address', null) } })
    const c = ageCookie()
    if (c) setAgeState(c)
    setHydrated(true)
  }, [])
  useEffect(() => { if (hydrated) write('sp.cart', s.cart) }, [s.cart, hydrated])
  useEffect(() => { if (hydrated) write('sp.wish', s.wish) }, [s.wish, hydrated])
  useEffect(() => { if (hydrated) write('sp.user', s.user) }, [s.user, hydrated])
  useEffect(() => { if (hydrated) write('sp.orders', s.orders) }, [s.orders, hydrated])
  useEffect(() => { if (hydrated) write('sp.address', s.address) }, [s.address, hydrated])

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

  // The cart keeps a small snapshot of each product so it can show without loading the catalog.
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
    pricing: (method) => priceCart(lines, method, site?.settings),
    setQty: (variantId, qty) => dispatch({ type: 'qty', variantId, qty }),
    remove: (variantId) => dispatch({ type: 'remove', variantId }),
    toggleWish: (handle) => {
      const had = s.wish.includes(handle)
      dispatch({ type: 'wish', handle })
      toast(had ? 'Removed from wishlist' : 'Saved to your wishlist')
    },
    isWished: (h) => s.wish.includes(h),
    signIn: (user) => dispatch({ type: 'user', user }),
    signOut: () => dispatch({ type: 'user', user: null }),
    saveAddress: (address) => dispatch({ type: 'addr', address }),
    placeOrder: (details) => {
      const totals = priceCart(lines, details.shipping, site?.settings)
      const order = {
        id: 'SP' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10),
        placed: new Date().toISOString(),
        lines: lines.map((l) => ({ handle: l.handle, title: l.product.title, size: l.variant.size, qty: l.qty, price: l.variant.price, image: l.product.images[0] })),
        totals, ...details,
      }
      dispatch({ type: 'order', order })
      return order
    },
  }), [s, lines, ui, open, toasts, toast, addToCart, age, setAge, hydrated, site])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
