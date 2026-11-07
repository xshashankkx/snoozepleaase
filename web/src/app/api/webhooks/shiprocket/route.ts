import { NextResponse } from 'next/server'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { trackingUrl, verifyShiprocketToken } from '@/lib/shiprocket'
import { logEvent } from '@/lib/fulfil'

export const dynamic = 'force-dynamic'

const RANK: Record<string, number> = { confirmed: 1, shipped: 2, delivered: 3 }

// Shiprocket calls this as parcels move. In Shiprocket > Settings > API > Webhooks, set this address
// (https://YOUR-SITE/api/webhooks/shiprocket) and a token; put the same token in SHIPROCKET_WEBHOOK_TOKEN.
export async function POST(req: Request) {
  if (!verifyShiprocketToken(req.headers.get('x-api-key'))) return NextResponse.json({ error: 'bad token' }, { status: 401 })
  let ev: any
  try { ev = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const payload = await getPayload({ config })
  const number = String(ev?.order_id ?? '')
  const awb = String(ev?.awb ?? '')
  const where: Where | null = number ? { number: { equals: number } } : awb ? { 'shipment.awb': { equals: awb } } : null
  if (!where) return NextResponse.json({ ok: true })
  const o: any = (await payload.find({ collection: 'orders', where, limit: 1, depth: 0 })).docs[0]
  if (!o) return NextResponse.json({ ok: true })

  const text = String(ev?.current_status ?? ev?.shipment_status ?? '').toUpperCase()
  let status = o.status
  if (/UNDELIVERED|RTO|CANCEL/.test(text)) status = o.status
  else if (/DELIVERED/.test(text)) status = 'delivered'
  else if (/PICKED|TRANSIT|OUT FOR|SHIPPED|REACHED|DISPATCH/.test(text)) status = 'shipped'
  // Only ever move forward, and never revive a cancelled order.
  if (o.status === 'cancelled' || (RANK[status] ?? 0) <= (RANK[o.status] ?? 0)) status = o.status

  try {
    const shipment = {
      ...o.shipment,
      status: String(ev?.current_status ?? ev?.shipment_status ?? o.shipment?.status ?? ''),
      ...(awb && !o.shipment?.awb ? { awb, courier: String(ev?.courier_name ?? o.shipment?.courier ?? ''), trackingUrl: trackingUrl(awb) } : {}),
    }
    const changed = shipment.status !== (o.shipment?.status ?? '') || status !== o.status
    if (changed) await logEvent(payload, o.id, `Courier update: ${shipment.status || 'status changed'}.`, { shipment, status })
  } catch (e) {
    console.error('shiprocket webhook failed', e)
    return NextResponse.json({ error: 'try again' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
