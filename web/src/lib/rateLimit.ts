// A small in-memory limiter for the public endpoints (checkout, pincode check). It protects one running
// copy of the site. When the site runs on several servers this should move to Redis (it is in the PRD).

const hits = new Map<string, number[]>()

export function limited(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return recent.length > max
}

export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'local').trim()
