import 'server-only'
import crypto from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { priceBag } from './quote'
import { checkDetails } from './india'
import { normEmail, normPhone } from './customerHistory'
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, razorpayTestMode, toPaise, verifyPaymentSignature } from './razorpay'
import { checkServiceability, parcelOf } from './shiprocket'
import { logEvent, markPaid } from './fulfil'

export class CheckoutError extends Error {
  constructor(message: string, public status = 400, public code = 'error', public extra: Record<string, unknown> = {}) { super(message) }
}

const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max)
const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newNumber = () => 'SP' + Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('')

export function sameToken(a: unknown, b: unknown) {
  const x = Buffer.from(String(a ?? ''))
  const y = Buffer.from(String(b ?? ''))
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y)
}

export const pickupPincode = (settings: any) => String(settings?.pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE || '')

// What a shopper may see about their own order. Internal ids and the access token stay on the server.
export function publicOrder(o: any) {
  return {
    number: o.number, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, shippingMethod: o.shippingMethod,
    placed: o.createdAt, contact: o.contact, address: o.address, note: o.note || '',
    lines: (o.lines ?? []).map((l: any) => ({ handle: l.handle, title: l.title, size: l.size, qty: l.qty, price: l.price, image: l.image })),
    totals: o.totals, discounts: (o.discounts ?? []).map((d: any) => ({ id: d.offerId, title: d.title, code: d.code, amount: d.amount })),
    tracking: o.shipment?.awb ? { awb: o.shipment.awb, courier: o.shipment.courier || '', url: o.shipment.trackingUrl || '', status: o.shipment.status || '' } : null,
  }
}

export async function findOrderFor(number: unknown, token: unknown) {
  const payload = await getPayload({ config })
  const found = await payload.find({ collection: 'orders', where: { number: { equals: str(number, 20).toUpperCase() } }, limit: 1, depth: 0 })
  const o: any = found.docs[0]
  // Read the token with full access; the field is hidden from every API response.
  if (!o || !sameToken(o.accessToken, token)) return null
  return o
}

export async function startCheckout(body: any) {
  const payload = await getPayload({ config })
  const settings: any = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const pay: 'online' | 'cod' = body?.payment === 'cod' ? 'cod' : 'online'
  const method = body?.method === 'express' ? 'express' : 'standard'

  const contact = { email: normEmail(body?.contact?.email), phone: normPhone(body?.contact?.phone) }
  const a = body?.address ?? {}
  const address = { name: str(a.name, 80), line1: str(a.line1, 160), line2: str(a.line2, 160), city: str(a.city, 80), state: str(a.state, 60), pin: str(a.pin, 6) }
  const fieldErrors = checkDetails({ ...contact, ...address })
  if (Object.keys(fieldErrors).length) throw new CheckoutError('Please check your details.', 400, 'details', { fields: fieldErrors })
  const note = str(body?.note, 160)

  // Prices, stock, offers and the shopper's real order history are all worked out here.
  const { quote: q, products } = await priceBag({ lines: body?.lines, code: body?.code, method, ident: contact })
  if (!q.lines.length) throw new CheckoutError('Your bag is empty.', 400, 'empty')
  if (q.lines.some((l: any) => l.status !== 'ok')) throw new CheckoutError('Something in your bag changed. Please review it and try again.', 409, 'stock')
  if (q.code?.entered && q.code.status !== 'applied') throw new CheckoutError(q.code.message || 'That code cannot be used on this order.', 409, 'code')

  const codFee = pay === 'cod' ? Math.max(0, Number(settings.codFee) || 0) : 0
  const total = q.total + codFee
  if (typeof body?.expectedTotal === 'number' && Math.round(body.expectedTotal) !== Math.round(total)) {
    throw new CheckoutError(`The total is now ${money(total)}. Please review your order.`, 409, 'price', { total })
  }

  if (pay === 'cod') {
    if (settings.codEnabled === false) throw new CheckoutError('Cash on delivery is not available right now. Please pay online.', 400, 'cod')
    const cap = Number(settings.codMaxTotal ?? 5000)
    if (cap > 0 && total > cap) throw new CheckoutError(`Cash on delivery is available for orders up to ${money(cap)}. Please pay online for this order.`, 400, 'cod')
  }
  const items = q.lines.map((l: any) => {
    const p = products.find((x: any) => x.handle === l.handle)
    const v = p?.variants?.find((x: any) => x.id === l.variantId)
    return { l, p, v }
  })
  const parcel = parcelOf(items.map(({ l, v }) => ({ title: l.title, qty: l.qty, price: l.price, weightGrams: v?.weightGrams, box: v?.box })))
  const ship = await checkServiceability({ pickup: pickupPincode(settings), delivery: address.pin, cod: pay === 'cod', weightKg: parcel.weight })
  if (ship.serviceable === false) {
    throw new CheckoutError(pay === 'cod' ? 'We cannot offer cash on delivery to this pincode. Please pay online.' : 'We cannot deliver to this pincode yet.', 400, 'pincode')
  }
  if (pay === 'online' && !razorpayConfigured()) throw new CheckoutError('Online payment is not switched on yet. Please choose cash on delivery.', 503, 'payments-off')

  // A shopper who closed the payment window and tries again keeps the same order if nothing changed.
  const resume = body?.resume
  if (pay === 'online' && resume?.number) {
    const old = await findOrderFor(resume.number, resume.token)
    if (old && old.status === 'awaiting_payment' && old.paymentMethod === 'online') {
      if (Math.round(old.totals.total) === Math.round(total) && old.payment?.razorpayOrderId) {
        return { number: old.number, token: resume.token, mode: 'online' as const, total, razorpay: { keyId: razorpayKeyId(), orderId: old.payment.razorpayOrderId, amount: toPaise(total), test: razorpayTestMode() } }
      }
      await payload.update({ collection: 'orders', id: old.id, data: { status: 'cancelled' } as any, context: { skipHooks: true } })
      await logEvent(payload, old.id, 'Replaced by a new attempt because the bag changed.')
    }
  }

  const mediaIds = [...new Set(items.map(({ p }) => (p?.images?.[0]?.image && typeof p.images[0].image === 'object' ? p.images[0].image.id : p?.images?.[0]?.image)).filter(Boolean))]
  const media: any[] = mediaIds.length ? (await payload.find({ collection: 'media', where: { id: { in: mediaIds } }, limit: 50, depth: 0 })).docs : []
  const imageOf = (p: any) => {
    const id = typeof p?.images?.[0]?.image === 'object' ? p.images[0].image.id : p?.images?.[0]?.image
    const m = media.find((x) => x.id === id)
    return m?.sizes?.thumb?.url || m?.url || ''
  }

  const token = crypto.randomBytes(24).toString('hex')
  const now = new Date().toISOString()
  const data: any = {
    status: pay === 'cod' ? 'awaiting_confirmation' : 'awaiting_payment',
    paymentMethod: pay, paymentStatus: pay === 'cod' ? 'cod' : 'pending', shippingMethod: method,
    contact, address, note, accessToken: token,
    lines: items.map(({ l, p, v }) => ({
      handle: l.handle, variantId: l.variantId, title: l.title, size: l.size, sku: v?.sku || '', qty: l.qty, price: l.price,
      weightGrams: v?.weightGrams ?? null, box: v?.box ?? undefined, image: imageOf(p),
    })),
    totals: { subtotal: q.subtotal, discount: q.discountTotal, shipping: q.shipping, codFee, total },
    discounts: q.applied.map((d: any) => ({ offerId: String(d.id), title: d.title, code: d.code ?? '', amount: d.amount })),
    timeline: [{ at: now, text: pay === 'cod' ? 'Order placed. Cash on delivery: waiting for confirmation with the customer.' : 'Order started. Waiting for payment.' }],
  }
  let order: any
  for (let i = 0; i < 5 && !order; i++) {
    try { order = await payload.create({ collection: 'orders', data: { ...data, number: newNumber() } }) }
    catch (e: any) { if (!/unique|duplicate/i.test(String(e?.message)) || i === 4) throw e }
  }

  if (pay === 'cod') return { number: order.number, token, mode: 'cod' as const, total }

  try {
    const rp = await createRazorpayOrder({ amountPaise: toPaise(total), receipt: order.number, notes: { order: order.number } })
    await logEvent(payload, order.id, `Payment started with Razorpay (${rp.id}).`, { payment: { razorpayOrderId: rp.id } })
    return { number: order.number, token, mode: 'online' as const, total, razorpay: { keyId: razorpayKeyId(), orderId: rp.id, amount: rp.amount, test: razorpayTestMode() } }
  } catch (e: any) {
    console.error('razorpay order failed', e)
    await logEvent(payload, order.id, `Could not start the payment: ${String(e.message).slice(0, 200)}`, { status: 'payment_failed', paymentStatus: 'failed' })
    throw new CheckoutError('We could not start the payment. Please try again in a moment.', 502, 'payments-down')
  }
}

// The browser reports a finished payment. Razorpay's signature proves it is genuine.
export async function confirmPayment(body: any) {
  const payload = await getPayload({ config })
  const o = await findOrderFor(body?.number, body?.token)
  if (!o || o.paymentMethod !== 'online') throw new CheckoutError('We could not find that order.', 404, 'not-found')
  const ok = o.payment?.razorpayOrderId === body?.razorpay_order_id && verifyPaymentSignature(String(body?.razorpay_order_id), String(body?.razorpay_payment_id), String(body?.razorpay_signature))
  if (!ok) {
    await logEvent(payload, o.id, 'A payment confirmation arrived with a signature that did not match. It was ignored.')
    throw new CheckoutError('We could not confirm that payment. If money was taken, it will be matched automatically within a few minutes.', 400, 'signature')
  }
  const updated = await markPaid(payload, o.id, String(body.razorpay_payment_id), 'browser')
  return publicOrder(updated)
}
