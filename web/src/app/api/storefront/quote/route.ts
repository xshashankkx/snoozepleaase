import { NextResponse } from 'next/server'
import { buildQuote } from '@/lib/quote'

export const dynamic = 'force-dynamic'

// The shop asks here what a bag costs. Prices, stock, offers and codes are all checked on the server.
export async function POST(req: Request) {
  const text = await req.text()
  if (text.length > 20_000) return NextResponse.json({ error: 'That request is too large.' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(text) } catch { return NextResponse.json({ error: 'Send JSON.' }, { status: 400 }) }
  try {
    return NextResponse.json(await buildQuote(body), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('quote failed', e)
    return NextResponse.json({ error: 'We could not price your bag just now. Please try again.' }, { status: 500 })
  }
}
