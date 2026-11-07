import { findOrderFor, publicOrder } from '@/lib/checkout'
import { json } from '@/lib/http'
import { clientIp, limited } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// A shopper's own order, shown on the confirmation page. The private link token is required.
export async function GET(req: Request, ctx: { params: Promise<{ number: string }> }) {
  if (limited(`order:${clientIp(req)}`, 60)) return json({ error: 'Too many tries. Please wait a minute and try again.' }, 429)
  const { number } = await ctx.params
  const token = new URL(req.url).searchParams.get('t')
  const o = await findOrderFor(number, token)
  if (!o) return json({ error: 'We could not find that order.' }, 404)
  return json(publicOrder(o))
}
