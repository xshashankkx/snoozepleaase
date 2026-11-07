import type { Payload } from 'payload'
import { assignCourier, checkServiceability, createShiprocketOrder, shiprocketConfigured, trackingUrl, parcelOf } from './shiprocket'

// What happens to an order once it is confirmed (paid online, or cash on delivery confirmed by staff).
// Everything here writes with `context.skipHooks` so it cannot trigger itself again.

const quiet = { skipHooks: true }

// Pass `req` when calling from inside a save hook, so the write joins the same database transaction
// (otherwise it would wait for the row that the save itself is holding).
export async function logEvent(payload: Payload, id: number | string, text: string, patch: Record<string, unknown> = {}, req?: any) {
  const o: any = await payload.findByID({ collection: 'orders', id, depth: 0, req })
  await payload.update({
    collection: 'orders', id, context: quiet, req,
    data: { ...patch, timeline: [...(o.timeline ?? []), { at: new Date().toISOString(), text }] } as any,
  })
}

export async function pushToShiprocket(payload: Payload, id: number | string) {
  const o: any = await payload.findByID({ collection: 'orders', id, depth: 0 })
  if (o.shipment?.shiprocketOrderId) return
  if (!shiprocketConfigured()) {
    await logEvent(payload, id, 'Shiprocket is not connected yet, so this order was not sent. Ship it by hand for now.')
    return
  }
  try {
    const r = await createShiprocketOrder({
      number: o.number, placedAt: new Date(o.createdAt), paymentMethod: o.paymentMethod, note: o.note,
      contact: o.contact, address: o.address,
      lines: (o.lines ?? []).map((l: any) => ({ title: l.title, sku: l.sku, size: l.size, qty: l.qty, price: l.price, weightGrams: l.weightGrams, box: l.box })),
      totals: o.totals,
    })
    let shipment: any = { ...o.shipment, shiprocketOrderId: String(r.orderId), shipmentId: String(r.shipmentId), lastError: '', pushAgain: false }
    let note = `Sent to Shiprocket (order ${r.orderId}).`
    // Picking a courier spends money, so it only happens on its own when the Owner has switched it on.
    if (process.env.SHIPROCKET_AUTO_AWB === 'true') {
      try {
        const settings: any = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
        const parcel = parcelOf(o.lines ?? [])
        const s = await checkServiceability({ pickup: String(settings.pickupPincode || process.env.SHIPROCKET_PICKUP_PINCODE || ''), delivery: o.address.pin, cod: o.paymentMethod === 'cod', weightKg: parcel.weight })
        const c = await assignCourier(r.shipmentId, s.courierId)
        shipment = { ...shipment, awb: c.awb, courier: c.courier, trackingUrl: trackingUrl(c.awb) }
        note += ` Courier ${c.courier}, tracking number ${c.awb}.`
      } catch (e: any) {
        note += ` A courier could not be assigned yet: ${String(e.message).slice(0, 160)}`
      }
    }
    await logEvent(payload, id, note, { shipment })
  } catch (e: any) {
    const message = String(e?.message ?? e).slice(0, 300)
    await logEvent(payload, id, `Could not send to Shiprocket: ${message}`, { shipment: { ...o.shipment, lastError: message, pushAgain: false } })
  }
}

// Marks an order paid. Safe to call twice (the browser and the webhook both report the same payment).
export async function markPaid(payload: Payload, id: number | string, paymentId: string, via: 'browser' | 'webhook') {
  const o: any = await payload.findByID({ collection: 'orders', id, depth: 0 })
  if (o.paymentStatus === 'paid') return o
  const updated: any = await payload.update({
    collection: 'orders', id, context: quiet,
    data: {
      paymentStatus: 'paid', status: o.status === 'cancelled' ? 'cancelled' : 'confirmed',
      payment: { ...o.payment, razorpayPaymentId: paymentId, paidAt: new Date().toISOString() },
      timeline: [...(o.timeline ?? []), { at: new Date().toISOString(), text: `Payment received (${paymentId}), confirmed by ${via}.` }],
    } as any,
  })
  if (updated.status === 'confirmed') void pushToShiprocket(payload, id).catch((e) => console.error('shiprocket push failed', e))
  return updated
}
