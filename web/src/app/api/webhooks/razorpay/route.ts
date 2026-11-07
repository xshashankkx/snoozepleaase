import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toPaise, verifyWebhookSignature } from '@/lib/razorpay'
import { logEvent, markPaid } from '@/lib/fulfil'

export const dynamic = 'force-dynamic'

// Razorpay tells us about payments even if the shopper closed the tab before our page heard back.
// Set this address (https://YOUR-SITE/api/webhooks/razorpay) in Razorpay > Settings > Webhooks with the events
// payment.captured, order.paid, payment.failed and refund.processed, and put the secret in RAZORPAY_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) return NextResponse.json({ error: 'bad signature' }, { status: 401 })
  let ev: any
  try { ev = JSON.parse(raw) } catch { return NextResponse.json({ error: 'bad body' }, { status: 400 }) }

  const payload = await getPayload({ config })
  const pay = ev?.payload?.payment?.entity
  const razorpayOrderId: string | undefined = pay?.order_id ?? ev?.payload?.order?.entity?.id
  if (!razorpayOrderId) return NextResponse.json({ ok: true })
  const found = await payload.find({ collection: 'orders', where: { 'payment.razorpayOrderId': { equals: razorpayOrderId } }, limit: 1, depth: 0 })
  const o: any = found.docs[0]
  if (!o) return NextResponse.json({ ok: true })

  try {
    if (ev.event === 'payment.captured' || ev.event === 'order.paid') {
      const paid = pay?.amount ?? ev?.payload?.order?.entity?.amount_paid
      if (paid !== toPaise(o.totals.total)) await logEvent(payload, o.id, `Payment of ${paid} paise arrived but the order is ${toPaise(o.totals.total)} paise. Please check it in Razorpay.`)
      else await markPaid(payload, o.id, String(pay?.id ?? 'unknown'), 'webhook')
    } else if (ev.event === 'payment.failed') {
      await logEvent(payload, o.id, `A payment attempt failed: ${String(pay?.error_description ?? 'no reason given').slice(0, 160)}. The customer can try again.`)
    } else if (ev.event === 'refund.processed') {
      const refund = ev?.payload?.refund?.entity
      const full = refund?.amount === toPaise(o.totals.total)
      await logEvent(payload, o.id, `Refund of ₹${(refund?.amount ?? 0) / 100} processed in Razorpay.`, full ? { paymentStatus: 'refunded' } : {})
    }
  } catch (e) {
    console.error('razorpay webhook failed', e)
    return NextResponse.json({ error: 'try again' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
