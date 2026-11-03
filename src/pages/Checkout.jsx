import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Page from '../components/Page'
import { Cloud, Moon } from '../components/Doodles'
import { IconCheck } from '../components/Icons'
import { useStore } from '../store/StoreProvider'
import { SHOP } from '../lib/config'
import { money, img } from '../lib/catalog'

const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry']

const luhn = (s) => {
  let sum = 0, alt = false
  for (let i = s.length - 1; i >= 0; i--) { let n = +s[i]; if (alt) { n *= 2; if (n > 9) n -= 9 } sum += n; alt = !alt }
  return sum % 10 === 0
}

function validate(f) {
  const e = {}
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter an email like name@example.com.'
  if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = 'Enter a 10-digit mobile number.'
  if (f.name.trim().length < 2) e.name = 'Tell us who the parcel is for.'
  if (f.line1.trim().length < 5) e.line1 = 'Add the house number and street.'
  if (f.city.trim().length < 2) e.city = 'Add your city.'
  if (!f.state) e.state = 'Choose a state.'
  if (!/^[1-9]\d{5}$/.test(f.pin)) e.pin = 'Enter a valid 6-digit pincode.'
  if (f.pay === 'upi' && !/^[\w.-]{2,}@[a-z]{2,}$/i.test(f.upi)) e.upi = 'Enter a UPI ID like name@bank.'
  if (f.pay === 'card') {
    const n = f.card.replace(/\s/g, '')
    if (!/^\d{13,19}$/.test(n) || !luhn(n)) e.card = 'That card number does not look right.'
    if (!/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(f.exp)) e.exp = 'Use MM/YY.'
    if (!/^\d{3,4}$/.test(f.cvv)) e.cvv = '3 or 4 digits.'
  }
  return e
}

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

export default function Checkout() {
  const { lines, pricing, user, address, saveAddress, placeOrder } = useStore()
  const nav = useNavigate()
  const [f, setF] = useState(() => ({
    email: user?.email || '', phone: address?.phone || '', name: address?.name || user?.name || '', line1: address?.line1 || '', line2: address?.line2 || '',
    city: address?.city || '', state: address?.state || '', pin: address?.pin || '', ship: 'standard', pay: 'upi', upi: '', card: '', exp: '', cvv: '', note: '',
  }))
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const summary = useRef(null)
  const t = pricing(f.ship)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const bind = (k, extra = {}) => ({ id: k, value: f[k], onChange: set(k), 'aria-invalid': !!err[k], 'aria-describedby': err[k] ? `${k}-err` : undefined, ...extra })

  if (lines.length === 0 && !busy) {
    return (
      <Page title="Checkout">
        <div className="empty wrap"><Cloud className="empty__cloud" /><h1 className="h1">Nothing to check out yet</h1><p>Your bag is empty. Add a set you love and come back.</p><Link to="/collections/all" className="btn btn--yellow">Browse the collection</Link></div>
      </Page>
    )
  }

  const submit = (e) => {
    e.preventDefault()
    const v = validate(f)
    setErr(v)
    const keys = Object.keys(v)
    if (keys.length) { document.getElementById(keys[0])?.focus(); summary.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return }
    setBusy(true)
    setTimeout(() => {
      const addr = { name: f.name, phone: f.phone, line1: f.line1, line2: f.line2, city: f.city, state: f.state, pin: f.pin }
      saveAddress(addr)
      const order = placeOrder({
        contact: { email: f.email, phone: f.phone }, address: addr, shipping: f.ship, note: f.note,
        payment: f.pay === 'upi' ? `UPI (${f.upi})` : f.pay === 'card' ? `Card ending ${f.card.replace(/\s/g, '').slice(-4)}` : 'Cash on delivery',
      })
      nav(`/order/${order.id}`, { replace: true })
    }, 1800)
  }
  const errKeys = Object.keys(err)

  return (
    <Page title="Checkout">
      {busy && (
        <div className="placing" role="status" aria-live="polite">
          <Moon className="placing__moon" /><p>Tucking in your order…</p>
        </div>
      )}
      <div className="co wrap">
        <h1 className="h1">Checkout</h1>
        <p className="demo-note"><IconCheck width={18} height={18} /> This is a demo checkout. No payment is taken and nothing is shipped.</p>
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
                <Field id="pin" label="Pincode" error={err.pin}><input inputMode="numeric" maxLength={6} autoComplete="postal-code" {...bind('pin', { onChange: (e) => setF((x) => ({ ...x, pin: e.target.value.replace(/\D/g, '') })) })} /></Field>
              </div>
            </fieldset>

            <fieldset className="co__sec"><legend>Shipping</legend>
              <label className={`opt-row ${f.ship === 'standard' ? 'is-on' : ''}`}>
                <input type="radio" name="ship" checked={f.ship === 'standard'} onChange={() => setF((x) => ({ ...x, ship: 'standard' }))} />
                <span><strong>Standard</strong><small>{SHOP.shipping.standardDays} days</small></span>
                <em>{pricing('standard').shipping === 0 ? 'Free' : money(SHOP.shipping.standard)}</em>
              </label>
              <label className={`opt-row ${f.ship === 'express' ? 'is-on' : ''}`}>
                <input type="radio" name="ship" checked={f.ship === 'express'} onChange={() => setF((x) => ({ ...x, ship: 'express' }))} />
                <span><strong>Express</strong><small>{SHOP.shipping.expressDays} days</small></span>
                <em>{money(SHOP.shipping.express)}</em>
              </label>
            </fieldset>

            <fieldset className="co__sec"><legend>Payment</legend>
              {[['upi', 'UPI', 'Pay with any UPI app'], ['card', 'Credit or debit card', 'Visa, Mastercard, RuPay'], ['cod', 'Cash on delivery', 'Pay when it arrives']].map(([k, a, b]) => (
                <div key={k}>
                  <label className={`opt-row ${f.pay === k ? 'is-on' : ''}`}>
                    <input type="radio" name="pay" checked={f.pay === k} onChange={() => setF((x) => ({ ...x, pay: k }))} />
                    <span><strong>{a}</strong><small>{b}</small></span>
                  </label>
                  {f.pay === k && k === 'upi' && <div className="opt-extra"><Field id="upi" label="UPI ID" error={err.upi}><input autoComplete="off" placeholder="name@bank" {...bind('upi')} /></Field></div>}
                  {f.pay === k && k === 'card' && (
                    <div className="opt-extra">
                      <Field id="card" label="Card number" error={err.card}><input inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" maxLength={23} {...bind('card', { onChange: (e) => setF((x) => ({ ...x, card: e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim() })) })} /></Field>
                      <div className="row2">
                        <Field id="exp" label="Expiry" error={err.exp}><input autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} {...bind('exp', { onChange: (e) => setF((x) => ({ ...x, exp: e.target.value.replace(/[^\d]/g, '').replace(/^(\d{2})(\d)/, '$1/$2') })) })} /></Field>
                        <Field id="cvv" label="CVV" error={err.cvv}><input inputMode="numeric" autoComplete="cc-csc" maxLength={4} {...bind('cvv', { onChange: (e) => setF((x) => ({ ...x, cvv: e.target.value.replace(/\D/g, '') })) })} /></Field>
                      </div>
                      <small className="muted">Demo only: card details are checked for format and never stored.</small>
                    </div>
                  )}
                </div>
              ))}
            </fieldset>
            <Field id="note" label="Gift note (optional)"><textarea rows="2" maxLength={160} {...bind('note')} /></Field>
          </div>

          <aside className="co__sum" aria-label="Order summary">
            <h2>Order summary</h2>
            <ul>
              {lines.map((l) => (
                <li key={l.variantId}>
                  <span className="co__thumb"><img src={img(l.product.images[0])} alt="" /><b>{l.qty}</b></span>
                  <span><strong>{l.product.title}</strong><small>{l.variant.size}</small></span>
                  <em>{money(l.variant.price * l.qty)}</em>
                </li>
              ))}
            </ul>
            <dl className="sums">
              <div><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
              <div className="sale"><dt>{SHOP.sale.label} ({SHOP.sale.percent}% off)</dt><dd>−{money(t.discount)}</dd></div>
              <div><dt>Shipping</dt><dd>{t.shipping === 0 ? 'Free' : money(t.shipping)}</dd></div>
              <div className="total"><dt>Total</dt><dd>{money(t.total)}</dd></div>
            </dl>
            <button type="submit" className="btn btn--yellow btn--lg" disabled={busy}>{f.pay === 'cod' ? 'Place order' : `Pay ${money(t.total)}`}</button>
            <p className="muted small">By placing your order you agree to our <Link to="/pages/privacy-policy">privacy policy</Link>.</p>
          </aside>
        </form>
      </div>
    </Page>
  )
}
