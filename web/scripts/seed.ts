// Loads the 44 products and 377 variants from the working-model data into the CMS.
//   npm run seed                  products arrive as drafts with the real gaps (no SKU, weight, box size)
//   npm run seed -- --demo-fill   also fills clearly-fake placeholder codes, weights and boxes, and publishes
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { productIssues } from '../src/lib/readiness'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const seed = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seed.json'), 'utf8'))
const demoFill = process.argv.includes('--demo-fill')

const lexical = (text: string) => ({
  root: {
    type: 'root', direction: 'ltr', format: '', indent: 0, version: 1,
    children: text.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean).map((t) => ({
      type: 'paragraph', direction: 'ltr', format: '', indent: 0, version: 1,
      children: [{ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
    })),
  },
})

const categoryOf = (p: any) => {
  if (p.audience !== 'kids') return 'mom-me'
  if (p.type === 'bathrobe' || p.type === 'towel') return 'bath-towels'
  if (p.type === 'coord_set' || /co-?ord/i.test(p.title)) return 'co-ords'
  return 'kids-nightwear'
}

// Placeholder packing data for --demo-fill only. Replace with real figures from the team.
const PACK: Record<string, { g: number; box: [number, number, number] }> = {
  nightsuit: { g: 350, box: [30, 24, 4] }, coord_set: { g: 280, box: [28, 22, 4] },
  bathrobe: { g: 520, box: [32, 26, 7] }, towel: { g: 420, box: [30, 24, 6] }, mom_kid_set: { g: 650, box: [34, 28, 8] },
}

async function main() {
  const payload = await getPayload({ config })
  console.log(`Seeding ${seed.products.length} products${demoFill ? ' (with demo placeholders)' : ''}...`)

  const chart = await payload.find({ collection: 'size-charts', limit: 1 })
  let sizeChartId = chart.docs[0]?.id
  if (!sizeChartId) {
    const rows = [
      ['1–2 years', '80–92', '51', '50'], ['2–3 years', '92–98', '52', '51'], ['3–4 years', '98–104', '54', '52'], ['4–5 years', '104–110', '56', '53'],
      ['5–6 years', '110–116', '58', '54'], ['6–7 years', '116–122', '60', '55'], ['7–8 years', '122–128', '62', '56'], ['8–9 years', '128–134', '64', '57'],
      ['9–10 years', '134–140', '67', '58'], ['10–11 years', '140–146', '70', '60'], ['11–12 years', '146–152', '73', '62'], ['12–13 years', '152–158', '76', '64'],
    ].map(([label, height, chest, waist]) => ({ label, height, chest, waist }))
    const c = await payload.create({
      collection: 'size-charts',
      data: { title: 'Kids nightwear and co-ords (placeholder, confirm measurements)', unit: 'cm', rows, note: 'Measure your child standing straight. Between sizes? Choose the larger one.' },
    })
    sizeChartId = c.id
  }

  const mediaCache = new Map<string, number>()
  const upload = async (file: string, alt: string) => {
    if (mediaCache.has(file)) return mediaCache.get(file)!
    const found = await payload.find({ collection: 'media', where: { filename: { equals: file } }, limit: 1 })
    if (found.docs[0]) { mediaCache.set(file, found.docs[0].id as number); return found.docs[0].id as number }
    const doc = await payload.create({ collection: 'media', data: { alt }, filePath: path.join(root, 'public/img', file) })
    mediaCache.set(file, doc.id as number)
    return doc.id as number
  }

  let created = 0, skipped = 0, published = 0
  for (const p of seed.products) {
    const exists = await payload.find({ collection: 'products', where: { handle: { equals: p.handle } }, limit: 1, draft: true })
    if (exists.docs[0]) { skipped++; continue }

    const images: { image: number }[] = []
    for (let i = 0; i < p.images.length; i++) {
      images.push({ image: await upload(p.images[i], `${p.title}, photo ${i + 1}`) })
    }
    const pack = PACK[p.type] ?? PACK.nightsuit
    const variants = p.variants.map((v: any, i: number) => ({
      size: v.size,
      price: v.price,
      compareAtPrice: v.was ?? undefined,
      stock: v.stock,
      ...(demoFill ? {
        sku: String(v.sku).toUpperCase(),
        barcode: `8900${String(Math.abs(hash(p.handle + i))).padStart(9, '0').slice(0, 9)}`,
        weightGrams: pack.g,
        box: { lengthCm: pack.box[0], widthCm: pack.box[1], heightCm: pack.box[2] },
      } : {}),
    }))

    const data: any = {
      title: p.title, handle: p.handle, category: categoryOf(p), type: p.type, audience: p.audience,
      fabric: p.fabric ?? undefined, description: lexical(p.desc), images, variants, sizeChart: sizeChartId,
    }
    const doc = await payload.create({ collection: 'products', data, draft: true })
    created++
    if (demoFill) {
      const ready = productIssues({ ...data, variants })
      if (!ready.length) {
        await payload.update({ collection: 'products', id: doc.id, data: { _status: 'published' } })
        published++
      } else console.warn(`  ${p.title} not ready: ${ready.join('; ')}`)
    }
    if (created % 5 === 0) console.log(`  ${created} products created...`)
  }
  console.log(`Done. Created ${created}, skipped ${skipped} existing${demoFill ? `, published ${published}` : ''}.`)
  process.exit(0)
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

main().catch((e) => { console.error(e); process.exit(1) })
