import seed from '../data/seed.json'

export const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
export const img = (f) => `/img/${f}`

export const CATS = [
  { slug: 'kids-nightwear', label: 'Kids Nightwear', alias: ['kids-night-wear'], blurb: 'Soft button-down nightsuits in prints they will actually ask to wear.' },
  { slug: 'co-ords', label: 'Co-ords', alias: ['coo-rd-set'], blurb: 'Short-sleeve shirt and shorts sets for warm nights and lazy mornings.' },
  { slug: 'bath-towels', label: 'Bath & Towels', alias: ['bathrobe-towel'], blurb: 'Robes and wrap towels in fluffy waffle cotton for after-bath cuddles.' },
  { slug: 'mom-me', label: 'Mom & Me', alias: ['mom-kids-duo', 'adult-nightsuit'], blurb: 'Matching loungewear so the whole family can wind down together.' },
]

function catOf(p) {
  if (p.audience !== 'kids') return 'mom-me'
  if (p.type === 'bathrobe' || p.type === 'towel') return 'bath-towels'
  if (p.type === 'coord_set' || /co-?ord/i.test(p.title)) return 'co-ords'
  return 'kids-nightwear'
}

export function themeOf(p) {
  const t = p.title.toLowerCase()
  if (/mango/.test(t)) return 'fruit'
  if (/florida|ocean|wave|sunset|dolphin|whale|mermaid|sail|shell|shades/.test(t)) return 'sea'
  if (/aviator|car|towel/.test(t) && !/elephant/.test(t)) return 'sky'
  if (/elephant|tiger|jungle|owl|sheep|jurassic|giraffe|berry/.test(t)) return 'jungle'
  return 'night'
}

const ageRange = (s) => {
  const m = /(\d+)\s*-\s*(\d+)\s*y/i.exec(s)
  return m ? [+m[1], +m[2]] : null
}
const sizeKey = (s) => {
  const m = /(\d+)/.exec(s)
  return m ? +m[1] : 99
}

export const products = seed.products.map((p) => {
  const variants = [...p.variants].sort((a, b) => sizeKey(a.size) - sizeKey(b.size))
  const prices = variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const base = variants.find((v) => v.price === min)
  const was = base?.was || null
  const ages = variants.map((v) => ageRange(v.size)).filter(Boolean)
  return {
    ...p,
    variants,
    cat: catOf(p),
    theme: themeOf(p),
    price: min,
    maxPrice: max,
    was,
    off: was ? Math.round((1 - min / was) * 100) : 0,
    stock: variants.reduce((a, v) => a + v.stock, 0),
    ageMin: ages.length ? Math.min(...ages.map((a) => a[0])) : null,
    ageMax: ages.length ? Math.max(...ages.map((a) => a[1])) : null,
    paired: variants.some((v) => v.size.includes(' / ')),
  }
})

export const byHandle = Object.fromEntries(products.map((p) => [p.handle, p]))
const pick = (handles) => handles.map((h) => byHandle[h]).filter(Boolean)
const col = (h) => pick(seed.collections.find((c) => c.handle === h)?.products || [])

export const bestSellers = col('best-seller')
export const newArrivals = col('frontpage')
export const heroPicks = pick(['florida-blue-co-ord-set', 'green-elephant-nightsuit', 'mango-co-ordset', 'aviator-adventure-robe'])

export function collectionBySlug(slug) {
  if (slug === 'all') return { slug, label: 'All dreams', blurb: 'Every nightsuit, co-ord, robe and towel in one place.', items: products }
  if (slug === 'best-sellers') return { slug, label: 'Best Sellers', blurb: 'The sets other parents keep coming back for.', items: bestSellers }
  if (slug === 'new-arrivals') return { slug, label: 'New Arrivals', blurb: 'Fresh off the sewing table.', items: newArrivals }
  const c = CATS.find((c) => c.slug === slug || c.alias.includes(slug))
  if (!c) return null
  return { ...c, items: products.filter((p) => p.cat === c.slug) }
}

export const stockLabel = (n) => (n <= 0 ? 'Sold out' : n <= 5 ? `Only ${n} left` : 'In stock')

export function search(q) {
  const toks = q.toLowerCase().replace(/co[\s-]?ords?/g, 'coord').split(/\s+/).filter(Boolean)
  if (!toks.length) return []
  return products
    .map((p) => {
      const hay = `${p.title} ${p.type} ${p.fabric || ''} ${CATS.find((c) => c.slug === p.cat).label}`.toLowerCase().replace(/co[\s-]?ords?/g, 'coord')
      let s = 0
      for (const t of toks) {
        if (p.title.toLowerCase().replace(/co[\s-]?ords?/g, 'coord').includes(t)) s += 3
        else if (hay.includes(t)) s += 1
        else return null
      }
      return { p, s }
    })
    .filter(Boolean)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
}

export const about = seed.about
export const privacy = seed.privacy
export const tiles = seed.tiles
export const logo = seed.logo
export const heroes = seed.heroes
export const newsletterConsent = seed.newsletterConsent

export function descParagraphs(desc) {
  return desc.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
}
