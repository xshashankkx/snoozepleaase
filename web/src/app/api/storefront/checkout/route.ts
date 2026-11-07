import { handle } from '@/lib/http'
import { startCheckout } from '@/lib/checkout'

export const dynamic = 'force-dynamic'

// Places an order. The browser sends only who, where, what and how many; the server prices everything.
export async function POST(req: Request) {
  return handle(req, 'checkout', 10, startCheckout)
}
