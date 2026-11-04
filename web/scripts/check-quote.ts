// @ts-nocheck
// End-to-end check of the price quote endpoint against the running site (npm run dev must be on).
// It switches the example offers on and off, asks the server for quotes, then puts everything back.
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const BASE = process.env.CHECK_BASE || 'http://localhost:3000'
let pass = 0, fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`)
}

async function main() {
  const payload = await getPayload({ config })
  const prods = (await payload.find({ collection: 'products', where: { _status: { equals: 'published' } }, limit: 100, depth: 0 })).docs as any[]
  const p = prods.find((x) => x.handle === 'florida-blue-co-ord-set')!
  const v = p.variants.find((x: any) => x.stock >= 5)!
  const price = v.price
  const post = async (body: any) => (await fetch(`${BASE}/api/storefront/quote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json()
  const line = (qty = 1) => ({ handle: p.handle, variantId: v.id, qty })

  const offer = async (title: string) => (await payload.find({ collection: 'discounts', where: { title: { contains: title } }, limit: 1, depth: 0 })).docs[0] as any
  const set = async (title: string, data: any) => payload.update({ collection: 'discounts', id: (await offer(title)).id, data })
  const restore: (() => Promise<unknown>)[] = []
  const flip = async (title: string, data: any) => { const o = await offer(title); const prev: any = {}; for (const k of Object.keys(data)) prev[k] = o[k]; restore.push(() => set(title, prev)); await set(title, data) }

  try {
    const sale = Math.round(price * 0.1)
    let q = await post({ lines: [line()] })
    eq('server price + the live Dreamtime Sale', [q.subtotal, q.discountTotal, q.applied.map((a: any) => a.title)], [price, sale, ['Dreamtime Sale']])
    eq('shipping charged under the free amount', q.shipping, 79)

    q = await post({ lines: [{ handle: p.handle, variantId: v.id, qty: 1, price: 1, title: 'x' }] })
    eq('a price sent by the browser is ignored', q.subtotal, price)
    q = await post({ lines: [line(99)] })
    eq('quantity is capped to stock (and to 20)', q.lines[0].qty <= Math.min(20, v.stock), true)
    q = await post({ lines: [{ handle: p.handle, variantId: 'nope', qty: 1 }, { handle: 'not-a-product', variantId: 'x', qty: 1 }] })
    eq('unknown size or product is reported as gone and not priced', [q.lines.map((l: any) => l.status), q.subtotal], [['gone', 'gone'], 0])
    q = await post({ lines: [line()], code: 'WELCOME10' })
    eq('a switched-off code is invalid', q.code.status, 'invalid')
    q = await post({ lines: 'garbage' })
    eq('bad input does not crash', q.subtotal, 0)

    await flip('Welcome code', { active: true })
    q = await post({ lines: [line()], code: 'welcome10', customer: { firstOrder: true } })
    eq('first-order code, first-time shopper: ties with the sale, the code wins the tie', [q.code.status, q.applied.map((a: any) => a.title)], ['applied', ['Welcome code (example)']])
    q = await post({ lines: [line()], code: 'WELCOME10', customer: { firstOrder: false } })
    eq('first-order code, returning shopper', [q.code.status, q.code.message], ['ineligible', 'This offer is for first orders only.'])
    q = await post({ lines: [line()], code: 'WELCOME10', customer: { firstOrder: true, usedOfferIds: [(await offer('Welcome code')).id] } })
    eq('a first-order code can be applied by the engine regardless of used list', q.code.status, 'applied')

    await flip('Free shipping code', { active: true })
    q = await post({ lines: [line()], code: 'FREESHIP' })
    eq('free shipping code stacks with the sale and zeroes shipping', [q.applied.length, q.shipping, q.total], [2, 0, price - sale])
    q = await post({ lines: [line()], code: 'FREESHIP', method: 'express' })
    eq('free shipping code also covers express', q.shipping, 0)

    await flip('150 off over', { active: true })
    q = await post({ lines: [line()], code: 'SAVE150' })
    eq('minimum spend not met gives the gap', q.code.message, `Add ₹${1500 - price} more to use this offer.`)

    await flip('Buy 2, get 1 free', { active: true })
    q = await post({ lines: [line(3)] })
    eq('buy 2 get 1 free beats the 10% sale on 3 of the same item', [q.applied.map((a: any) => a.title), q.discountTotal], [['Buy 2, get 1 free (example)'], price])

    await flip('Dreamtime Sale', { startsAt: new Date(Date.now() + 86_400_000).toISOString() })
    await set('Buy 2, get 1 free', { active: false })
    q = await post({ lines: [line()] })
    eq('a sale that starts tomorrow is not live yet', q.discountTotal, 0)
    await set('Dreamtime Sale', { startsAt: null, endsAt: new Date(Date.now() - 1000).toISOString() })
    q = await post({ lines: [line()] })
    eq('a sale that has ended is not live', q.discountTotal, 0)
  } finally {
    for (const r of restore.reverse()) await r().catch(() => {})
    // make sure the examples are back off and the sale is back on, with no dates
    await set('Dreamtime Sale', { active: true, startsAt: null, endsAt: null })
    for (const t of ['Welcome code', 'Free shipping code', '150 off over', 'Buy 2, get 1 free']) await set(t, { active: false })
  }
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
