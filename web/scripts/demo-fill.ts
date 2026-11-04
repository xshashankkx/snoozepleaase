// DEMO ONLY. Fills every product that is missing SKU, barcode, weight or box size with clearly
// fake placeholder values (SKUs start with DEMO-) and publishes it, so the storefront has products
// to show. Run `npm run demo-fill -- --undo` to remove the placeholders and unpublish again.
// Real values from the team (spreadsheet import) are never touched: only blank cells are filled.
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { productIssues } from '../src/lib/readiness'

const here = path.dirname(fileURLToPath(import.meta.url))
const seed = JSON.parse(fs.readFileSync(path.join(here, '../../src/data/seed.json'), 'utf8'))
const undo = process.argv.includes('--undo')

const PACK: Record<string, { g: number; box: [number, number, number] }> = {
  nightsuit: { g: 350, box: [30, 24, 4] }, coord_set: { g: 280, box: [28, 22, 4] },
  bathrobe: { g: 520, box: [32, 26, 7] }, towel: { g: 420, box: [30, 24, 6] }, mom_kid_set: { g: 650, box: [34, 28, 8] },
}
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return Math.abs(h) }

async function main() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'products', limit: 500, depth: 0, draft: true })
  let changed = 0, skipped = 0
  for (const p of docs as any[]) {
    const isDemo = (p.variants || []).length > 0 && p.variants.every((v: any) => String(v.sku || '').startsWith('DEMO-'))
    if (undo) {
      if (!isDemo) { skipped++; continue }
      const variants = p.variants.map((v: any) => ({ ...v, sku: null, barcode: null, weightGrams: null, box: { lengthCm: null, widthCm: null, heightCm: null } }))
      await payload.update({ collection: 'products', id: p.id, data: { variants, _status: 'draft' }, depth: 0 })
      changed++
      continue
    }
    const seedP = seed.products.find((s: any) => s.handle === p.handle)
    const pack = PACK[p.type] ?? PACK.nightsuit
    const variants = (p.variants || []).map((v: any, i: number) => {
      const seedSku = seedP?.variants.find((x: any) => x.size === v.size)?.sku
      return {
        ...v,
        sku: v.sku || `DEMO-${String(seedSku || `${p.handle}-${i}`).toUpperCase()}`,
        barcode: v.barcode || `8900${String(hash(p.handle + i)).padStart(9, '0').slice(0, 9)}`,
        weightGrams: v.weightGrams || pack.g,
        box: {
          lengthCm: v.box?.lengthCm || pack.box[0], widthCm: v.box?.widthCm || pack.box[1], heightCm: v.box?.heightCm || pack.box[2],
        },
      }
    })
    const ready = productIssues({ ...p, variants })
    if (ready.length) { console.warn(`  ${p.title} not ready: ${ready.join('; ')}`); skipped++; continue }
    await payload.update({ collection: 'products', id: p.id, data: { variants, _status: 'published' }, depth: 0 })
    changed++
  }
  console.log(undo ? `Removed demo values from ${changed} products (${skipped} left alone).` : `Filled and published ${changed} products (${skipped} skipped).`)
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
