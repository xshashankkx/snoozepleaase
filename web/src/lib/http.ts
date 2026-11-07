import { NextResponse } from 'next/server'
import { CheckoutError } from './checkout'
import { clientIp, limited } from './rateLimit'

const noStore = { 'Cache-Control': 'no-store' }
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore })

// Shared wrapper for the public order endpoints: size limit, JSON parsing, rate limit and tidy errors.
export async function handle(req: Request, bucket: string, perMinute: number, run: (body: any) => Promise<unknown>, maxBytes = 20_000) {
  if (limited(`${bucket}:${clientIp(req)}`, perMinute)) return json({ error: 'Too many tries. Please wait a minute and try again.' }, 429)
  const text = await req.text()
  if (text.length > maxBytes) return json({ error: 'That request is too large.' }, 413)
  let body: unknown
  try { body = JSON.parse(text) } catch { return json({ error: 'Send JSON.' }, 400) }
  try {
    return json(await run(body))
  } catch (e) {
    if (e instanceof CheckoutError) return json({ error: e.message, code: e.code, ...e.extra }, e.status)
    console.error(`${bucket} failed`, e)
    return json({ error: 'Something went wrong on our side. Please try again.' }, 500)
  }
}
