// Loads the storefront's current words, menus, collections and home page into the CMS, so nothing
// is typed twice. Safe to re-run: collections and pages that already exist are left alone, and
// globals that already have a saved version are skipped unless you pass --force.
//   npm run seed:content
//   npm run seed:content -- --force     (overwrites the globals, losing manual edits)
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload, type Payload } from 'payload'
import config from '../src/payload.config'
import { mdToLexical } from '../src/lib/lexical'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const seed = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seed.json'), 'utf8'))
const force = process.argv.includes('--force')

const ALT: Record<string, string> = {
  'h-068aa30c.webp': 'A vintage sewing machine on a wooden table beside fabric and scissors',
  'h-009a82c4.webp': 'Blue block-printed cotton fabric folded beside a sewing machine and tailor scissors',
  'h-c1877c38.webp': 'Navy and purple block-printed cotton fabrics laid flat on a wooden table',
  'life-dino-kid.webp': 'Smiling toddler in a dinosaur-print pyjama set sitting on a bed',
  'life-minnie-kid.webp': 'Young child in a Minnie Mouse print pyjama set on a bed by a window',
  'life-redjungle-3.webp': 'Woman relaxing on a bed in a red jungle-print pyjama set',
  'life-bathtowel.webp': 'A colourful cars-print towel draped over a wooden stool in a bathroom with toy ducks',
  'life-dino-fold.webp': 'Folded dinosaur-print pyjama set on a beige cloth',
  'life-bluecow.webp': 'Folded blue and white printed shirt on a cream background',
}

async function main() {
  const payload = await getPayload({ config })

  const media = new Map<string, number>()
  const upload = async (file: string) => {
    if (media.has(file)) return media.get(file)!
    const found = await payload.find({ collection: 'media', where: { filename: { equals: file } }, limit: 1 })
    let id = found.docs[0]?.id as number | undefined
    if (!id) {
      const doc = await payload.create({ collection: 'media', data: { alt: ALT[file] ?? file }, filePath: path.join(root, 'public/img', file) })
      id = doc.id as number
    }
    media.set(file, id)
    return id
  }

  const productId = async (handle: string) => {
    const r = await payload.find({ collection: 'products', where: { handle: { equals: handle } }, limit: 1, draft: true, depth: 0 })
    if (!r.docs[0]) console.warn(`  (missing product ${handle})`)
    return r.docs[0]?.id as number | undefined
  }
  const productIds = async (handles: string[]) => (await Promise.all(handles.map(productId))).filter(Boolean) as number[]

  const hasSaved = async (slug: string) => {
    // A global that has never been saved comes back with defaults only, so it has no createdAt.
    const g: any = await payload.findGlobal({ slug: slug as any, depth: 0, draft: true })
    return !!g.createdAt
  }
  const setGlobal = async (slug: string, data: any) => {
    if (!force && (await hasSaved(slug))) { console.log(`  ${slug}: already saved, skipped`); return }
    await payload.updateGlobal({ slug: slug as any, data: { ...data, _status: 'published' } })
    console.log(`  ${slug}: saved and published`)
  }
  const ensureDoc = async (collection: any, slugValue: string, data: any, field = 'slug') => {
    const f = await payload.find({ collection, where: { [field]: { equals: slugValue } }, limit: 1, draft: true, depth: 0 })
    if (f.docs[0]) { console.log(`  ${collection}/${slugValue}: exists, skipped`); return f.docs[0].id as number }
    const d = await payload.create({ collection, data: { ...data, _status: 'published' } })
    console.log(`  ${collection}/${slugValue}: created`)
    return d.id as number
  }

  console.log('Collections')
  const blurbs: Record<string, string> = {
    'kids-nightwear': 'Soft button-down nightsuits in prints they will actually ask to wear.',
    'co-ords': 'Short-sleeve shirt and shorts sets for warm nights and lazy mornings.',
    'bath-towels': 'Robes and wrap towels in fluffy waffle cotton for after-bath cuddles.',
    'mom-me': 'Matching loungewear so the whole family can wind down together.',
  }
  const titles: Record<string, string> = { 'kids-nightwear': 'Kids Nightwear', 'co-ords': 'Co-ords', 'bath-towels': 'Bath & Towels', 'mom-me': 'Mom & Me' }
  for (const k of Object.keys(titles)) {
    await ensureDoc('product-collections', k, { title: titles[k], slug: k, kind: 'category', category: k, blurb: blurbs[k] })
  }
  const listFor = (h: string) => seed.collections.find((c: any) => c.handle === h)?.products ?? []
  const bestId = await ensureDoc('product-collections', 'best-sellers', {
    title: 'Best Sellers', slug: 'best-sellers', kind: 'curated', blurb: 'The sets other parents keep coming back for.', products: await productIds(listFor('best-seller')),
  })
  const newId = await ensureDoc('product-collections', 'new-arrivals', {
    title: 'New Arrivals', slug: 'new-arrivals', kind: 'curated', blurb: 'Fresh off the sewing table.', products: await productIds(listFor('frontpage')),
  })

  console.log('Pages')
  const sizeChart = (await payload.find({ collection: 'size-charts', limit: 1 })).docs[0]?.id
  await ensureDoc('pages', 'about-us', {
    title: 'About Snooze Pleaase', slug: 'about-us', template: 'about', body: mdToLexical(seed.about),
    photos: [{ image: await upload('h-068aa30c.webp') }, { image: await upload('h-c1877c38.webp') }],
  })
  await ensureDoc('pages', 'privacy-policy', { title: 'Privacy policy', slug: 'privacy-policy', template: 'standard', body: mdToLexical(seed.privacy) })
  await ensureDoc('pages', 'shipping-returns', {
    title: 'Shipping & returns', slug: 'shipping-returns', template: 'standard',
    body: mdToLexical([
      '## Shipping',
      'Standard delivery takes 4–7 days and costs ₹79. It is free when your bag is ₹1,999 or more after the sale discount. Express delivery takes 2–3 days and costs ₹149.',
      'We ship across India. Cash on delivery, UPI and card payments are accepted.',
      '## Returns',
      'Unworn, unwashed items with their tags can be returned within 7 days of delivery. Message us on WhatsApp or email with your order number and we will arrange the pickup.',
      '## Exchanges',
      'Need a different size? Tell us within 7 days and we will swap it if the size is in stock.',
    ].join('\n')),
  })
  const faq = (q: string, a: string) => ({ question: q, answer: mdToLexical(a) })
  await ensureDoc('pages', 'faq', {
    title: 'Questions, answered', slug: 'faq', template: 'faq',
    faqs: [
      faq('How do I pick the right size?', "Measure your child's height and chest, then match them on our [size guide](/pages/size-guide). If they are between sizes, choose the larger one. Our trousers have an elasticated waist, so there is room to grow."),
      faq('What are the fabrics made of?', 'Our nightsuits and co-ords are 100% hand-picked cotton in crisp poplin and percale. Towels and robes use soft waffle cotton. Each product page lists its fabric.'),
      faq('How do I wash them?', 'Wash cold with similar colours, tumble dry low and skip the bleach. That keeps prints bright and the cotton soft.'),
      faq('How long does delivery take?', 'Standard delivery takes 4–7 days and express takes 2–3 days. Shipping is free on standard orders over ₹1,999.'),
      faq('Can I pay on delivery?', 'Yes. Cash on delivery, UPI and cards are all available at checkout.'),
      faq('Can I return or exchange something?', 'Unworn items with tags can be returned within 7 days. See [shipping and returns](/pages/shipping-returns) for the steps.'),
      faq('What is the Dreamtime Sale?', 'Right now 10% comes off your bag automatically at checkout. There is no code to enter.'),
    ],
  })
  await ensureDoc('pages', 'size-guide', {
    title: 'Size guide', slug: 'size-guide', template: 'size-guide', sizeChart,
    intro: 'Measure your child standing straight, then match height and chest to the closest row. Between sizes? Choose the larger one.',
    body: mdToLexical('Mom & Me sets use S to 3XL for grown-ups. Message us if you would like measurements for a specific piece.'),
  })
  await ensureDoc('pages', 'contact', {
    title: 'Contact us', slug: 'contact', template: 'contact',
    intro: 'Questions about sizes, an order or a custom bulk gift? We read every message.',
  })

  console.log('Globals')
  await setGlobal('site-settings', {
    brandName: 'Snooze Pleaase', tagline: 'Sleep naturally, dream sustainably.',
    whatsapp: '+91 00000 00000', email: 'hello@snoozepleaase.com', instagram: 'snoozepleaase', hours: 'Mon–Sat, 10am–6pm IST',
    freeShippingOver: 1999, standardShipping: 79, expressShipping: 149, standardDays: '4–7', expressDays: '2–3', returnsDays: 7,
    newsletterConsent: seed.newsletterConsent,
  })
  await setGlobal('announcement', {
    bar: { enabled: false, text: 'Free shipping over ₹1,999' },
    saleTag: { enabled: true, name: 'Dreamtime Sale', offerText: '10% OFF', url: '/collections/all' },
  })
  await setGlobal('navigation', {
    header: [
      { label: 'Kids Nightwear', url: '/collections/kids-nightwear' }, { label: 'Co-ords', url: '/collections/co-ords' },
      { label: 'Bath & Towels', url: '/collections/bath-towels' }, { label: 'Mom & Me', url: '/collections/mom-me' },
    ],
    footer: [
      { heading: 'Shop', links: [...Object.keys(titles).map((k) => ({ label: titles[k], url: `/collections/${k}` })), { label: 'Best Sellers', url: '/collections/best-sellers' }] },
      { heading: 'Help', links: [
        { label: 'Shipping & returns', url: '/pages/shipping-returns' }, { label: 'Size guide', url: '/pages/size-guide' },
        { label: 'FAQ', url: '/pages/faq' }, { label: 'Contact us', url: '/pages/contact' },
      ] },
      { heading: 'Snooze Pleaase', links: [
        { label: 'About us', url: '/pages/about-us' }, { label: 'Privacy policy', url: '/pages/privacy-policy' },
        { label: 'Account', url: '/account' }, { label: 'Wishlist', url: '/wishlist' },
      ] },
    ],
  })
  await setGlobal('age-step', {
    heading: 'Who are you shopping for?', intro: 'Pick an age and we will show the sizes that fit.', skipLabel: 'Show me everything',
    stages: [
      { label: 'Toddler', plural: 'Toddlers', key: 'toddler', agesLabel: '1–3', ageFrom: 1, ageTo: 3, picks: await productIds(['green-elephant-nightsuit-copy-1', 'green-elephant-nightsuit', 'mango-co-ordset', 'sheep-co-ordset', 'bubblegum-coord']) },
      { label: 'Little', plural: 'Little ones', key: 'little', agesLabel: '4–6', ageFrom: 4, ageTo: 6, picks: await productIds(['dolphin-nightsuit', 'florida-blue-co-ord-set', 'red-yellow-car-nightsuit', 'minnie-pink-co-ord-set', 'doraemon-co-ord-set']) },
      { label: 'Big', plural: 'Big kids', key: 'big', agesLabel: '7–9', ageFrom: 7, ageTo: 9, picks: await productIds(['coin-blue-nightsuit', 'shades-nightsuit', 'red-tiger-jungle-co-ord-set', 'co-ord-set-brown', 'midnight-elegance-nightsuit']) },
      { label: 'Tween', plural: 'Tweens', key: 'tween', agesLabel: '10+', ageFrom: 10, ageTo: 99, picks: await productIds(['midnight-elegance-nightsuit', 'makeup-frill-nightsuit-copy']) },
    ],
  })
  const strip = ['life-dino-kid.webp', 'life-minnie-kid.webp', 'life-redjungle-3.webp', 'life-bathtowel.webp', 'life-dino-fold.webp', 'life-bluecow.webp']
  await setGlobal('home-page', {
    headlineLine1: 'Dream big,', headlineLine2: 'sleep cozy',
    subline: 'Premium handcrafted nightwear designed for relaxation, elegance and better sleep.',
    primaryButton: { label: 'Shop now', url: '/collections/all' }, secondaryButton: { label: 'Kids nightwear', url: '/collections/kids-nightwear' },
    featured: await productIds(['florida-blue-co-ord-set', 'green-elephant-nightsuit', 'mango-co-ordset', 'aviator-adventure-robe']),
    ticker: ['100% hand-picked cotton', 'Poplin & percale', 'Free shipping over ₹1,999', 'Cash on delivery available', 'Ethically crafted', 'Sleep naturally, dream sustainably'].map((t) => ({ text: t })),
    bestSellersHeading: 'Best sellers', bestSellers: bestId,
    boxesHeading: 'Choose your box',
    boxes: [
      { category: 'kids-nightwear', photoProduct: await productId('green-elephant-nightsuit') },
      { category: 'co-ords', photoProduct: await productId('florida-blue-co-ord-set') },
      { category: 'bath-towels', photoProduct: await productId('aviator-adventure-robe') },
      { category: 'mom-me', photoProduct: await productId('midnight-elegance-matching-nighsuit') },
    ],
    storyHeading: 'Luxury in every thread',
    storyLede: 'Based in India, Snooze Pleaase is a premium nightwear brand dedicated to the art of rest. We believe that true luxury lies in simplicity and superior comfort.',
    promises: [
      { icon: 'leaf', title: 'Pure comfort', text: '100% hand-picked cotton, in crisp, breathable poplin and percale.' },
      { icon: 'star', title: 'Curated designs', text: 'Unique, hand-picked patterns and thoughtful details that blend timeless style with a modern touch.' },
      { icon: 'shield', title: 'Ethically crafted', text: 'Made with love and meticulous care, so every night can be a quiet one.' },
    ],
    storyButton: { label: 'Our story', url: '/pages/about-us' },
    storyImages: [{ image: await upload('h-068aa30c.webp') }, { image: await upload('h-009a82c4.webp') }],
    stripHeading: 'Bedtime, photographed', strip: await Promise.all(strip.map(async (f) => ({ image: await upload(f) }))),
    newHeading: 'Just landed', newArrivals: newId,
    closingTitle: 'Sleep naturally,\ndream sustainably.', closingButton: { label: 'Shop everything', url: '/collections/all' },
  })

  console.log('Done.')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
