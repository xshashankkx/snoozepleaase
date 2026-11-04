// Shared by the server (page data) and the browser (search, wishlist): turns a CMS product into
// the shape the storefront components use, plus the small helpers they rely on.

export const money = (n) => '₹' + Math.round(n).toLocaleString('en-IN')

export function themeOf(title) {
  const t = String(title || '').toLowerCase()
  if (/mango/.test(t)) return 'fruit'
  if (/florida|ocean|wave|sunset|dolphin|whale|mermaid|sail|shell|shades/.test(t)) return 'sea'
  if (/aviator|car|towel/.test(t) && !/elephant/.test(t)) return 'sky'
  if (/elephant|tiger|jungle|owl|sheep|jurassic|giraffe|berry/.test(t)) return 'jungle'
  return 'night'
}

const sizeKey = (s) => {
  const m = /(\d+)/.exec(s)
  return m ? +m[1] : 99
}
const ageRange = (s) => {
  const m = /(\d+)\s*-\s*(\d+)\s*y/i.exec(s)
  return m ? [+m[1], +m[2]] : null
}

// Flattens a rich-text document into plain paragraphs (the product description uses this).
export function lexicalParagraphs(doc) {
  const out = []
  const text = (n) => (n.type === 'text' ? n.text || '' : (n.children || []).map(text).join(''))
  for (const block of doc?.root?.children || []) {
    if (block.type === 'list') for (const li of block.children || []) out.push(text(li))
    else out.push(text(block))
  }
  return out.map((s) => s.trim()).filter(Boolean)
}

const media = (m) => {
  if (!m || typeof m !== 'object' || !m.url) return null
  return { url: m.url, card: m.sizes?.card?.url || m.url, large: m.sizes?.large?.url || m.url, thumb: m.sizes?.thumb?.url || m.url, alt: m.alt || '', width: m.width || 800, height: m.height || 1000 }
}
export const mapMedia = media

export function mapProduct(d) {
  const images = (d.images || []).map((x) => media(x.image)).filter(Boolean)
  const variants = (d.variants || [])
    .map((v) => ({ id: v.id, sku: v.sku || '', size: v.size, price: v.price, was: v.compareAtPrice && v.compareAtPrice > v.price ? v.compareAtPrice : null, stock: Math.max(0, v.stock ?? 0) }))
    .sort((a, b) => sizeKey(a.size) - sizeKey(b.size))
  const prices = variants.map((v) => v.price)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const base = variants.find((v) => v.price === min)
  const was = base?.was || null
  const ages = variants.map((v) => ageRange(v.size)).filter(Boolean)
  return {
    id: d.id, handle: d.handle, title: d.title, type: d.type, audience: d.audience, fabric: d.fabric || '', print: d.print || '',
    desc: lexicalParagraphs(d.description), images, variants, cat: d.category, theme: themeOf(d.title),
    price: min, maxPrice: max, was, off: was ? Math.round((1 - min / was) * 100) : 0,
    stock: variants.reduce((a, v) => a + v.stock, 0),
    ageMin: ages.length ? Math.min(...ages.map((a) => a[0])) : null,
    ageMax: ages.length ? Math.max(...ages.map((a) => a[1])) : null,
    paired: variants.some((v) => v.size.includes(' / ')),
    seo: d.seo || null,
  }
}

export const stockLabel = (n) => (n <= 0 ? 'Sold out' : n <= 5 ? `Only ${n} left` : 'In stock')

// A size fits a stage when its age range overlaps the stage's range. Towels are one size.
export function sizeFits(sizeStr, stage) {
  const r = ageRange(sizeStr)
  return !!r && r[0] <= stage.ageTo && r[1] >= stage.ageFrom
}
export function sizeInside(sizeStr, stage) {
  const r = ageRange(sizeStr)
  return !!r && r[0] >= stage.ageFrom && r[1] <= stage.ageTo
}
export const productFits = (p, stage) => p.type === 'towel' || p.variants.some((v) => sizeFits(v.size, stage))

// Typo-friendly keyword search used on the results page and in the search overlay.
export function searchProducts(products, q, catLabel = (/** @type {string} */ _slug) => '') {
  const norm = (s) => s.toLowerCase().replace(/co[\s-]?ords?/g, 'coord')
  const toks = norm(q).split(/\s+/).filter(Boolean)
  if (!toks.length) return []
  return products
    .map((p) => {
      const title = norm(p.title)
      const hay = norm(`${p.title} ${p.type} ${p.fabric} ${p.print} ${catLabel(p.cat)}`)
      let s = 0
      for (const t of toks) {
        if (title.includes(t)) s += 3
        else if (hay.includes(t)) s += 1
        else return null
      }
      return { p, s }
    })
    .filter(Boolean)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
}
