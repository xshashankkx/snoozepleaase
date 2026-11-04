'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Link, NavLink, useLocation, useNavigate } from '../lib/router'
import { useStore } from '../store/StoreProvider'
import { useSite } from '../lib/site'
import { money, mapProduct, searchProducts } from '../lib/product'
import { IconSearch, IconHeart, IconMenu, IconClose, IconPlus, IconMinus, IconTrash, IconArrow, IconBag } from './Icons'
import { Star, Cloud, Moon } from './Doodles'
import { useGo } from '../lib/useGo'
import { useFocusTrap } from '../lib/hooks'

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`logo ${className}`} aria-label="Snooze Pleaase, home">
      <Image src="/img/logo.webp" alt="" width={1100} height={693} priority sizes="170px" />
    </Link>
  )
}

export function AnnouncementBar() {
  const { announcement } = useSite()
  const bar = announcement.bar
  if (!bar) return null
  const inner = <><span>{bar.text}</span>{bar.url && bar.label && <strong>{bar.label}</strong>}</>
  return (
    <div className="annc" role="region" aria-label="Announcement">
      {bar.url ? <Link to={bar.url}>{inner}</Link> : inner}
    </div>
  )
}

export function Header() {
  const { lines, wish, user, open, ui } = useStore()
  const { nav, announcement } = useSite()
  const tag = announcement.saleTag
  const count = lines.reduce((t, l) => t + l.qty, 0)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  useEffect(() => { open('menu', false) }, [pathname])

  return (
    <header className={`hdr ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="hdr__in">
        <div className="hdr__left">
          <button type="button" className="tool tool--menu" onClick={() => open('menu')} aria-label="Open menu" aria-expanded={ui.menu}><IconMenu /></button>
          {tag && (
            <Link to={tag.url} className="sale-pill">
              <Star className="sale-pill__star" />
              <span>{tag.name.toUpperCase()}</span>{tag.offerText && <><i aria-hidden="true" /><span>{tag.offerText.toUpperCase()}</span></>}
            </Link>
          )}
          <button type="button" className="tool" onClick={() => open('search')} aria-label="Search"><IconSearch /></button>
          <Link to="/wishlist" className="tool tool--wish" aria-label={`Wishlist, ${wish.length} saved`}><IconHeart />{wish.length > 0 && <b>{wish.length}</b>}</Link>
        </div>
        <Logo />
        <div className="hdr__right">
          <nav className="hdr__nav" aria-label="Main">
            {nav.header.map((n) => <NavLink key={n.url} to={n.url}>{n.label}</NavLink>)}
          </nav>
          <div className="hdr__tools">
            <Link to="/account" className="tool tool--text tool--acct">{user ? user.name.split(' ')[0] : 'Account'}</Link>
            <button id="bag-btn" type="button" className="tool tool--text tool--bag" onClick={() => open('cart')} aria-label={`Open bag, ${count} items`}>
              <IconBag className="tool__bagicon" /><span className="tool__bagtext">Bag ({count})</span><b className="tool__count">{count}</b>
            </button>
          </div>
        </div>
      </div>
      <MobileMenu />
    </header>
  )
}

function MobileMenu() {
  const { ui, open, user } = useStore()
  const { nav } = useSite()
  const ref = useRef(null)
  useFocusTrap(ref, ui.menu)
  useEffect(() => {
    if (!ui.menu) return
    const k = (e) => e.key === 'Escape' && open('menu', false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [ui.menu])
  if (!ui.menu) return null
  return (
    <div ref={ref} className="menu" role="dialog" aria-modal="true" aria-label="Menu" data-lenis-prevent>
      <button type="button" className="menu__close tool" onClick={() => open('menu', false)} aria-label="Close menu"><IconClose /></button>
      <Moon className="menu__moon" />
      <Cloud className="menu__cloud" />
      <nav aria-label="Mobile">
        {nav.header.map((n, i) => <Link key={n.url} to={n.url} style={{ '--i': i }}>{n.label}</Link>)}
      </nav>
      <div className="menu__sub">
        <Link to="/account">{user ? 'My account' : 'Sign in'}</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/pages/size-guide">Size guide</Link>
        <Link to="/pages/contact">Contact</Link>
      </div>
    </div>
  )
}

const isExternal = (u) => /^(https?:|mailto:|tel:)/.test(u)

export function Footer() {
  const { nav, settings } = useSite()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('That email looks incomplete. Try name@example.com.')
    if (!agree) return setErr('Please tick the box so we know you are happy to hear from us.')
    setErr(''); setDone(true)
  }
  return (
    <footer className="ftr">
      <div className="ftr__news">
        <Moon className="ftr__moon" />
        <div>
          <h2>Bedtime news, sent softly</h2>
          <p>New prints, restocks and the odd sale. Never loud, never daily.</p>
        </div>
        {done ? (
          <p className="ftr__thanks" role="status">You are on the list. Sweet dreams!</p>
        ) : (
          <form onSubmit={submit} noValidate>
            <label htmlFor="nl-email" className="sr">Email address</label>
            <div className="ftr__field">
              <input id="nl-email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!err} />
              <button type="submit" className="btn btn--yellow">Sign me up</button>
            </div>
            <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>{settings.newsletterConsent}</span></label>
            {err && <p className="field-err" role="alert">{err}</p>}
          </form>
        )}
      </div>
      <div className="ftr__cols">
        {nav.footer.map((col) => (
          <div key={col.heading}>
            <h3>{col.heading}</h3>
            {col.links.map((l) => (isExternal(l.url)
              ? <a key={l.url} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
              : <Link key={l.url} to={l.url}>{l.label}</Link>))}
          </div>
        ))}
        <div>
          <h3>Say hello</h3>
          {settings.email && <a href={`mailto:${settings.email}`}>{settings.email}</a>}
          {settings.instagram && <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">@{settings.instagram}</a>}
          {settings.hours && <span>{settings.hours}</span>}
          <span className="ftr__pay">UPI · Cards · Cash on delivery</span>
        </div>
      </div>
      <div className="ftr__base">
        <Logo className="logo--ftr" />
        <p>{settings.tagline}</p>
        <p>© {new Date().getFullYear()} {settings.brandName}. Made in India.</p>
      </div>
    </footer>
  )
}

export function CartDrawer() {
  const { ui, open, lines, setQty, remove, pricing } = useStore()
  const { settings, announcement } = useSite()
  const go = useGo()
  const closeRef = useRef(null)
  const asideRef = useRef(null)
  useFocusTrap(asideRef, ui.cart)
  const t = pricing('standard')
  const { pathname } = useLocation()
  useEffect(() => { open('cart', false) }, [pathname])
  useEffect(() => {
    if (!ui.cart) return
    closeRef.current?.focus()
    const k = (e) => e.key === 'Escape' && open('cart', false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [ui.cart])
  const pct = Math.min(100, Math.round((t.afterSale / settings.freeShippingOver) * 100))
  const saleName = announcement.saleTag?.name || 'Sale'

  return (
    <>
      <div className={`scrim ${ui.cart ? 'is-on' : ''}`} onClick={() => open('cart', false)} aria-hidden="true" />
      <aside ref={asideRef} className={`drawer ${ui.cart ? 'is-on' : ''}`} role="dialog" aria-modal="true" aria-label="Your bag" aria-hidden={!ui.cart} inert={!ui.cart}>
        <div className="drawer__head">
          <h2>Your bag <span>({t.count})</span></h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={() => open('cart', false)} aria-label="Close bag"><IconClose /></button>
        </div>
        {lines.length === 0 ? (
          <div className="drawer__empty">
            <Cloud className="drawer__cloud" />
            <h3>Your bag is still dreaming</h3>
            <p>Add a nightsuit or co-ord set and it will tuck in right here.</p>
            <Link to="/collections/all" className="btn btn--yellow">Browse the collection</Link>
          </div>
        ) : (
          <>
            <div className="drawer__ship">
              <p>{t.freeAway > 0 ? <>Add <strong>{money(t.freeAway)}</strong> more for free shipping</> : <strong>You have unlocked free shipping!</strong>}</p>
              <div className="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct} aria-label="Progress to free shipping"><i style={{ '--p': pct / 100 }} /></div>
            </div>
            <ul className="drawer__lines" data-lenis-prevent>
              {lines.map((l) => (
                <li key={l.variantId}>
                  <Link to={`/products/${l.handle}`} className="drawer__img"><img src={l.product.images[0]} alt="" /></Link>
                  <div className="drawer__info">
                    <Link to={`/products/${l.handle}`} className="drawer__title">{l.product.title}</Link>
                    <p className="muted">{l.variant.size}</p>
                    <div className="stepper" role="group" aria-label={`Quantity for ${l.product.title}`}>
                      <button type="button" onClick={() => (l.qty > 1 ? setQty(l.variantId, l.qty - 1) : remove(l.variantId))} aria-label="Decrease quantity"><IconMinus width={16} height={16} /></button>
                      <output>{l.qty}</output>
                      <button type="button" onClick={() => setQty(l.variantId, l.qty + 1)} disabled={l.qty >= l.variant.stock} aria-label="Increase quantity"><IconPlus width={16} height={16} /></button>
                    </div>
                    {l.variant.stock <= 5 && <p className="low">Only {l.variant.stock} left in this size</p>}
                  </div>
                  <div className="drawer__price">
                    <strong>{money(l.variant.price * l.qty)}</strong>
                    <button type="button" className="icon-btn" onClick={() => remove(l.variantId)} aria-label={`Remove ${l.product.title}`}><IconTrash width={18} height={18} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer__foot">
              <dl className="sums">
                <div><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
                <div className="sale"><dt>{saleName}</dt><dd>−{money(t.discount)}</dd></div>
                <div><dt>Shipping</dt><dd>{t.shipping === 0 ? 'Free' : money(t.shipping)}</dd></div>
                <div className="total"><dt>Total</dt><dd>{money(t.total)}</dd></div>
              </dl>
              <button type="button" className="btn btn--yellow btn--lg" onClick={() => go('/checkout')}>Checkout <IconArrow width={20} height={20} /></button>
              <button type="button" className="link-btn" onClick={() => open('cart', false)}>Keep shopping</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

export function SearchOverlay() {
  const { ui, open } = useStore()
  const { categories } = useSite()
  const [q, setQ] = useState('')
  const [pool, setPool] = useState(null)
  const input = useRef(null)
  const panel = useRef(null)
  useFocusTrap(panel, ui.search)
  const nav = useNavigate()
  const go = useGo()
  const catLabel = (slug) => categories.find((c) => c.slug === slug)?.label || ''
  const results = useMemo(() => (pool && q.trim().length > 1 ? searchProducts(pool, q, catLabel) : []), [q, pool])
  const { pathname } = useLocation()
  useEffect(() => { open('search', false) }, [pathname])

  // Load the catalog once, the first time search opens.
  useEffect(() => {
    if (!ui.search || pool) return
    fetch('/api/products?limit=200&depth=1&where[_status][equals]=published')
      .then((r) => r.json())
      .then((d) => setPool((d.docs || []).map(mapProduct)))
      .catch(() => setPool([]))
  }, [ui.search, pool])

  useEffect(() => {
    if (!ui.search) return
    setQ('')
    setTimeout(() => input.current?.focus(), 60)
    const k = (e) => e.key === 'Escape' && open('search', false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [ui.search])
  useEffect(() => {
    const k = (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); open('search') } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  if (!ui.search) return null
  const submit = (e) => { e.preventDefault(); if (q.trim()) { open('search', false); nav(`/search?q=${encodeURIComponent(q.trim())}`) } }
  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Search the shop" data-lenis-prevent>
      <div className="search__scrim" onClick={() => open('search', false)} />
      <div ref={panel} className="search__panel">
        <Star className="search__star s1" /><Star className="search__star s2" />
        <form onSubmit={submit} role="search">
          <IconSearch width={28} height={28} />
          <label htmlFor="q" className="sr">Search products</label>
          <input id="q" ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search elephants, co-ords, robes…" autoComplete="off" />
          <button type="button" className="icon-btn" onClick={() => open('search', false)} aria-label="Close search"><IconClose /></button>
        </form>
        {q.trim().length < 2 ? (
          <div className="search__hint">
            <p>Popular tonight</p>
            <div className="chips">
              {['Elephant', 'Co-ord', 'Robe', 'Towel', 'Mango', 'Nightsuit'].map((w) => (
                <button key={w} type="button" className="chip" onClick={() => setQ(w)}>{w}</button>
              ))}
            </div>
          </div>
        ) : !pool ? (
          <p className="search__none">Searching…</p>
        ) : results.length === 0 ? (
          <p className="search__none">Nothing matches “{q}”. Try “elephant”, “co-ord” or “robe”.</p>
        ) : (
          <>
            <ul className="search__list">
              {results.slice(0, 6).map((p) => (
                <li key={p.handle}>
                  <Link to={`/products/${p.handle}`} onClick={(e) => { e.preventDefault(); open('search', false); go(`/products/${p.handle}`) }}>
                    <img src={p.images[0]?.thumb} alt="" />
                    <span><strong>{p.title}</strong><small>{catLabel(p.cat)}</small></span>
                    <em>{money(p.price)}</em>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length > 6 && <button type="button" className="link-btn" onClick={submit}>See all {results.length} results</button>}
          </>
        )}
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div className="toasts" aria-live="polite" role="status">
      {toasts.map((t) => <p key={t.id} className={`toast toast--${t.tone}`}>{t.msg}</p>)}
    </div>
  )
}

const SEED = Array.from({ length: 46 }, (_, i) => {
  const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x) }
  return { x: r(1) * 100, y: r(2) * 100, s: 6 + r(3) * 11, d: r(4) * 5, t: 3 + r(5) * 4 }
})
export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {SEED.map((s, i) => <Star key={i} className="sky__star" style={{ left: s.x.toFixed(3) + '%', top: s.y.toFixed(3) + '%', width: +s.s.toFixed(2), height: +s.s.toFixed(2), animationDelay: s.d.toFixed(2) + 's', animationDuration: s.t.toFixed(2) + 's' }} />)}
    </div>
  )
}
