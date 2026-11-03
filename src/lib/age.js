// Age stages shown on the growth-chart step. Sizes are cut by age (1-2, 2-3, ...), so a
// stage "fits" a size when the size's age range overlaps the stage's range.
export const STAGES = [
  { key: 'toddler', label: 'Toddler', plural: 'Toddlers', ages: '1–3', range: [1, 3], units: 3, mid: 11.5 },
  { key: 'little', label: 'Little', plural: 'Little ones', ages: '4–6', range: [4, 6], units: 3, mid: 8.5 },
  { key: 'big', label: 'Big', plural: 'Big kids', ages: '7–9', range: [7, 9], units: 3, mid: 5.5 },
  { key: 'tween', label: 'Tween', plural: 'Tweens', ages: '10+', range: [10, 99], units: 4, mid: 2 },
]

export const stageByKey = (k) => STAGES.find((s) => s.key === k) || null
export const validAge = (k) => k === 'all' || !!stageByKey(k)

export function sizeFits(sizeStr, stage) {
  const m = /(\d+)\s*-\s*(\d+)\s*y/i.exec(sizeStr)
  if (!m) return false
  return +m[1] <= stage.range[1] && +m[2] >= stage.range[0]
}

// True when the whole size band sits inside the stage (e.g. 4-5 inside Little).
export function sizeInside(sizeStr, stage) {
  const m = /(\d+)\s*-\s*(\d+)\s*y/i.exec(sizeStr)
  return !!m && +m[1] >= stage.range[0] && +m[2] <= stage.range[1]
}

// Towels are one size, so they suit every age.
export const productFits = (p, stage) => p.type === 'towel' || p.variants.some((v) => sizeFits(v.size, stage))

// Hand-picked rows (draft, edit freely).
export const PICKS = {
  toddler: ['green-elephant-nightsuit-copy-1', 'green-elephant-nightsuit', 'mango-co-ordset', 'sheep-co-ordset', 'bubblegum-coord'],
  little: ['dolphin-nightsuit', 'florida-blue-co-ord-set', 'red-yellow-car-nightsuit', 'minnie-pink-co-ord-set', 'doraemon-co-ord-set'],
  big: ['coin-blue-nightsuit', 'shades-nightsuit', 'red-tiger-jungle-co-ord-set', 'co-ord-set-brown', 'midnight-elegance-nightsuit'],
  tween: ['midnight-elegance-nightsuit', 'makeup-frill-nightsuit-copy'],
}
