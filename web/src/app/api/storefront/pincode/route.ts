import { getPayload } from 'payload'
import config from '@payload-config'
import { json } from '@/lib/http'
import { clientIp, limited } from '@/lib/rateLimit'
import { checkServiceability } from '@/lib/shiprocket'
import { pickupPincode } from '@/lib/checkout'

export const dynamic = 'force-dynamic'

// "Can you deliver here, how soon, and is cash on delivery possible?" for a pincode.
export async function GET(req: Request) {
  if (limited(`pin:${clientIp(req)}`, 60)) return json({ error: 'Too many tries. Please wait a minute and try again.' }, 429)
  const url = new URL(req.url)
  const pin = url.searchParams.get('pin') ?? ''
  if (!/^[1-9]\d{5}$/.test(pin)) return json({ error: 'Enter a valid 6-digit pincode.' }, 400)
  const grams = Math.min(20000, Math.max(100, Number(url.searchParams.get('grams')) || 500))
  try {
    const settings: any = await (await getPayload({ config })).findGlobal({ slug: 'site-settings', depth: 0 })
    const pickup = pickupPincode(settings)
    const base = await checkServiceability({ pickup, delivery: pin, cod: false, weightKg: grams / 1000 })
    if (!base.configured) return json({ configured: false, serviceable: null, cod: null, days: null })
    if (base.serviceable !== true) return json({ configured: true, serviceable: base.serviceable, cod: false, days: null })
    const cod = settings.codEnabled === false ? { codAvailable: false } : await checkServiceability({ pickup, delivery: pin, cod: true, weightKg: grams / 1000 })
    return json({ configured: true, serviceable: true, cod: cod.codAvailable === true || (cod as any).serviceable === true, days: base.days })
  } catch (e) {
    console.error('pincode check failed', e)
    return json({ configured: true, serviceable: null, cod: null, days: null })
  }
}
