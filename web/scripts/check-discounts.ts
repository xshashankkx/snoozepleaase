// Checks the discount engine against worked examples. No database needed: npm run check:discounts
import { quote, type Line, type Offer } from '../src/lib/discounts'

const ship = { standard: 79, express: 149, freeOver: 1999 }
const L = (price: number, qty = 1, category = 'kids-nightwear', productId = 1, variantId = 'v' + productId): Line => ({ handle: 'p' + productId, variantId, qty, price, category, productId })
const sale: Offer = { id: 's', title: 'Dreamtime Sale', method: 'automatic', type: 'percentage', value: 10 }
const code = (o: Partial<Offer>): Offer => ({ id: 'c', title: 'Code offer', method: 'code', code: 'TEST', type: 'flat', value: 150, ...o })
let pass = 0, fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`)
}
const run = (lines: Line[], offers: Offer[], o: any = {}) => quote({ lines, offers, shipping: ship, ...o })

// plain bag and the 10% sale
eq('no offers: ₹1,099 + ₹79 shipping', run([L(1099)], []).total, 1178)
eq('10% sale on ₹1,099 takes off ₹110', run([L(1099)], [sale]).discountTotal, 110)
eq('10% sale total', run([L(1099)], [sale]).total, 1068)
// free shipping amount is measured after the discount
eq('2 × ₹1,099 after 10% is ₹1,978: shipping still charged', run([L(1099, 2)], [sale]).shipping, 79)
eq('3 × ₹1,099 after 10% is above ₹1,999: shipping free', run([L(1099, 3)], [sale]).shipping, 0)
eq('express shipping is never free by the amount', run([L(1099, 3)], [sale], { method: 'express' }).shipping, 149)
eq('shipping progress: amount left to free shipping', run([L(1099)], [sale]).freeAway, 1010)
// codes
eq('unknown code is invalid', run([L(1099)], [sale], { code: 'NOPE' }).code.status, 'invalid')
eq('flat ₹150 code applies and the code is accepted', run([L(1099)], [code({})], { code: 'test' }).total, 1099 - 150 + 79)
eq('a code does nothing until typed', run([L(1099)], [code({})]).discountTotal, 0)
const minCode = code({ rules: { minSubtotal: 1500 } })
eq('minimum spend not met: tells how much more', run([L(1099)], [minCode], { code: 'TEST' }).code.message, 'Add ₹401 more to use this offer.')
eq('minimum spend met', run([L(1099, 2)], [minCode], { code: 'TEST' }).code.status, 'applied')
// best single offer wins
const r1 = run([L(1099, 2)], [sale, code({})], { code: 'TEST' })
eq('sale ₹220 beats flat ₹150: only the sale applies', r1.applied.map((a) => a.title), ['Dreamtime Sale'])
eq('the losing code is reported as beaten', r1.code.status, 'beaten')
const r2 = run([L(1099)], [sale, code({ value: 300 })], { code: 'TEST' })
eq('flat ₹300 beats the 10% sale', r2.applied.map((a) => a.title), ['Code offer'])
const r3 = run([L(1099)], [sale, code({ combinable: true, value: 100 })], { code: 'TEST' })
eq('a combinable code stacks on the sale', r3.applied.length, 2)
eq('stacked amount: sale ₹110 then ₹100', r3.discountTotal, 210)
// free shipping offer
const fs: Offer = { id: 'f', title: 'Free shipping', method: 'code', code: 'SHIP', type: 'free_shipping', combinable: true }
const r4 = run([L(1099)], [sale, fs], { code: 'SHIP' })
eq('free shipping code combines with the sale and zeroes shipping', [r4.shipping, r4.applied.length], [0, 2])
eq('free shipping on an already-free bag says so', run([L(1099, 3)], [fs], { code: 'SHIP' }).code.message, 'Shipping is already free on this bag.')
// buy X get Y
const b2g1: Offer = { id: 'b', title: 'Buy 2 get 1 free', method: 'automatic', type: 'buy_x_get_y', buy: { buyQty: 2, getQty: 1, getPercent: 100 } }
eq('buy 2 get 1 free: the cheapest of 999, 1099, 1199 is free', run([L(1199, 1, 'kids-nightwear', 1), L(999, 1, 'co-ords', 2), L(1099, 1, 'kids-nightwear', 3)], [b2g1]).discountTotal, 999)
eq('buy 2 get 1 free with only 2 items: nothing', run([L(1199), L(999, 1, 'co-ords', 2)], [b2g1]).discountTotal, 0)
eq('buy 2 get 1 free, 6 items: two free', run([L(1000, 6)], [b2g1]).discountTotal, 2000)
eq('buy 1 get 1 at 50% off', run([L(1000, 2)], [{ ...b2g1, buy: { buyQty: 1, getQty: 1, getPercent: 50 } }]).discountTotal, 500)
// scope
const co: Offer = { id: 'k', title: 'Co-ord sale', method: 'automatic', type: 'percentage', value: 20, appliesTo: 'categories', categories: ['co-ords'] }
eq('category offer only touches that category', run([L(1000, 1, 'co-ords', 2), L(1000, 1, 'kids-nightwear', 1)], [co]).discountTotal, 200)
eq('category offer with nothing in scope tells the shopper', run([L(1000)], [code({ appliesTo: 'categories', categories: ['co-ords'] })], { code: 'TEST' }).code.message, 'This offer does not apply to the items in your bag.')
eq('product offer only touches that product', run([L(1000, 1, 'kids-nightwear', 1), L(1000, 1, 'kids-nightwear', 2)], [{ ...co, appliesTo: 'products', products: [2] }]).discountTotal, 200)
// customer rules
const first = code({ rules: { firstOrderOnly: true } })
eq('first-order code for a first-time customer', run([L(1099)], [first], { code: 'TEST', customer: { firstOrder: true } }).code.status, 'applied')
eq('first-order code for a returning customer', run([L(1099)], [first], { code: 'TEST', customer: { firstOrder: false } }).code.message, 'This offer is for first orders only.')
const once = code({ rules: { oncePerCustomer: true } })
eq('once-per-customer: already used', run([L(1099)], [once], { code: 'TEST', customer: { usedOfferIds: ['c'] } }).code.message, 'You have already used this offer.')
eq('once-per-customer: not used yet', run([L(1099)], [once], { code: 'TEST', customer: { usedOfferIds: [] } }).code.status, 'applied')
// dates
const now = new Date('2026-11-10T12:00:00Z').getTime()
eq('offer that has not started', run([L(1099)], [{ ...sale, startsAt: '2026-11-11T00:00:00Z' }], { now }).discountTotal, 0)
eq('offer that has ended', run([L(1099)], [{ ...sale, endsAt: '2026-11-09T00:00:00Z' }], { now }).discountTotal, 0)
eq('offer inside its dates', run([L(1099)], [{ ...sale, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-30T00:00:00Z' }], { now }).discountTotal, 110)
eq('expired code says so', run([L(1099)], [code({ endsAt: '2026-11-09T00:00:00Z' })], { code: 'TEST', now }).code.message, 'This code has expired.')
// edges
eq('empty bag costs nothing and has no shipping', [run([], [sale]).total, run([], [sale]).shipping], [0, 0])
eq('a discount never makes the bag negative', run([L(100)], [code({ value: 500 })], { code: 'TEST' }).afterDiscount, 0)
eq('code is matched ignoring case and spaces', run([L(1099)], [code({})], { code: ' te st ' }).code.status, 'applied')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
