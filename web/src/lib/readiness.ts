// What a product needs before it can go live (PRD: SKU, barcode, weight and box size on every
// variant, because Shiprocket needs them; alt text on every image; standard attributes).

type Variant = {
  size?: string | null
  sku?: string | null
  barcode?: string | null
  price?: number | null
  weightGrams?: number | null
  box?: { lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null } | null
}

type ProductLike = {
  title?: string | null
  category?: string | null
  type?: string | null
  fabric?: string | null
  images?: unknown[] | null
  variants?: Variant[] | null
}

const pos = (n: unknown) => typeof n === 'number' && n > 0

export function variantIssues(v: Variant): string[] {
  const out: string[] = []
  if (!v.sku?.trim()) out.push('SKU')
  if (!v.barcode?.trim()) out.push('barcode')
  if (!pos(v.price)) out.push('price')
  if (!pos(v.weightGrams)) out.push('weight')
  if (!pos(v.box?.lengthCm) || !pos(v.box?.widthCm) || !pos(v.box?.heightCm)) out.push('box size')
  return out
}

export function productIssues(p: ProductLike): string[] {
  const out: string[] = []
  if (!p.title?.trim()) out.push('Add a title')
  if (!p.category) out.push('Choose a category')
  if (!p.type) out.push('Choose a product type')
  if (!p.fabric?.trim()) out.push('Add the fabric')
  if (!p.images?.length) out.push('Add at least one image')
  const variants = p.variants ?? []
  if (!variants.length) out.push('Add at least one size')
  const skus = new Map<string, number>()
  let incomplete = 0
  const missing = new Set<string>()
  for (const v of variants) {
    const vi = variantIssues(v)
    if (vi.length) { incomplete++; vi.forEach((m) => missing.add(m)) }
    const s = v.sku?.trim().toUpperCase()
    if (s) skus.set(s, (skus.get(s) ?? 0) + 1)
  }
  if (incomplete) out.push(`${incomplete} of ${variants.length} sizes still need: ${[...missing].join(', ')}`)
  const dupes = [...skus.entries()].filter(([, n]) => n > 1).map(([s]) => s)
  if (dupes.length) out.push(`Duplicate SKU: ${dupes.slice(0, 3).join(', ')}`)
  return out
}

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
