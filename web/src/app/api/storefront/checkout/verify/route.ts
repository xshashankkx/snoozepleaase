import { handle } from '@/lib/http'
import { confirmPayment } from '@/lib/checkout'

export const dynamic = 'force-dynamic'

// The shop's page reports a finished Razorpay payment; the signature is checked here.
export async function POST(req: Request) {
  return handle(req, 'verify', 20, confirmPayment)
}
