import crypto from 'node:crypto'

// Shiprocket, using only its web API. Sign in with a dedicated API user (Shiprocket recommends a separate
// email for this), keep the details in .env, and never expose them to the browser.

const apiBase = () => process.env.SHIPROCKET_API_BASE || 'https://apiv2.shiprocket.in/v1/external'

export const shiprocketConfigured = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD && process.env.SHIPROCKET_PICKUP_LOCATION)
export const pickupLocation = () => process.env.SHIPROCKET_PICKUP_LOCATION || ''

let cached: { token: string; until: number } | null = null

async function login(doFetch: typeof fetch): Promise<string> {
  const res = await doFetch(`${apiBase()}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || !json.token) throw new Error(`Shiprocket sign-in failed (${res.status}). Check the API user in .env.`)
  // Tokens last 10 days; renew a day early.
  cached = { token: json.token, until: Date.now() + 9 * 24 * 3600 * 1000 }
  return json.token
}

async function call(path: string, init: { method?: string; body?: unknown; query?: Record<string, string | number> } = {}, doFetch: typeof fetch = fetch): Promise<{ status: number; json: any }> {
  const url = new URL(`${apiBase()}${path}`)
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, String(v))
  const run = async (token: string) => {
    const res = await doFetch(url, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })
    return { status: res.status, json: await res.json().catch(() => ({})) as any }
  }
  let r = await run(cached && cached.until > Date.now() ? cached.token : await login(doFetch))
  if (r.status === 401) r = await run(await login(doFetch))
  return r
}

const memo = new Map<string, { at: number; value: Serviceability }>()
export type Serviceability = { configured: boolean; serviceable: boolean | null; codAvailable: boolean | null; days: number | null; courierId: number | null }

// Can we deliver to this pincode, how soon, and can cash on delivery be offered? Cached for six hours.
export async function checkServiceability(args: { pickup: string; delivery: string; cod: boolean; weightKg: number }, doFetch: typeof fetch = fetch): Promise<Serviceability> {
  if (!shiprocketConfigured() || !/^\d{6}$/.test(args.pickup)) return { configured: false, serviceable: null, codAvailable: null, days: null, courierId: null }
  const key = `${args.pickup}>${args.delivery}:${args.cod ? 1 : 0}:${Math.ceil(args.weightKg * 2) / 2}`
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit.value
  const r = await call('/courier/serviceability/', { query: { pickup_postcode: args.pickup, delivery_postcode: args.delivery, cod: args.cod ? 1 : 0, weight: Math.max(0.1, args.weightKg) } }, doFetch)
  const list: any[] = r.json?.data?.available_courier_companies ?? []
  let value: Serviceability
  if (list.length) {
    const days = list.map((c) => Number(c.estimated_delivery_days)).filter((n) => n > 0)
    const best = list.find((c) => c.courier_company_id === r.json?.data?.recommended_courier_company_id) ?? list[0]
    value = { configured: true, serviceable: true, codAvailable: list.some((c) => Number(c.cod) === 1), days: days.length ? Math.min(...days) : null, courierId: best?.courier_company_id ?? null }
  } else if (r.status === 404 || r.json?.status_code === 404 || r.json?.status === 404 || /no courier/i.test(String(r.json?.message ?? ''))) {
    value = { configured: true, serviceable: false, codAvailable: false, days: null, courierId: null }
  } else {
    // Shiprocket did not give a clear answer. Say "unknown" instead of turning a customer away.
    return { configured: true, serviceable: null, codAvailable: null, days: null, courierId: null }
  }
  memo.set(key, { at: Date.now(), value })
  return value
}

export type ParcelOrder = {
  number: string; placedAt: Date; paymentMethod: 'online' | 'cod'; note?: string
  contact: { email: string; phone: string }
  address: { name: string; line1: string; line2?: string; city: string; state: string; pin: string }
  lines: { title: string; sku?: string; size?: string; qty: number; price: number; weightGrams?: number; box?: { lengthCm?: number; widthCm?: number; heightCm?: number } }[]
  totals: { subtotal: number; discount: number; shipping: number; codFee: number; total: number }
}

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

// Rough parcel: weight adds up, length and width take the largest box, height stacks. Staff can correct it in Shiprocket.
export function parcelOf(lines: ParcelOrder['lines']) {
  let grams = 0, l = 0, b = 0, h = 0
  for (const x of lines) {
    grams += (x.weightGrams || 300) * x.qty
    l = Math.max(l, x.box?.lengthCm || 20)
    b = Math.max(b, x.box?.widthCm || 15)
    h += (x.box?.heightCm || 4) * x.qty
  }
  return { weight: Math.max(0.1, Math.round(grams) / 1000), length: l, breadth: b, height: Math.min(h, 60) }
}

export function shiprocketPayload(o: ParcelOrder) {
  const [first, ...rest] = o.address.name.trim().split(/\s+/)
  const p = parcelOf(o.lines)
  return {
    order_id: o.number,
    order_date: stamp(o.placedAt),
    pickup_location: pickupLocation(),
    comment: o.note ?? '',
    billing_customer_name: first, billing_last_name: rest.join(' '),
    billing_address: o.address.line1, billing_address_2: o.address.line2 ?? '',
    billing_city: o.address.city, billing_pincode: o.address.pin, billing_state: o.address.state, billing_country: 'India',
    billing_email: o.contact.email, billing_phone: o.contact.phone,
    shipping_is_billing: true,
    order_items: o.lines.map((x) => ({ name: x.size ? `${x.title} (${x.size})` : x.title, sku: x.sku || x.title.slice(0, 30), units: x.qty, selling_price: x.price, discount: '', tax: '', hsn: '' })),
    payment_method: o.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    shipping_charges: o.totals.shipping, giftwrap_charges: 0, transaction_charges: o.totals.codFee,
    total_discount: o.totals.discount, sub_total: o.totals.total,
    length: p.length, breadth: p.breadth, height: p.height, weight: p.weight,
  }
}

export async function createShiprocketOrder(o: ParcelOrder, doFetch: typeof fetch = fetch): Promise<{ orderId: number; shipmentId: number }> {
  const r = await call('/orders/create/adhoc', { method: 'POST', body: shiprocketPayload(o) }, doFetch)
  if (r.status >= 300 || !r.json?.order_id) throw new Error(`Shiprocket ${r.status}: ${r.json?.message || JSON.stringify(r.json?.errors ?? r.json).slice(0, 200)}`)
  return { orderId: r.json.order_id, shipmentId: r.json.shipment_id }
}

// Picks a courier (the given one, or Shiprocket's own choice) and returns the tracking number.
export async function assignCourier(shipmentId: number, courierId?: number | null, doFetch: typeof fetch = fetch): Promise<{ awb: string; courier: string }> {
  const r = await call('/courier/assign/awb', { method: 'POST', body: { shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) } }, doFetch)
  const d = r.json?.response?.data
  if (r.status >= 300 || !d?.awb_code) throw new Error(`Shiprocket ${r.status}: ${r.json?.message || r.json?.response?.data?.awb_assign_error || 'could not assign a courier'}`)
  return { awb: String(d.awb_code), courier: String(d.courier_name ?? '') }
}

// Shiprocket calls our webhook with the token we set in its dashboard as an "x-api-key" header.
export function verifyShiprocketToken(header: string | null, expected = process.env.SHIPROCKET_WEBHOOK_TOKEN || '') {
  if (!expected || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const trackingUrl = (awb: string) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`
