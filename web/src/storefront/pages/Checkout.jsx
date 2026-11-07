'use client'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '../lib/router'
import Page from '../components/Page'
import { Cloud, Moon } from '../components/Doodles'
import { IconCheck } from '../components/Icons'
import { useStore, useQuote } from '../store/StoreProvider'
import { CodeBox, SumRows } from '../components/CodeBox'
import { useSite } from '../lib/site'
import { money } from '../lib/product'
import { STATES, checkDetails } from '../../lib/india'

function Field({ id, label, error, children, hint }) {
  return (
    <div className={`fld ${error ? 'has-err' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <p className="field-err" id={`${id}-err`}>{error}</p>}
    </div>
  )
}

// Razorpay's secure payment window. Card and UPI details are typed into it, never into our own page.
const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve(window.Razorpay)
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.async = true
  s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('load')))
  s.onerror = () => reject(new Error('load'))
  document.body.appendChild(s)
})

const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, json: j }
}
const getOrder = (number, token) => fetch(`/api/storefront/order/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`).then((r) => r.json())

export default function Checkout() {
  const { lines, user, address, saveAddress, saveOrder, clearBag, code, hydrated } = useStore()
  const nav = useNavigate()
  const { settings } = useSite()
  const onlineOn = settings.payments?.online
  const [f, setF] = useState(() => ({
    email: user?.email || '', phone: address?.phone || '', name: address?.name || user?.name || '', line1: address?.line1 || '', line2: address?.line2 || '',
    city: address?.city || '', state: address?.state || '', pin: address?.pin || '', ship: 'standard', pay: onlineOn ? 'online' : 'cod', note: '',
  }))
  // Saved details load from browser storage just after the first paint, so fill any empty fields then.
  useEffect(() => {
    if (!hydrated) return
    setF((x) => ({
      ...x, email: x.email || user?.email || '', phone: x.phone || address?.phone || '', name: x.name || address?.name || user?.name || '',
      line1: x.line1 || address?.line1 || '', line2: x.line2 || address?.line2 || '', city: x.city || address?.city || '', state: x.state || address?.state || '', pin: x.pin || address?.pin || '',
    }))
  }, [hydrated])
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState('')       // full-screen message while we talk to the server
  const [paying, setPaying] = useState(false) // Razorpay's window is open
  const [payMsg, setPayMsg] = useState('')
  const summary = useRef(null)
  const resume = useRef(null)                 // an order already started, so a retry reuses it

  // The server prices the bag: catalog prices, stock, offers and codes, for the chosen shipping and shopper.
  const { quote: t, loading, fresh, unavailable, error: quoteError } = useQuote(f.ship, { email: f.email, phone: f.phone })
  const shipOffer = t.applied.find((a) => a.kind === 'shipping')
  const standardFree = !!shipOffer || t.afterDiscount >= settings.freeShippingOver

  // Can we deliver to this pincode, and is cash on delivery possible there?
  const [deliv, setDeliv] = useState(null)
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(f.pin)) { setDeliv(null); return }
    let dead = false
    const id = setTimeout(() => {
      fetch(`/api/storefront/pincode?pin=${f.pin}`).then((r) => r.json())
        .then((d) => { if (!dead) setDeliv({ pin: f.pin, ...d }) })
        .catch(() => { if (!dead) setDeliv({ pin: f.pin, serviceable: null, cod: null }) })
    }, 250)
    return () => { dead = true; clearTimeout(id) }
  }, [f.pin])
  const d = deliv && deliv.pin === f.pin ? deliv : null
  const noDelivery = d?.serviceable === false

  const codTotal = t.total + (settings.codFee || 0)
  const codBlocked = !settings.codEnabled ? 'Not available right now' : settings.codMaxTotal > 0 && codTotal > settings.codMaxTotal ? `Only for orders up to ${money(settings.codMaxTotal)}` : d?.cod === false ? 'Not available for this pincode' : ''
  const onlineBlocked = onlineOn ? '' : 'Not switched on yet'
  // If the chosen way to pay stops being possible, move to the other one.
  useEffect(() => {
    setF((x) => (x.pay === 'cod' && codBlocked && !onlineBlocked ? { ...x, pay: 'online' } : x.pay === 'online' && onlineBlocked && !codBlocked ? { ...x, pay: 'cod' } : x))
  }, [codBlocked, onlineBlocked])
  const codFee = f.pay === 'cod' ? settings.codFee || 0 : 0
  const total = t.total + codFee

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const bind = (k, extra = {}) => ({ id: k, value: f[k], onChange: set(k), 'aria-invalid': !!err[k], 'aria-describedby': err[k] ? `${k}-err` : undefined, ...extra })

  if (lines.length === 0 && !busy && !paying) {
    return (
      <Page title="Checkout">
        <div className="empty wrap"><Cloud className="empty__cloud" /><h1 className="h1">Nothing to check out yet</h1><p>Your bag is empty. Add a set you love and come back.</p><Link to="/collections/all" className="btn btn--yellow">Browse the collection</Link></div>
      </Page>
    )
  }

  const finish = async (number, token) => {
    const order = await getOrder(number, token)
    if (order?.number) saveOrder({ ...order, token })
    clearBag()
    nav(`/order/${number}`, { replace: true })
  }

  const submit = async (e) => {
    e.preventDefault()
    const v = checkDetails(f)
    setErr(v)
    setPayMsg('')
    const keys = Object.keys(v)
    if (!fresh || unavailable || noDelivery) return
    if (keys.length) { document.getElementById(keys[0])?.focus(); summary.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return }
    const addr = { name: f.name, phone: f.phone, line1: f.line1, line2: f.line2, city: f.city, state: f.state, pin: f.pin }
    setBusy('Tucking in your order…')
    try {
      const res = await post('/api/storefront/checkout', {
        lines: lines.map((l) => ({ handle: l.handle, variantId: l.variantId, qty: l.qty })), code, method: f.ship, payment: f.pay,
        contact: { email: f.email, phone: f.phone }, address: addr, note: f.note, expectedTotal: total, resume: resume.current,
      })
      if (!res.ok) {
        if (res.json.fields) setErr(res.json.fields)
        setPayMsg(res.json.error || 'We could not place your order. Please try again.')
        setBusy('')
        return
      }
      const { number, token, mode } = res.json
      saveAddress(addr)
      if (mode === 'cod') { await finish(number, token); return }

      // Online: keep the order findable in this browser, then open the payment window.
      resume.current = { number, token }
      const pending = await getOrder(number, token)
      if (pending?.number) saveOrder({ ...pending, token })
      const Razorpay = await loadRazorpay().catch(() => null)
      if (!Razorpay) { setPayMsg('We could not load the payment window. Check your connection and press Pay to try again.'); setBusy(''); return }
      const rz = new Razorpay({
        key: res.json.razorpay.keyId, amount: res.json.razorpay.amount, currency: 'INR', order_id: res.json.razorpay.orderId,
        name: 'Snooze Pleaase', description: `Order ${number}`, notes: { order: number },
        prefill: { name: f.name, email: f.email, contact: f.phone }, theme: { color: '#0e3dc4' },
        handler: async (r) => {
          setPaying(false)
          setBusy('Confirming your payment…')
          const done = await post('/api/storefront/checkout/verify', { number, token, razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature })
          // Even if our check hiccups, the payment webhook confirms it; the order page keeps checking.
          if (!done.ok) setPayMsg(done.json.error || '')
          await finish(number, token)
        },
        modal: { ondismiss: () => { setPaying(false); setBusy(''); setPayMsg('The payment was not completed. Your bag is saved, so press Pay to try again.') } },
      })
      rz.on('payment.failed', (r) => setPayMsg(r?.error?.description ? `${r.error.description} You can try again.` : 'That payment did not go through. You can try again.'))
      setBusy('')
      setPaying(true)
      rz.open()
    } catch {
      setBusy('')
      setPayMsg('Something went wrong. Please try again.')
    }
  }
  const errKeys = Object.keys(err)

  const payOptions = [
    ['online', 'Pay online', 'UPI, cards, netbanking and wallets', onlineBlocked],
    ['cod', 'Cash on delivery', settings.codFee > 0 ? `Pay when it arrives (${money(settings.codFee)} fee)` : 'Pay when it arrives', codBlocked],
  ]

  return (
    <Page title="Checkout">
      {busy && (
        <div className="placing" role="status" aria-live="polite">
          <Moon className="placing__moon" /><p>{busy}</p>
        </div>
      )}
      <div className="co wrap">
        <h1 className="h1">Checkout</h1>
        {settings.payments?.test && <p className="demo-note"><IconCheck width={18} height={18} /> Test mode: no real money is taken. Use Razorpay's test card or test UPI details.</p>}
        <form className="co__grid" onSubmit={submit} noValidate>
          <div className="co__main">
            {errKeys.length > 0 && <div className="err-sum" ref={summary} role="alert"><strong>Please fix {errKeys.length} {errKeys.length === 1 ? 'thing' : 'things'} to continue:</strong> {errKeys.map((k) => err[k]).join(' ')}</div>}

            <fieldset className="co__sec"><legend>Contact</legend>
              <div className="row2">
                <Field id="email" label="Email" error={err.email}><input type="email" autoComplete="email" {...bind('email')} /></Field>
                <Field id="phone" label="Mobile number" error={err.phone} hint="For delivery updates"><input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} {...bind('phone', { onChange: (e) => setF((x) => ({ ...x, phone: e.target.value.replace(/\D/g, '') })) })} /></Field>
              </div>
            </fieldset>

            <fieldset className="co__sec"><legend>Delivery address</legend>
              <Field id="name" label="Full name" error={err.name}><input autoComplete="name" {...bind('name')} /></Field>
              <Field id="line1" label="House number and street" error={err.line1}><input autoComplete="address-line1" {...bind('line1')} /></Field>
              <Field id="line2" label="Apartment, landmark (optional)"><input autoComplete="address-line2" {...bind('line2')} /></Field>
              <div className="row3">
                <Field id="city" label="City" error={err.city}><input autoComplete="address-level2" {...bind('city')} /></Field>
                <Field id="state" label="State" error={err.state}>
                  <select autoComplete="address-level1" {...bind('state')}><option value="">Select</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
                </Field>
                <Field id="pin" label="Pincode" error={err.pin || (noDelivery ? 'We cannot deliver to this pincode yet.' : '')} hint={d?.serviceable && d.days ? `Delivers in about ${d.days} days` : undefined}>
                  <input inputMode="numeric" maxLength={6} autoComplete="postal-code" {...bind('pin', { onChange: (e) => setF((x) => ({ ...x, pin: e.target.value.replace(/\D/g, '') })) })} />
                </Field>
              </div>
            </fieldset>

            <fieldset className="co__sec"><legend>Shipping</legend>
              <label className={`opt-row ${f.ship === 'standard' ? 'is-on' : ''}`}>
                <input type="radio" name="ship" checked={f.ship === 'standard'} onChange={() => setF((x) => ({ ...x, ship: 'standard' }))} />
                <span><strong>Standard</strong><small>{settings.standardDays} days</small></span>
                <em>{standardFree ? 'Free' : money(settings.standardShipping)}</em>
              </label>
              <label className={`opt-row ${f.ship === 'express' ? 'is-on' : ''}`}>
                <input type="radio" name="ship" checked={f.ship === 'express'} onChange={() => setF((x) => ({ ...x, ship: 'express' }))} />
                <span><strong>Express</strong><small>{settings.expressDays} days</small></span>
                <em>{shipOffer ? 'Free' : money(settings.expressShipping)}</em>
              </label>
            </fieldset>

            <fieldset className="co__sec"><legend>Payment</legend>
              {payOptions.map(([k, a, b, blocked]) => (
                <label key={k} className={`opt-row ${f.pay === k ? 'is-on' : ''} ${blocked ? 'is-off' : ''}`} aria-disabled={!!blocked}>
                  <input type="radio" name="pay" checked={f.pay === k} disabled={!!blocked} onChange={() => setF((x) => ({ ...x, pay: k }))} />
                  <span><strong>{a}</strong><small>{blocked || b}</small></span>
                </label>
              ))}
              {f.pay === 'online' && <p className="muted small">You will pay in Razorpay's secure window. We never see or store your card details.</p>}
              {f.pay === 'cod' && <p className="muted small">We will call or message you on {f.phone || 'your mobile number'} to confirm the order before it ships.</p>}
            </fieldset>
            <Field id="note" label="Gift note (optional)"><textarea rows="2" maxLength={160} {...bind('note')} /></Field>
          </div>

          <aside className="co__sum" aria-label="Order summary">
            <h2>Order summary</h2>
            <ul>
              {lines.map((l) => (
                <li key={l.variantId}>
                  <span className="co__thumb"><img src={l.product.images[0]} alt="" /><b>{l.qty}</b></span>
                  <span><strong>{l.product.title}</strong><small>{l.variant.size}</small></span>
                  <em>{money(l.variant.price * l.qty)}</em>
                </li>
              ))}
            </ul>
            <CodeBox quote={t} loading={loading} />
            <dl className="sums">
              <SumRows quote={t} />
              {codFee > 0 && <div><dt>Cash on delivery fee</dt><dd>{money(codFee)}</dd></div>}
              <div className="total"><dt>Total</dt><dd>{money(total)}</dd></div>
            </dl>
            {unavailable && <p className="field-err" role="alert">Something in your bag is no longer available. Open your bag to remove it.</p>}
            {quoteError && <p className="field-err" role="alert">{quoteError}</p>}
            {payMsg && <p className="field-err" role="alert">{payMsg}</p>}
            <button type="submit" className="btn btn--yellow btn--lg" disabled={!!busy || paying || !fresh || loading || unavailable || noDelivery || (f.pay === 'online' && !!onlineBlocked)}>{f.pay === 'cod' ? 'Place order' : `Pay ${money(total)}`}</button>
            <p className="muted small">By placing your order you agree to our <Link to="/pages/privacy-policy">privacy policy</Link>.</p>
          </aside>
        </form>
      </div>
    </Page>
  )
}
