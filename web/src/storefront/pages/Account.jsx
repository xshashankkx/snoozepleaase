'use client'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from '../lib/router'
import Page from '../components/Page'
import ProductCard from '../components/ProductCard'
import { Moon, Cloud, Star } from '../components/Doodles'
import { useStore } from '../store/StoreProvider'
import { money, mapProduct } from '../lib/product'

export function Wishlist() {
  const { wish, hydrated } = useStore()
  const [items, setItems] = useState(null)

  // Saved handles live in the browser; the products themselves come from the CMS.
  useEffect(() => {
    if (!hydrated) return
    if (!wish.length) { setItems([]); return }
    const handles = wish.map(encodeURIComponent).join(',')
    fetch(`/api/products?where[handle][in]=${handles}&where[_status][equals]=published&limit=60&depth=1`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.docs || []).map(mapProduct)
        setItems(wish.map((h) => list.find((p) => p.handle === h)).filter(Boolean))
      })
      .catch(() => setItems([]))
  }, [wish, hydrated])
  return (
    <Page theme="blue" title="Wishlist">
      <div className="shop wrap">
        <header className="shop__head"><h1 className="h1">Your wishlist</h1><p className="lede">Saved on this device, so you can come back to them.</p></header>
        {items === null ? (
          <p className="lede">Loading your saved styles…</p>
        ) : items.length === 0 ? (
          <div className="empty"><Star className="empty__star" /><h2 className="h2">Nothing saved yet</h2><p>Tap the heart on any box and it will wait for you here.</p><Link to="/collections/all" className="btn btn--yellow">Find something cozy</Link></div>
        ) : (
          <div className="grid grid--3">{items.map((p, i) => <ProductCard key={p.handle} p={p} i={i} />)}</div>
        )}
      </div>
    </Page>
  )
}

export function Account() {
  const { user, signIn, signOut, orders, address, wish, toast } = useStore()
  const [mode, setMode] = useState('in')
  const [f, setF] = useState({ name: '', email: '', pass: '' })
  const [err, setErr] = useState({})
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const v = {}
    if (mode === 'up' && f.name.trim().length < 2) v.name = 'Add your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = 'Enter an email like name@example.com.'
    if (f.pass.length < 6) v.pass = 'Use at least 6 characters.'
    setErr(v)
    if (Object.keys(v).length) return
    signIn({ name: mode === 'up' ? f.name.trim() : f.email.split('@')[0], email: f.email })
    toast(mode === 'up' ? 'Welcome to Snooze Pleaase!' : 'Welcome back!')
  }

  if (user) {
    return (
      <Page title="Account">
        <div className="acct wrap">
          <header className="acct__head">
            <Moon className="acct__moon" />
            <div><h1 className="h1">Hello, {user.name.split(' ')[0]}</h1><p className="muted">{user.email}</p></div>
            <button type="button" className="btn btn--ghost-ink" onClick={() => { signOut(); toast('Signed out') }}>Sign out</button>
          </header>
          <div className="acct__grid">
            <section>
              <h2 className="h3">Your orders</h2>
              {orders.length === 0 ? (
                <p className="muted">No orders yet. <Link to="/collections/all">Start browsing</Link>.</p>
              ) : (
                <ul className="orders">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <Link to={`/order/${o.id}`}>
                        <span className="orders__imgs">{o.lines.slice(0, 3).map((l, i) => <img key={i} src={l.image} alt="" />)}</span>
                        <span><strong>Order {o.id}</strong><small>{new Date(o.placed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.lines.reduce((t, l) => t + l.qty, 0)} items</small></span>
                        <em>{money(o.totals.total)}</em>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2 className="h3">Saved address</h2>
              {address ? <address>{address.name}<br />{address.line1}{address.line2 && <>, {address.line2}</>}<br />{address.city}, {address.state} {address.pin}<br />{address.phone}</address> : <p className="muted">Your address is saved after your first order.</p>}
              <h2 className="h3">Wishlist</h2>
              <p><Link to="/wishlist">{wish.length} saved {wish.length === 1 ? 'style' : 'styles'}</Link></p>
            </section>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page title="Account">
      <div className="auth wrap">
        <div className="auth__card">
          <Cloud className="auth__cloud" />
          <div className="tabs" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={mode === 'in'} onClick={() => { setMode('in'); setErr({}) }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === 'up'} onClick={() => { setMode('up'); setErr({}) }}>Create account</button>
          </div>
          <form onSubmit={submit} noValidate>
            {mode === 'up' && (
              <div className={`fld ${err.name ? 'has-err' : ''}`}><label htmlFor="a-name">Your name</label><input id="a-name" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!err.name} />{err.name && <p className="field-err">{err.name}</p>}</div>
            )}
            <div className={`fld ${err.email ? 'has-err' : ''}`}><label htmlFor="a-email">Email</label><input id="a-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!err.email} />{err.email && <p className="field-err">{err.email}</p>}</div>
            <div className={`fld ${err.pass ? 'has-err' : ''}`}><label htmlFor="a-pass">Password</label><input id="a-pass" type="password" value={f.pass} onChange={set('pass')} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} aria-invalid={!!err.pass} />{err.pass && <p className="field-err">{err.pass}</p>}</div>
            <button type="submit" className="btn btn--yellow btn--lg">{mode === 'up' ? 'Create account' : 'Sign in'}</button>
          </form>
          <p className="muted small">Demo accounts live only in this browser. No password is sent anywhere.</p>
        </div>
      </div>
    </Page>
  )
}

export function Order() {
  const { id } = useParams()
  const { orders, hydrated } = useStore()
  const nav = useNavigate()
  const o = orders.find((x) => x.id === id)
  if (!hydrated) return <Page title="Order"><div className="done wrap" /></Page>
  if (!o) {
    return (
      <Page title="Order">
        <div className="empty wrap"><Cloud className="empty__cloud" /><h1 className="h1">We cannot find that order</h1><p>Demo orders are kept in this browser only.</p><button type="button" className="btn btn--yellow" onClick={() => nav('/collections/all')}>Keep shopping</button></div>
      </Page>
    )
  }
  const eta = new Date(o.placed)
  eta.setDate(eta.getDate() + (o.shipping === 'express' ? 3 : 7))
  return (
    <Page title={`Order ${o.id}`}>
      <div className="done wrap">
        <div className="done__hero">
          <Moon className="done__moon" />
          <h1 className="h1">Order placed. Sweet dreams!</h1>
          <p className="lede">Thank you. This is a demo order, so no email was sent to {o.contact.email}.</p>
          <p className="done__id">Order number <strong>{o.id}</strong></p>
        </div>
        <div className="done__grid">
          <section>
            <h2 className="h3">Your items</h2>
            <ul className="co__list">
              {o.lines.map((l, i) => (
                <li key={i}><img src={l.image} alt="" /><span><strong>{l.title}</strong><small>{l.size} · Qty {l.qty}</small></span><em>{money(l.price * l.qty)}</em></li>
              ))}
            </ul>
            <dl className="sums">
              <div><dt>Subtotal</dt><dd>{money(o.totals.subtotal)}</dd></div>
              {(o.discounts || []).filter((d) => d.amount > 0 && o.totals.discount > 0).map((d) => <div key={d.id} className="sale"><dt>{d.title}{d.code ? ` (${d.code})` : ''}</dt><dd>−{money(d.amount)}</dd></div>)}
              <div><dt>Shipping</dt><dd>{o.totals.shipping === 0 ? 'Free' : money(o.totals.shipping)}</dd></div>
              <div className="total"><dt>Total</dt><dd>{money(o.totals.total)}</dd></div>
            </dl>
          </section>
          <section>
            <h2 className="h3">Delivering to</h2>
            <address>{o.address.name}<br />{o.address.line1}{o.address.line2 && <>, {o.address.line2}</>}<br />{o.address.city}, {o.address.state} {o.address.pin}</address>
            <h2 className="h3">Estimated arrival</h2>
            <p>{eta.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h2 className="h3">Payment</h2>
            <p>{o.payment}</p>
            <div className="done__acts"><Link to="/collections/all" className="btn btn--yellow">Keep shopping</Link><Link to="/account" className="btn btn--ghost-ink">View account</Link></div>
          </section>
        </div>
      </div>
    </Page>
  )
}
