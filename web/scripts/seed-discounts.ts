// Creates the Dreamtime Sale (live) and a few switched-OFF example offers so the team can see how
// each kind is set up. Safe to re-run: anything with the same name is left alone.
//   npm run seed:discounts
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const OFFERS: any[] = [
  {
    title: 'Dreamtime Sale', active: true, method: 'automatic', type: 'percentage', value: 10, appliesTo: 'all', combinable: false,
    headline: { showInHeader: true, tagName: 'Dreamtime Sale', tagText: '10% OFF' },
  },
  { title: 'Welcome code (example)', active: false, method: 'code', code: 'WELCOME10', type: 'percentage', value: 10, appliesTo: 'all', rules: { firstOrderOnly: true } },
  { title: 'Buy 2, get 1 free (example)', active: false, method: 'automatic', type: 'buy_x_get_y', buy: { buyQty: 2, getQty: 1, getPercent: 100 }, appliesTo: 'all' },
  { title: 'Free shipping code (example)', active: false, method: 'code', code: 'FREESHIP', type: 'free_shipping', combinable: true },
  { title: '₹150 off over ₹1,500 (example)', active: false, method: 'code', code: 'SAVE150', type: 'flat', value: 150, appliesTo: 'all', rules: { minSubtotal: 1500 } },
]

async function main() {
  const payload = await getPayload({ config })
  for (const o of OFFERS) {
    const found = await payload.find({ collection: 'discounts', where: { title: { equals: o.title } }, limit: 1, depth: 0 })
    if (found.docs[0]) { console.log(`  ${o.title}: exists, skipped`); continue }
    await payload.create({ collection: 'discounts', data: o })
    console.log(`  ${o.title}: created${o.active ? ' (live)' : ' (off)'}`)
  }
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
