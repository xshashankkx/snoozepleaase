import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'
import { quote, type Line, type Offer, type Customer } from './discounts'

type Status = 'ok' | 'adjusted' | 'soldout' | 'gone'
export type QuoteLine = { variantId: string; handle: string; title: string; size: string; price: number; qty: number; stock: number; status: Status }

const idOf = (x: any) => (x && typeof x === 'object' ? x.id : x)
const clamp = (n: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.floor(Number(n) || 0)))

// Prices the bag from the catalog, never from what the browser says: the browser only sends
// which product, which size and how many. Everything else is looked up here.
export async function buildQuote(body: any) {
  const raw: any[] = Array.isArray(body?.lines) ? body.lines.slice(0, 50) : []
  const wanted = raw
    .map((l) => ({ handle: String(l?.handle ?? '').slice(0, 200), variantId: String(l?.variantId ?? '').slice(0, 64), qty: clamp(l?.qty, 1, 20) }))
    .filter((l) => l.handle && l.variantId)
  const method = body?.method === 'express' ? 'express' : 'standard'
  const customer: Customer = {
    firstOrder: typeof body?.customer?.firstOrder === 'boolean' ? body.customer.firstOrder : undefined,
    usedOfferIds: Array.isArray(body?.customer?.usedOfferIds) ? body.customer.usedOfferIds.slice(0, 50).map((x: unknown) => String(x)) : [],
  }

  const payload = await getPayload({ config })
  const handles = [...new Set(wanted.map((l) => l.handle))]
  const products = handles.length
    ? (await payload.find({ collection: 'products', where: { and: [{ handle: { in: handles } }, { _status: { equals: 'published' } }] }, limit: 100, depth: 0 })).docs as any[]
    : []
  const settings: any = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const discounts = (await payload.find({ collection: 'discounts', where: { active: { equals: true } }, limit: 200, depth: 0 })).docs as any[]

  const lines: Line[] = []
  const report: QuoteLine[] = []
  for (const w of wanted) {
    const p = products.find((x) => x.handle === w.handle)
    const v = p?.variants?.find((x: any) => x.id === w.variantId)
    if (!p || !v) { report.push({ ...w, title: p?.title ?? w.handle, size: '', price: 0, stock: 0, status: 'gone' }); continue }
    const stock = Math.max(0, v.stock ?? 0)
    if (stock <= 0) { report.push({ ...w, title: p.title, size: v.size, price: v.price, stock, status: 'soldout' }); continue }
    const qty = Math.min(w.qty, stock)
    report.push({ ...w, qty, title: p.title, size: v.size, price: v.price, stock, status: qty < w.qty ? 'adjusted' : 'ok' })
    lines.push({ handle: p.handle, variantId: w.variantId, qty, price: v.price, category: p.category, productId: p.id, title: p.title, size: v.size })
  }

  const offers: Offer[] = discounts.map((d) => ({
    id: d.id, title: d.title, method: d.method, code: d.code, type: d.type, value: d.value, buy: d.buy,
    appliesTo: d.appliesTo, categories: d.categories ?? [], products: (d.products ?? []).map(idOf),
    rules: d.rules, combinable: d.combinable, startsAt: d.startsAt, endsAt: d.endsAt,
  }))

  const q = quote({
    lines, offers, code: typeof body?.code === 'string' ? body.code : null, customer, method,
    shipping: { standard: settings.standardShipping ?? 79, express: settings.expressShipping ?? 149, freeOver: settings.freeShippingOver ?? 1999 },
  })
  return { ...q, lines: report }
}
