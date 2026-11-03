import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { byHandle } from '../lib/catalog'
import { SHOP } from '../lib/config'
import { lockScroll, unlockScroll } from '../lib/scroll'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const read = (k, d) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch { return d }
}
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

const reducer = (s, a) => {
  switch (a.type) {
    case 'add': {
      const i = s.cart.findIndex((l) => l.variantId === a.variantId)
      const cart = [...s.cart]
      if (i >= 0) cart[i] = { ...cart[i], qty: Math.min(a.max, cart[i].qty + a.qty) }
      else cart.push({ handle: a.handle, variantId: a.variantId, qty: Math.min(a.max, a.qty) })
      return { ...s, cart }
    }
    case 'qty': return { ...s, cart: s.cart.map((l) => (l.variantId === a.variantId ? { ...l, qty: Math.max(1, Math.min(a.max, a.qty)) } : l)) }
    case 'remove': return { ...s, cart: s.cart.filter((l) => l.variantId !== a.variantId) }
    case 'wish': return { ...s, wish: s.wish.includes(a.handle) ? s.wish.filter((h) => h !== a.handle) : [...s.wish, a.handle] }
    case 'user': return { ...s, user: a.user }
    case 'order': return { ...s, orders: [a.order, ...s.orders], cart: [] }
    case 'addr': return { ...s, address: a.address }
    default: return s
  }
}

export function priceCart(lines, method = 'standard') {
  const subtotal = lines.reduce((t, l) => t + l.variant.price * l.qty, 0)
  const discount = Math.round((subtotal * SHOP.sale.percent) / 100)
  const afterSale = subtotal - discount
  const free = afterSale >= SHOP.shipping.freeOver
  const base = method === 'express' ? SHOP.shipping.express : SHOP.shipping.standard
  const shipping = lines.length === 0 ? 0 : free && method === 'standard' ? 0 : base
  return {
    subtotal, discount, afterSale, shipping, total: afterSale + shipping,
    freeAway: Math.max(0, SHOP.shipping.freeOver - afterSale),
    count: lines.reduce((t, l) => t + l.qty, 0),
  }
}

export function StoreProvider({ children }) {
  const [s, dispatch] = useReducer(reducer, null, () => ({
    cart: read('sp.cart', []), wish: read('sp.wish', []), user: read('sp.user', null), orders: read('sp.orders', []), address: read('sp.address', null),
  }))
  const [ui, setUi] = useState({ cart: false, search: false, menu: false })
  const [toasts, setToasts] = useState([])
  // The chosen age stage lasts until the tab closes, so it lives in sessionStorage.
  const [age, setAgeState] = useState(() => {
    try { return sessionStorage.getItem('sp.age') } catch { return null }
  })
  const setAge = useCallback((k) => {
    setAgeState(k)
    try { if (k) sessionStorage.setItem('sp.age', k); else sessionStorage.removeItem('sp.age') } catch { /* private mode */ }
  }, [])

  useEffect(() => write('sp.cart', s.cart), [s.cart])
  useEffect(() => write('sp.wish', s.wish), [s.wish])
  useEffect(() => write('sp.user', s.user), [s.user])
  useEffect(() => write('sp.orders', s.orders), [s.orders])
  useEffect(() => write('sp.address', s.address), [s.address])

  const lines = useMemo(() => s.cart.map((l) => {
    const product = byHandle[l.handle]
    const variant = product?.variants.find((v) => v.id === l.variantId)
    return product && variant ? { ...l, product, variant } : null
  }).filter(Boolean), [s.cart])

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

  const addToCart = useCallback((handle, variantId, qty = 1) => {
    const p = byHandle[handle]
    const v = p?.variants.find((x) => x.id === variantId)
    if (!v) return false
    if (v.stock <= 0) { toast('That size just sold out.', 'warn'); return false }
    dispatch({ type: 'add', handle, variantId, qty, max: v.stock })
    return true
  }, [toast])

  const api = useMemo(() => ({
    ...s, lines, ui, open, toasts, toast, addToCart, age, setAge,
    pricing: (method) => priceCart(lines, method),
    setQty: (variantId, qty) => {
      const l = lines.find((x) => x.variantId === variantId)
      dispatch({ type: 'qty', variantId, qty, max: l?.variant.stock ?? 1 })
    },
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
      const totals = priceCart(lines, details.shipping)
      const order = {
        id: 'SP' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10),
        placed: new Date().toISOString(),
        lines: lines.map((l) => ({ handle: l.handle, title: l.product.title, size: l.variant.size, qty: l.qty, price: l.variant.price, image: l.product.images[0] })),
        totals, ...details,
      }
      dispatch({ type: 'order', order })
      return order
    },
  }), [s, lines, ui, open, toasts, toast, addToCart, age, setAge])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
