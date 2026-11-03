// Checks what a Store manager can and cannot do. Creates a throwaway manager and removes it afterwards.
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })
  const email = 'role-check@snoozepleaase.test'
  const mgr = await payload.create({ collection: 'users', data: { email, password: 'Check-' + Math.random().toString(36).slice(2) + 'A1!', name: 'Role Check', role: 'manager' } })
  const as = { user: { ...mgr, collection: 'users' } as any, overrideAccess: false }
  const out: Record<string, unknown> = {}
  try {
    const users = await payload.find({ collection: 'users', ...as })
    out['manager sees staff list (should be just themselves)'] = users.docs.map((u: any) => u.email)
    try { await payload.create({ collection: 'users', data: { email: 'x@x.test', password: 'Aa1!aaaaaa', name: 'x', role: 'owner' }, ...as }); out['manager creates staff'] = 'ALLOWED (bad)' } catch { out['manager creates staff'] = 'denied (good)' }
    try { await payload.update({ collection: 'users', id: mgr.id, data: { role: 'owner' }, ...as }); const re = await payload.findByID({ collection: 'users', id: mgr.id }); out['manager promotes self to owner'] = re.role === 'owner' ? 'ALLOWED (bad)' : 'ignored (good)' } catch { out['manager promotes self to owner'] = 'denied (good)' }
    const p = await payload.find({ collection: 'products', limit: 1, draft: true, ...as })
    out['manager reads products incl. drafts'] = p.totalDocs > 0 ? 'yes (good)' : 'no (bad)'
    const prod: any = p.docs[0]
    await payload.update({ collection: 'products', id: prod.id, data: { print: prod.print ?? 'Role check' }, draft: true, ...as })
    out['manager edits products'] = 'allowed (good)'
  } finally {
    await payload.delete({ collection: 'users', id: mgr.id })
  }
  console.log(JSON.stringify(out, null, 2))
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
