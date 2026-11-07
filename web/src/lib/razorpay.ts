import crypto from 'node:crypto'

// Razorpay, using only its web API (no extra package). Keys live in .env and never reach the browser,
// except the public key id, which the payment window needs.

const keyId = () => process.env.RAZORPAY_KEY_ID || ''
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || ''
const apiBase = () => process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1'

export const razorpayConfigured = () => !!(keyId() && keySecret())
export const razorpayTestMode = () => keyId().startsWith('rzp_test_')
export const razorpayKeyId = keyId

export const toPaise = (rupees: number) => Math.round(rupees * 100)

const hmac = (secret: string, data: string) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const same = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// After a payment, Razorpay's window hands the browser a signature over "order id | payment id".
// Only someone holding the key secret can make a matching one, so a match proves the payment is real.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret = keySecret()) {
  if (!secret || !orderId || !paymentId || !signature) return false
  return same(hmac(secret, `${orderId}|${paymentId}`), String(signature))
}

// Razorpay also calls our webhook; the body is signed with the webhook secret set in its dashboard.
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = process.env.RAZORPAY_WEBHOOK_SECRET || '') {
  if (!secret || !signature) return false
  return same(hmac(secret, rawBody), signature)
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string }

export async function createRazorpayOrder(args: { amountPaise: number; receipt: string; notes?: Record<string, string> }, doFetch: typeof fetch = fetch): Promise<RazorpayOrder> {
  const res = await doFetch(`${apiBase()}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${keyId()}:${keySecret()}`).toString('base64') },
    body: JSON.stringify({ amount: args.amountPaise, currency: 'INR', receipt: args.receipt.slice(0, 40), notes: args.notes ?? {} }),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Razorpay ${res.status}: ${json?.error?.description || 'could not create the payment'}`)
  return json
}
