// The discount engine: given a bag, the live offers, an optional code and the shipping rules,
// it works out what the shopper pays. Pure logic with no database, so it can be tested exactly.
//
// Rules (agreed with the owner):
//  - Offers switch on by date. A code only counts once typed in.
//  - The best single offer wins. Offers marked "can combine" are added on top of the winner.
//  - Free standard shipping also applies when the bag is above the free-shipping amount.

export type Line = { handle: string; variantId: string; qty: number; price: number; category: string; productId: number; title?: string; size?: string }

export type Offer = {
  id: number | string
  title: string
  method: 'automatic' | 'code'
  code?: string | null
  type: 'percentage' | 'flat' | 'buy_x_get_y' | 'free_shipping'
  value?: number | null
  buy?: { buyQty?: number; getQty?: number; getPercent?: number } | null
  appliesTo?: 'all' | 'categories' | 'products' | null
  categories?: string[] | null
  products?: number[] | null
  rules?: { minSubtotal?: number | null; firstOrderOnly?: boolean | null; oncePerCustomer?: boolean | null } | null
  combinable?: boolean | null
  startsAt?: string | null
  endsAt?: string | null
}

export type Customer = { firstOrder?: boolean; usedOfferIds?: (number | string)[] }
export type Shipping = { standard: number; express: number; freeOver: number }

export type Applied = { id: number | string; title: string; amount: number; kind: 'items' | 'shipping'; code?: string }

export type Quote = {
  subtotal: number
  applied: Applied[]
  discountTotal: number
  afterDiscount: number
  shippingBase: number
  shipping: number
  total: number
  freeAway: number
  count: number
  code: { entered: string | null; status: 'none' | 'applied' | 'invalid' | 'ineligible' | 'beaten'; message?: string }
}

export const normaliseCode = (c: unknown) => String(c ?? '').toUpperCase().replace(/\s+/g, '').slice(0, 40)
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

type Ctx = { lines: Line[]; rem: number[]; customer: Customer; shipping: Shipping; method: 'standard' | 'express'; now: number }

const inScope = (o: Offer, l: Line) =>
  o.type === 'free_shipping' || !o.appliesTo || o.appliesTo === 'all' ||
  (o.appliesTo === 'categories' && !!o.categories?.includes(l.category)) ||
  (o.appliesTo === 'products' && !!o.products?.includes(l.productId))

const scopedIdx = (o: Offer, c: Ctx) => c.lines.map((l, i) => (inScope(o, l) ? i : -1)).filter((i) => i >= 0)
const remTotal = (c: Ctx) => c.rem.reduce((t, x) => t + x, 0)

const shippingFor = (c: Ctx, freeByOffer: boolean) => {
  if (!c.lines.length) return { base: 0, paid: 0 }
  const base = c.method === 'express' ? c.shipping.express : c.shipping.standard
  const free = freeByOffer || (c.method === 'standard' && remTotal(c) >= c.shipping.freeOver)
  return { base, paid: free ? 0 : base }
}

// Why an offer cannot be used right now, or null when it can.
export function ineligibleReason(o: Offer, c: Ctx): string | null {
  const start = o.startsAt ? new Date(o.startsAt).getTime() : null
  const end = o.endsAt ? new Date(o.endsAt).getTime() : null
  if (start && start > c.now) return 'This offer has not started yet.'
  if (end && end < c.now) return o.method === 'code' ? 'This code has expired.' : 'This offer has ended.'
  const idx = scopedIdx(o, c)
  if (o.type !== 'free_shipping' && !idx.length) return 'This offer does not apply to the items in your bag.'
  const min = o.rules?.minSubtotal
  if (min && min > 0) {
    const have = idx.reduce((t, i) => t + c.lines[i].price * c.lines[i].qty, 0)
    if (o.type === 'free_shipping' ? c.lines.reduce((t, l) => t + l.price * l.qty, 0) < min : have < min) {
      const gap = min - (o.type === 'free_shipping' ? c.lines.reduce((t, l) => t + l.price * l.qty, 0) : have)
      return `Add ${inr(gap)} more to use this offer.`
    }
  }
  if (o.rules?.firstOrderOnly && c.customer.firstOrder === false) return 'This offer is for first orders only.'
  if (o.rules?.oncePerCustomer && c.customer.usedOfferIds?.some((x) => String(x) === String(o.id))) return 'You have already used this offer.'
  return null
}

// How much an offer takes off right now, and which lines it comes off.
function evaluate(o: Offer, c: Ctx): { amount: number; perLine: Map<number, number>; kind: 'items' | 'shipping' } {
  const perLine = new Map<number, number>()
  if (o.type === 'free_shipping') {
    const before = shippingFor(c, false)
    return { amount: before.paid, perLine, kind: 'shipping' }
  }
  const idx = scopedIdx(o, c)
  const base = idx.reduce((t, i) => t + c.rem[i], 0)
  let amount = 0
  if (o.type === 'percentage') amount = Math.round((base * Math.min(100, Math.max(0, o.value ?? 0))) / 100)
  if (o.type === 'flat') amount = Math.min(Math.round(o.value ?? 0), Math.round(base))
  if (o.type === 'buy_x_get_y') {
    const buy = Math.max(1, o.buy?.buyQty ?? 2)
    const get = Math.max(1, o.buy?.getQty ?? 1)
    const pct = Math.min(100, Math.max(1, o.buy?.getPercent ?? 100))
    const units: { i: number; p: number }[] = []
    for (const i of idx) for (let n = 0; n < c.lines[i].qty; n++) units.push({ i, p: c.rem[i] / c.lines[i].qty })
    units.sort((a, b) => a.p - b.p)
    const free = Math.floor(units.length / (buy + get)) * get
    for (const u of units.slice(0, free)) {
      const off = (u.p * pct) / 100
      amount += off
      perLine.set(u.i, (perLine.get(u.i) ?? 0) + off)
    }
    amount = Math.round(amount)
  } else if (amount > 0) {
    for (const i of idx) perLine.set(i, base > 0 ? (c.rem[i] / base) * amount : 0)
  }
  return { amount, perLine, kind: 'items' }
}

export function quote(input: { lines: Line[]; offers: Offer[]; code?: string | null; customer?: Customer; shipping: Shipping; method?: 'standard' | 'express'; now?: number }): Quote {
  const lines = input.lines.filter((l) => l.qty > 0)
  const c: Ctx = { lines, rem: lines.map((l) => l.price * l.qty), customer: input.customer ?? {}, shipping: input.shipping, method: input.method ?? 'standard', now: input.now ?? Date.now() }
  const subtotal = lines.reduce((t, l) => t + l.price * l.qty, 0)
  const entered = normaliseCode(input.code) || null
  const codeOffer = entered ? input.offers.find((o) => o.method === 'code' && normaliseCode(o.code) === entered) : undefined
  const result: Quote = {
    subtotal, applied: [], discountTotal: 0, afterDiscount: subtotal, shippingBase: 0, shipping: 0, total: subtotal, freeAway: 0,
    count: lines.reduce((t, l) => t + l.qty, 0), code: { entered, status: entered ? 'invalid' : 'none', message: entered ? 'That code is not valid.' : undefined },
  }

  const candidates = input.offers.filter((o) => o.method === 'automatic' || o === codeOffer)
  const eligible: { o: Offer; amount: number }[] = []
  for (const o of candidates) {
    const why = ineligibleReason(o, c)
    if (why) {
      if (o === codeOffer) result.code = { entered, status: 'ineligible', message: why }
      continue
    }
    const amount = evaluate(o, c).amount
    if (amount <= 0) {
      if (o === codeOffer) result.code = { entered, status: 'ineligible', message: o.type === 'free_shipping' ? 'Shipping is already free on this bag.' : 'This offer does not apply to the items in your bag.' }
      continue
    }
    eligible.push({ o, amount })
  }

  // Best single offer among those that cannot combine (a typed code wins a tie), then every combinable one.
  const solo = eligible.filter((e) => !e.o.combinable).sort((a, b) => b.amount - a.amount || Number(b.o === codeOffer) - Number(a.o === codeOffer))
  const stack = [...(solo[0] ? [solo[0]] : []), ...eligible.filter((e) => e.o.combinable).sort((a, b) => b.amount - a.amount)]
  let freeByOffer = false
  for (const { o } of stack) {
    const r = evaluate(o, c)
    if (r.amount <= 0) continue
    if (r.kind === 'shipping') freeByOffer = true
    else {
      for (const [i, off] of r.perLine) c.rem[i] -= off
      result.discountTotal += r.amount
    }
    result.applied.push({ id: o.id, title: o.title, amount: r.amount, kind: r.kind, code: o === codeOffer ? entered ?? undefined : undefined })
  }

  if (codeOffer && eligible.some((e) => e.o === codeOffer)) {
    const used = result.applied.some((a) => a.id === codeOffer.id)
    result.code = used
      ? { entered, status: 'applied', message: `${codeOffer.title} applied.` }
      : { entered, status: 'beaten', message: `Your bag already has a better offer (${result.applied[0]?.title ?? 'another offer'}), so this code was not added.` }
  }

  result.afterDiscount = Math.max(0, subtotal - result.discountTotal)
  const ship = shippingFor({ ...c, rem: [result.afterDiscount] }, freeByOffer)
  result.shippingBase = ship.base
  result.shipping = ship.paid
  if (freeByOffer) {
    const s = result.applied.find((a) => a.kind === 'shipping')
    if (s) s.amount = ship.base
  }
  result.total = result.afterDiscount + result.shipping
  result.freeAway = Math.max(0, input.shipping.freeOver - result.afterDiscount)
  return result
}

// Words for the header tag and product pages, built from an offer.
export function offerText(o: Pick<Offer, 'type' | 'value' | 'buy'>) {
  if (o.type === 'percentage') return `${o.value}% OFF`
  if (o.type === 'flat') return `${inr(o.value ?? 0)} OFF`
  if (o.type === 'free_shipping') return 'FREE SHIPPING'
  const b = o.buy
  return b ? `BUY ${b.buyQty}, GET ${b.getQty}${(b.getPercent ?? 100) === 100 ? ' FREE' : ` AT ${b.getPercent}% OFF`}` : 'OFFER'
}
