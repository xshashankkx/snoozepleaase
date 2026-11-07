// @ts-nocheck
// End-to-end check of ordering, payment and shipping against a SANDBOX copy of the site (npm run dev:sandbox),
// which talks to a pretend Razorpay and Shiprocket started here. No real accounts or money are involved.
// Run with DISABLE_2FA=true so the staff-permission checks can use a throwaway Owner account.
import 'dotenv/config'
import crypto from 'node:crypto'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { startMock, KEY_SECRET, HOOK_SECRET, SR_TOKEN } from './mock-providers'

const BASE = process.env.CHECK_BASE || 'http://localhost:3100'
let pass = 0, fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`)
}
const yes = (name: string, cond: unknown) => eq(name, !!cond, true)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const hmac = (secret: string, s: string) => crypto.createHmac('sha256', secret).update(s).digest('hex')

async function main() {
  // Status changes made through the local API run their hooks in THIS process, so it needs the same
  // sandbox settings the site has (in real use the admin runs inside the site).
  Object.assign(process.env, {
    SHIPROCKET_EMAIL: 'api@example.test', SHIPROCKET_PASSWORD: 'sandbox', SHIPROCKET_PICKUP_LOCATION: 'Primary', SHIPROCKET_PICKUP_PINCODE: '400001',
    SHIPROCKET_API_BASE: 'http://localhost:4010/sr', SHIPROCKET_AUTO_AWB: 'true',
  })
  const mock = await startMock()
  const payload = await getPayload({ config })
  const tag = Date.now().toString(36)
  const email = (n: string) => `${n}-${tag}@check.example.test`
  const created: any = { users: [], offers: [] }
  let ipN = 0
  const call = async (path: string, body?: any, init: any = {}) => {
    const r = await fetch(`${BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': init.ip || `10.1.${++ipN}.1`, ...(init.headers || {}) },
      body: body === undefined ? undefined : (init.raw ?? JSON.stringify(body)),
    })
    return { status: r.status, json: await r.json().catch(() => ({})) }
  }

  const prods = (await payload.find({ collection: 'products', where: { _status: { equals: 'published' } }, limit: 100, depth: 0 })).docs as any[]
  const p = prods.find((x) => x.handle === 'florida-blue-co-ord-set')!
  const v = p.variants.find((x: any) => x.stock >= 5)!
  const lines = [{ handle: p.handle, variantId: v.id, qty: 1 }]
  const addr = { name: 'Check Buyer', line1: '12 Test Street', line2: '', city: 'Bengaluru', state: 'Karnataka', pin: '560001' }
  const body = (extra: any = {}) => ({ lines, method: 'standard', payment: 'cod', contact: { email: email('a'), phone: '9876543210' }, address: addr, note: 'hello', ...extra })
  const quote = (await call('/api/storefront/quote', { lines })).json
  const price = quote.total

  const dbOrder = async (number: string) => (await payload.find({ collection: 'orders', where: { number: { equals: number } }, limit: 1, depth: 0 })).docs[0] as any
  const staff = async () => {
    const u: any = await payload.create({ collection: 'users', data: { email: email('staff'), password: 'Check-pass-123!', name: 'Check Staff', role: 'owner' } })
    created.users.push(u.id)
    return { ...u, collection: 'users' }
  }

  try {
    // ---------- pincode check ----------
    let r = await call('/api/storefront/pincode?pin=560001')
    eq('a reachable pincode is serviceable, with days and cash on delivery', [r.json.serviceable, r.json.days, r.json.cod], [true, 4, true])
    r = await call('/api/storefront/pincode?pin=999999')
    eq('an unreachable pincode is refused', [r.json.serviceable, r.json.cod], [false, false])
    r = await call('/api/storefront/pincode?pin=700099')
    eq('a pincode with delivery but no cash on delivery', [r.json.serviceable, r.json.cod], [true, false])
    eq('a malformed pincode is rejected', (await call('/api/storefront/pincode?pin=12')).status, 400)

    // ---------- checkout validation ----------
    r = await call('/api/storefront/checkout', body({ contact: { email: 'nope', phone: '12' }, address: { ...addr, pin: '5' } }))
    eq('bad details are listed by field', [r.status, r.json.code, Object.keys(r.json.fields || {}).sort()], [400, 'details', ['email', 'phone', 'pin']])
    r = await call('/api/storefront/checkout', body({ lines: [] }))
    eq('an empty bag is refused', [r.status, r.json.code], [400, 'empty'])
    r = await call('/api/storefront/checkout', body({ lines: [{ handle: p.handle, variantId: 'nope', qty: 1 }] }))
    eq('a gone item stops the order', [r.status, r.json.code], [409, 'stock'])
    r = await call('/api/storefront/checkout', body({ expectedTotal: price - 50 }))
    eq('a changed price asks the shopper to review', [r.status, r.json.code], [409, 'price'])
    r = await call('/api/storefront/checkout', body({ address: { ...addr, pin: '999999' } }))
    eq('an undeliverable pincode is refused', [r.status, r.json.code], [400, 'pincode'])
    r = await call('/api/storefront/checkout', body({ address: { ...addr, pin: '700099' } }))
    eq('cash on delivery is refused where the courier cannot do it', [r.status, r.json.code], [400, 'pincode'])

    // ---------- cash on delivery ----------
    const settings: any = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    created.prevCod = { codEnabled: settings.codEnabled ?? null, codMaxTotal: settings.codMaxTotal ?? null, codFee: settings.codFee ?? null }
    await payload.updateGlobal({ slug: 'site-settings', data: { codEnabled: true, codMaxTotal: 5000, codFee: 40 } })
    // The site caches settings only for display; checkout reads them fresh.
    r = await call('/api/storefront/checkout', body({ lines: [{ ...lines[0], price: 1, title: 'x' }], expectedTotal: price + 40 }))
    eq('cash on delivery order is placed, a browser-sent price is ignored', [r.status, r.json.mode, r.json.total], [200, 'cod', price + 40])
    const cod = await dbOrder(r.json.number)
    const codToken = r.json.token
    eq('the saved order matches the server price and waits for confirmation', [cod.status, cod.paymentStatus, cod.totals.codFee, cod.totals.total, cod.lines[0].price], ['awaiting_confirmation', 'cod', 40, price + 40, v.price])
    yes('the saved order keeps SKU and weight for shipping', cod.lines[0].sku && cod.lines[0].weightGrams != null)
    yes('the contact email is stored lowercase and the token is long', cod.contact.email === cod.contact.email.toLowerCase() && codToken.length >= 40)

    r = await call(`/api/storefront/order/${cod.number}?t=${codToken}`)
    eq('the shopper can read their order with the private token', [r.status, r.json.number, 'accessToken' in r.json], [200, cod.number, false])
    eq('a wrong token cannot read it', (await call(`/api/storefront/order/${cod.number}?t=${'0'.repeat(48)}`)).status, 404)
    eq('no token cannot read it', (await call(`/api/storefront/order/${cod.number}`)).status, 404)
    const rest = await fetch(`${BASE}/api/orders`)
    eq('the orders API is closed to the public', rest.status === 401 || rest.status === 403, true)

    if (v.stock < 20) {
      r = await call('/api/storefront/checkout', body({ expectedTotal: price + 40, lines: [{ ...lines[0], qty: 20 }] }))
      eq('quantity beyond stock is refused', [r.status, r.json.code], [409, 'stock'])
    }

    await payload.updateGlobal({ slug: 'site-settings', data: { codMaxTotal: price } })
    r = await call('/api/storefront/checkout', body({ expectedTotal: price + 40 }))
    eq('cash on delivery above the limit is refused', [r.status, r.json.code], [400, 'cod'])
    await payload.updateGlobal({ slug: 'site-settings', data: { codEnabled: false, codMaxTotal: 5000 } })
    r = await call('/api/storefront/checkout', body({ expectedTotal: price + 40 }))
    eq('cash on delivery switched off in settings is refused', [r.status, r.json.code], [400, 'cod'])
    await payload.updateGlobal({ slug: 'site-settings', data: { codEnabled: true, codFee: 0 } })

    // ---------- what staff can and cannot do ----------
    const user = await staff()
    const asStaff = (o: any) => ({ overrideAccess: false, user, ...o })
    let blocked = false
    try { await payload.create(asStaff({ collection: 'orders', data: { number: 'HAND1', status: 'confirmed', paymentMethod: 'cod', paymentStatus: 'cod' } })) } catch { blocked = true }
    yes('staff cannot create orders by hand', blocked)
    await payload.update(asStaff({ collection: 'orders', id: cod.id, data: { totals: { total: 1 }, contact: { email: 'x@y.z' } } }))
    const after1 = await dbOrder(cod.number)
    eq('staff cannot change what was bought or paid', [after1.totals.total, after1.contact.email], [cod.totals.total, cod.contact.email])

    mock.state.shiprocketOrders.length = 0
    await payload.update(asStaff({ collection: 'orders', id: cod.id, data: { status: 'confirmed' } }))
    await sleep(2500)
    const sent = await dbOrder(cod.number)
    eq('confirming a cash on delivery order sends it to Shiprocket', [mock.state.shiprocketOrders.length, mock.state.shiprocketOrders[0]?.payment_method, mock.state.shiprocketOrders[0]?.order_id], [1, 'COD', cod.number])
    yes('Shiprocket ids and a courier are saved on the order', sent.shipment?.shiprocketOrderId && sent.shipment?.awb && sent.shipment?.courier === 'MockExpress')
    eq('Shiprocket gets the amount to collect and the delivery address', [mock.state.shiprocketOrders[0]?.sub_total, mock.state.shiprocketOrders[0]?.billing_pincode, mock.state.shiprocketOrders[0]?.billing_state], [cod.totals.total, '560001', 'Karnataka'])
    yes('the order history says who did what', (sent.timeline || []).some((t: any) => /Status set to "Confirmed" by/.test(t.text)) && (sent.timeline || []).some((t: any) => /Sent to Shiprocket/.test(t.text)))
    await payload.update(asStaff({ collection: 'orders', id: cod.id, data: { status: 'confirmed' } }))
    await sleep(800)
    eq('saving again does not send it twice', mock.state.shiprocketOrders.length, 1)

    // ---------- online payment ----------
    r = await call('/api/storefront/checkout', body({ payment: 'online', expectedTotal: price }))
    eq('an online order starts a Razorpay payment for the exact amount', [r.status, r.json.mode, r.json.razorpay?.amount, r.json.razorpay?.test], [200, 'online', Math.round(price * 100), true])
    const on = await dbOrder(r.json.number)
    const onToken = r.json.token
    const rz = r.json.razorpay
    eq('the order waits for payment and remembers the Razorpay order', [on.status, on.paymentStatus, on.payment.razorpayOrderId], ['awaiting_payment', 'pending', rz.orderId])
    eq('Razorpay was asked for the same receipt and amount', [mock.state.razorpayOrders.at(-1)?.receipt, mock.state.razorpayOrders.at(-1)?.amount], [on.number, Math.round(price * 100)])

    let blocked2 = false
    try { await payload.update(asStaff({ collection: 'orders', id: on.id, data: { status: 'confirmed' } })) } catch { blocked2 = true }
    yes('staff cannot confirm an unpaid online order', blocked2)

    r = await call('/api/storefront/checkout/verify', { number: on.number, token: onToken, razorpay_order_id: rz.orderId, razorpay_payment_id: 'pay_FAKE1', razorpay_signature: 'f'.repeat(64) })
    eq('a payment confirmation with a wrong signature is refused', [r.status, r.json.code], [400, 'signature'])
    eq('and the order stays unpaid', (await dbOrder(on.number)).paymentStatus, 'pending')
    r = await call('/api/storefront/checkout/verify', { number: on.number, token: 'x'.repeat(48), razorpay_order_id: rz.orderId, razorpay_payment_id: 'pay_FAKE1', razorpay_signature: hmac(KEY_SECRET, `${rz.orderId}|pay_FAKE1`) })
    eq('a right signature with a wrong order token is refused', r.status, 404)

    mock.state.shiprocketOrders.length = 0
    const sig = hmac(KEY_SECRET, `${rz.orderId}|pay_REAL1`)
    r = await call('/api/storefront/checkout/verify', { number: on.number, token: onToken, razorpay_order_id: rz.orderId, razorpay_payment_id: 'pay_REAL1', razorpay_signature: sig })
    eq('a genuine payment confirms the order', [r.status, r.json.status, r.json.paymentStatus], [200, 'confirmed', 'paid'])
    await sleep(2500)
    eq('a paid online order goes to Shiprocket as prepaid', [mock.state.shiprocketOrders.length, mock.state.shiprocketOrders[0]?.payment_method], [1, 'Prepaid'])
    await call('/api/storefront/checkout/verify', { number: on.number, token: onToken, razorpay_order_id: rz.orderId, razorpay_payment_id: 'pay_REAL1', razorpay_signature: sig })
    await sleep(1200)
    eq('reporting the same payment twice changes nothing', mock.state.shiprocketOrders.length, 1)

    // retry reuses an unpaid order
    r = await call('/api/storefront/checkout', body({ payment: 'online', expectedTotal: price, contact: { email: email('retry'), phone: '9876543211' } }))
    const first = r.json
    const again = await call('/api/storefront/checkout', body({ payment: 'online', expectedTotal: price, contact: { email: email('retry'), phone: '9876543211' }, resume: { number: first.number, token: first.token } }))
    eq('trying to pay again reuses the same order and Razorpay payment', [again.json.number, again.json.razorpay?.orderId], [first.number, first.razorpay.orderId])
    const changed = await call('/api/storefront/checkout', body({ payment: 'online', code: '', method: 'express', expectedTotal: price - 79 + 149, contact: { email: email('retry'), phone: '9876543211' }, resume: { number: first.number, token: first.token } }))
    eq('if the bag changed, the old attempt is replaced by a new order', [changed.json.number !== first.number, (await dbOrder(first.number)).status], [true, 'cancelled'])

    // Razorpay down
    // (the pretend Razorpay refuses an amount of 666 paise, which is not a real total, so test the refusal by switching keys)
    // ---------- Razorpay webhook ----------
    const hookOrder = await call('/api/storefront/checkout', body({ payment: 'online', expectedTotal: price, contact: { email: email('hook'), phone: '9876543212' } }))
    const ho = await dbOrder(hookOrder.json.number)
    const hook = (event: any, secret = HOOK_SECRET) => {
      const raw = JSON.stringify(event)
      return call('/api/webhooks/razorpay', {}, { raw, headers: { 'x-razorpay-signature': hmac(secret, raw) } })
    }
    const captured = (amount: number, id = 'pay_HOOK1') => ({ event: 'payment.captured', payload: { payment: { entity: { id, order_id: hookOrder.json.razorpay.orderId, amount, status: 'captured' } } } })
    eq('a webhook with a wrong signature is refused', (await hook(captured(Math.round(price * 100)), 'wrong')).status, 401)
    eq('a webhook for the wrong amount does not mark the order paid', [(await hook(captured(100))).status, (await dbOrder(ho.number)).paymentStatus], [200, 'pending'])
    mock.state.shiprocketOrders.length = 0
    eq('a genuine webhook marks it paid, even if the shopper never came back', [(await hook(captured(Math.round(price * 100)))).status, (await dbOrder(ho.number)).paymentStatus, (await dbOrder(ho.number)).status], [200, 'paid', 'confirmed'])
    await sleep(2200)
    eq('and the order goes to Shiprocket', mock.state.shiprocketOrders.length, 1)
    eq('an unknown order in a webhook is accepted quietly', (await hook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_X', order_id: 'order_UNKNOWN', amount: 1 } } } })).status, 200)
    await hook({ event: 'refund.processed', payload: { payment: { entity: { order_id: hookOrder.json.razorpay.orderId } }, refund: { entity: { amount: Math.round(price * 100) } } } })
    eq('a full refund marks the order refunded', (await dbOrder(ho.number)).paymentStatus, 'refunded')

    // ---------- Shiprocket webhook ----------
    const sr = (ev: any, token = SR_TOKEN) => call('/api/webhooks/shiprocket', ev, { headers: { 'x-api-key': token } })
    eq('a Shiprocket update with a wrong token is refused', (await sr({ order_id: cod.number, current_status: 'DELIVERED' }, 'nope')).status, 401)
    await sr({ order_id: cod.number, awb: sent.shipment.awb, current_status: 'IN TRANSIT' })
    let cur = await dbOrder(cod.number)
    eq('"in transit" moves the order to shipped', [cur.status, cur.shipment.status], ['shipped', 'IN TRANSIT'])
    await sr({ order_id: cod.number, current_status: 'DELIVERED' })
    eq('"delivered" moves it to delivered', (await dbOrder(cod.number)).status, 'delivered')
    await sr({ order_id: cod.number, current_status: 'IN TRANSIT' })
    eq('a late old update cannot move it backwards', (await dbOrder(cod.number)).status, 'delivered')
    eq('an unknown order in a Shiprocket update is accepted quietly', (await sr({ order_id: 'NOPE', current_status: 'DELIVERED' })).status, 200)

    // ---------- first-order offers use real order history ----------
    const welcome: any = (await payload.find({ collection: 'discounts', where: { code: { equals: 'WELCOME10' } }, limit: 1, depth: 0 })).docs[0]
    if (welcome) {
      created.offers.push([welcome.id, welcome.active])
      await payload.update({ collection: 'discounts', id: welcome.id, data: { active: true } })
    }
    const fresh = { email: email('new'), phone: '9876543299' }
    r = await call('/api/storefront/checkout', body({ code: 'WELCOME10', contact: fresh }))
    eq('a new shopper can use a first-order code', [r.status, r.json.mode], [200, 'cod'])
    const firstOrder = await dbOrder(r.json.number)
    yes('the order remembers which offer was used', firstOrder.discounts.some((d: any) => d.code === 'WELCOME10'))
    r = await call('/api/storefront/checkout', body({ code: 'WELCOME10', contact: fresh }))
    eq('the same shopper cannot use it again, even on a different device', [r.status, r.json.code], [409, 'code'])
    r = await call('/api/storefront/checkout', body({ code: 'WELCOME10', contact: { email: email('other'), phone: fresh.phone } }))
    eq('changing the email does not help when the phone number matches', [r.status, r.json.code], [409, 'code'])
    r = await call('/api/storefront/quote', { lines, code: 'WELCOME10', ident: fresh })
    eq('the price shown to that shopper says the same', r.json.code?.status !== 'applied', true)
    await payload.update({ collection: 'orders', id: firstOrder.id, data: { status: 'cancelled' } })
    r = await call('/api/storefront/checkout', body({ code: 'WELCOME10', contact: fresh }))
    eq('a cancelled first order does not count', [r.status, r.json.mode], [200, 'cod'])

    // ---------- limits ----------
    let last = 0
    for (let i = 0; i < 12; i++) last = (await call('/api/storefront/checkout', { lines: [] }, { ip: `rl-${tag}` })).status
    eq('too many checkout tries in a minute are slowed down', last, 429)
  } finally {
    // clean up everything this run created
    await payload.delete({ collection: 'orders', where: { 'contact.email': { contains: '@check.example.test' } } }).catch((e) => console.log('cleanup orders:', e.message))
    for (const [id, active] of created.offers) await payload.update({ collection: 'discounts', id, data: { active } }).catch(() => {})
    for (const id of created.users) await payload.delete({ collection: 'users', id }).catch(() => {})
    if (created.prevCod) await payload.updateGlobal({ slug: 'site-settings', data: created.prevCod }).catch(() => {})
    await mock.close()
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
