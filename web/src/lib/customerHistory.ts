import type { Payload, Where } from 'payload'
import type { Customer } from './discounts'

export const normEmail = (s: unknown) => String(s ?? '').trim().toLowerCase()
export const normPhone = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10)

// Orders that never completed do not count as "an earlier order".
export const NOT_COUNTED = ['awaiting_payment', 'payment_failed', 'cancelled']

// What the shop knows about a shopper, from the orders saved on the server and matched on email or phone.
// This is what first-order and once-per-customer offers are checked against.
export async function customerHistory(payload: Payload, ident: { email?: unknown; phone?: unknown }): Promise<Customer> {
  const email = normEmail(ident.email)
  const phone = normPhone(ident.phone)
  const match: Where[] = []
  if (email) match.push({ 'contact.email': { equals: email } })
  if (phone.length === 10) match.push({ 'contact.phone': { equals: phone } })
  if (!match.length) return { firstOrder: undefined, usedOfferIds: [] }
  const found = await payload.find({
    collection: 'orders', limit: 200, depth: 0, pagination: false,
    where: { and: [{ or: match }, { status: { not_in: NOT_COUNTED } }] },
  })
  const docs = found.docs as any[]
  return {
    firstOrder: docs.length === 0,
    usedOfferIds: docs.flatMap((o) => (o.discounts ?? []).map((d: any) => String(d.offerId))).filter(Boolean),
  }
}
