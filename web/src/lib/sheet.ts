import type { PayloadHandler } from 'payload'

// Spreadsheet round-trip for product data: export every size as a row, fill in SKUs, barcodes,
// weights and box sizes in Excel or Google Sheets, then import the file back.
// A blank cell means "leave as is", so a half-filled sheet never wipes existing data.

const COLUMNS = [
  'handle', 'title', 'variantId', 'size', 'sku', 'barcode', 'price', 'compareAtPrice',
  'weightGrams', 'boxLengthCm', 'boxWidthCm', 'boxHeightCm',
] as const

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export const exportSheet: PayloadHandler = async (req) => {
  if (!req.user) return json({ error: 'Please sign in.' }, 401)
  const { docs } = await req.payload.find({ collection: 'products', limit: 0, depth: 0, draft: true, sort: 'title' })
  const lines = [COLUMNS.join(',')]
  for (const p of docs as any[]) {
    for (const v of p.variants ?? []) {
      lines.push([
        p.handle, p.title, v.id, v.size, v.sku, v.barcode, v.price, v.compareAtPrice,
        v.weightGrams, v.box?.lengthCm, v.box?.widthCm, v.box?.heightCm,
      ].map(esc).join(','))
    }
  }
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="snooze-pleaase-products.csv"',
    },
  })
}

const num = (s: string) => {
  const t = s.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export const importSheet: PayloadHandler = async (req) => {
  if (!req.user) return json({ error: 'Please sign in.' }, 401)
  const text = await (req as any).text()
  const rows = parseCsv(text)
  if (rows.length < 2) return json({ error: 'The file is empty.' }, 400)
  const head = rows[0].map((h) => h.trim())
  for (const need of ['handle', 'variantId']) {
    if (!head.includes(need)) return json({ error: `The file needs a "${need}" column. Export a fresh copy and edit that.` }, 400)
  }
  const col = (r: string[], name: string) => (r[head.indexOf(name)] ?? '')

  const { docs } = await req.payload.find({ collection: 'products', limit: 0, depth: 0, draft: true })
  const byHandle = new Map<string, any>((docs as any[]).map((p) => [p.handle, p]))
  const skuOwner = new Map<string, string>()
  for (const p of docs as any[]) for (const v of p.variants ?? []) if (v.sku) skuOwner.set(String(v.sku).toUpperCase(), v.id)

  const errors: string[] = []
  const touched = new Map<string, any>()

  rows.slice(1).forEach((r, i) => {
    const line = i + 2
    const handle = col(r, 'handle').trim()
    const vid = col(r, 'variantId').trim()
    const p = byHandle.get(handle)
    if (!p) return errors.push(`Row ${line}: no product with handle "${handle}".`)
    const v = (p.variants ?? []).find((x: any) => x.id === vid)
    if (!v) return errors.push(`Row ${line}: "${handle}" has no size with that variantId. Export a fresh sheet.`)

    const set = (name: string, apply: (n: number) => void) => {
      if (!head.includes(name)) return
      const n = num(col(r, name))
      if (n === undefined) return
      if (Number.isNaN(n)) return errors.push(`Row ${line}: ${name} must be a positive number.`)
      apply(n)
    }
    const str = (name: string, apply: (s: string) => void) => {
      if (!head.includes(name)) return
      const s = col(r, name).trim()
      if (s) apply(s)
    }

    str('sku', (s) => {
      const key = s.toUpperCase()
      const owner = skuOwner.get(key)
      if (owner && owner !== v.id) return errors.push(`Row ${line}: SKU ${s} is already used by another size.`)
      if (v.sku) skuOwner.delete(String(v.sku).toUpperCase())
      skuOwner.set(key, v.id)
      v.sku = s
    })
    str('barcode', (s) => { v.barcode = s })
    set('price', (n) => { v.price = n })
    set('compareAtPrice', (n) => { v.compareAtPrice = n })
    set('weightGrams', (n) => { v.weightGrams = n })
    v.box = v.box ?? {}
    set('boxLengthCm', (n) => { v.box.lengthCm = n })
    set('boxWidthCm', (n) => { v.box.widthCm = n })
    set('boxHeightCm', (n) => { v.box.heightCm = n })
    touched.set(p.id, p)
  })

  let updated = 0
  for (const p of touched.values()) {
    try {
      await req.payload.update({ collection: 'products', id: p.id, data: { variants: p.variants }, draft: true, depth: 0 })
      updated++
    } catch (e: any) {
      errors.push(`${p.title}: ${e?.message ?? 'could not be saved'}`)
    }
  }
  return json({ rows: rows.length - 1, productsUpdated: updated, errors: errors.slice(0, 40), moreErrors: Math.max(0, errors.length - 40) })
}
