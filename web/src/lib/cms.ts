import 'server-only'
import { cookies, draftMode } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { mapMedia, mapProduct } from '@/storefront/lib/product'
import { offerText } from '@/lib/discounts'

// Everything the storefront reads from the CMS. Published content is cached and refreshed the
// moment someone presses Publish (see lib/revalidate.ts). In preview mode drafts are read live.

export type Draft = boolean

export async function isPreview(): Promise<boolean> {
  try {
    return (await draftMode()).isEnabled
  } catch {
    return false
  }
}

export async function ageFromCookie(): Promise<string | null> {
  try {
    return (await cookies()).get('sp_age')?.value ?? null
  } catch {
    return null
  }
}

async function cached<T>(draft: Draft, key: string, fn: () => Promise<T>, revalidate = 3600): Promise<T> {
  if (draft) return fn()
  return unstable_cache(fn, [key], { tags: ['cms'], revalidate })()
}

const pub = (draft: Draft): Where => (draft ? {} : { _status: { equals: 'published' } })
const idOf = (x: any) => (x && typeof x === 'object' ? x.id : x)

export const DEFAULT_CATEGORIES = [
  { slug: 'kids-nightwear', label: 'Kids Nightwear', blurb: 'Soft button-down nightsuits in prints they will actually ask to wear.' },
  { slug: 'co-ords', label: 'Co-ords', blurb: 'Short-sleeve shirt and shorts sets for warm nights and lazy mornings.' },
  { slug: 'bath-towels', label: 'Bath & Towels', blurb: 'Robes and wrap towels in fluffy waffle cotton for after-bath cuddles.' },
  { slug: 'mom-me', label: 'Mom & Me', blurb: 'Matching loungewear so the whole family can wind down together.' },
]

export async function getCatalog(draft: Draft) {
  return cached(draft, 'catalog' + draft, async () => {
    const payload = await getPayload({ config })
    const r = await payload.find({ collection: 'products', where: pub(draft), limit: 500, depth: 1, draft, sort: 'title' })
    // Half-finished drafts (no title or address yet) are skipped so preview never breaks.
    return r.docs.filter((d: any) => d.title && d.handle).map(mapProduct)
  })
}

export async function getSite(draft: Draft) {
  return cached(draft, 'site' + draft, async () => {
    const payload = await getPayload({ config })
    const g = (slug: any) => payload.findGlobal({ slug, depth: 1, draft })
    const [settings, nav, announcement, age] = await Promise.all([g('site-settings'), g('navigation'), g('announcement'), g('age-step')])
    const cols = await payload.find({ collection: 'product-collections', where: { ...pub(draft), kind: { equals: 'category' } }, limit: 20, depth: 0, draft })
    const categories = DEFAULT_CATEGORIES.map((d) => {
      const c: any = cols.docs.find((x: any) => x.category === d.slug)
      return { slug: d.slug, label: c?.title || d.label, blurb: c?.blurb || d.blurb }
    })
    const s: any = settings
    const a: any = announcement
    const ag: any = age
    // The headline sale (if one is live) supplies the header tag and the product-page note, so they
    // always match what the bag charges.
    const now = Date.now()
    const live = (await payload.find({ collection: 'discounts', where: { and: [{ active: { equals: true } }, { method: { equals: 'automatic' } }, { 'headline.showInHeader': { equals: true } }] }, limit: 5, depth: 0 })).docs
      .filter((d: any) => (!d.startsAt || new Date(d.startsAt).getTime() <= now) && (!d.endsAt || new Date(d.endsAt).getTime() >= now))[0] as any
    const sale = live
      ? {
          name: live.headline?.tagName || live.title,
          text: live.headline?.tagText || offerText(live),
          percent: live.type === 'percentage' && (live.appliesTo ?? 'all') === 'all' ? live.value : null,
        }
      : null
    return {
      settings: {
        brandName: s.brandName || 'Snooze Pleaase', tagline: s.tagline || '', whatsapp: s.whatsapp || '', email: s.email || '', instagram: s.instagram || '', hours: s.hours || '',
        freeShippingOver: s.freeShippingOver ?? 1999, standardShipping: s.standardShipping ?? 79, expressShipping: s.expressShipping ?? 149,
        standardDays: s.standardDays || '4–7', expressDays: s.expressDays || '2–3', returnsDays: s.returnsDays ?? 7,
        newsletterConsent: s.newsletterConsent || '', seo: s.seo ? { ...s.seo, shareImage: mapMedia(s.seo.shareImage) } : null,
      },
      nav: { header: (nav as any).header || [], footer: (nav as any).footer || [] },
      announcement: {
        bar: a.bar?.enabled && a.bar?.text ? { text: a.bar.text, label: a.bar.link?.label || '', url: a.bar.link?.url || '' } : null,
        saleTag: a.saleTag?.enabled ? { name: sale?.name || a.saleTag.name || 'Sale', offerText: sale ? sale.text : a.saleTag.offerText || '', url: a.saleTag.url || '/collections/all' } : null,
      },
      age: {
        heading: ag.heading || 'Who are you shopping for?', intro: ag.intro || '', skipLabel: ag.skipLabel || 'Show me everything',
        stages: (ag.stages || []).map((st: any) => ({
          key: st.key, label: st.label, plural: st.plural, ages: st.agesLabel, ageFrom: st.ageFrom, ageTo: st.ageTo, picks: (st.picks || []).map(idOf),
        })),
      },
      categories,
      sale,
    }
  }, 300)
}

export async function getHome(draft: Draft) {
  return cached(draft, 'home' + draft, async () => {
    const payload = await getPayload({ config })
    const h: any = await payload.findGlobal({ slug: 'home-page', depth: 1, draft })
    const col = async (c: any) => {
      const id = idOf(c)
      if (!id) return []
      const doc: any = await payload.findByID({ collection: 'product-collections', id, depth: 0, draft }).catch(() => null)
      return (doc?.products || []).map(idOf)
    }
    return {
      headline: [h.headlineLine1, h.headlineLine2],
      subline: h.subline || '',
      primary: h.primaryButton, secondary: h.secondaryButton,
      featured: (h.featured || []).map(idOf),
      ticker: (h.ticker || []).map((t: any) => t.text),
      bestSellersHeading: h.bestSellersHeading, bestSellers: await col(h.bestSellers),
      boxesHeading: h.boxesHeading,
      boxes: (h.boxes || []).map((b: any) => ({ category: b.category, product: idOf(b.photoProduct) })),
      storyHeading: h.storyHeading, storyLede: h.storyLede,
      promises: h.promises || [], storyButton: h.storyButton,
      storyImages: (h.storyImages || []).map((x: any) => mapMedia(x.image)).filter(Boolean),
      stripHeading: h.stripHeading, strip: (h.strip || []).map((x: any) => mapMedia(x.image)).filter(Boolean),
      newHeading: h.newHeading, newArrivals: await col(h.newArrivals),
      closingTitle: h.closingTitle || '', closingButton: h.closingButton,
      seo: h.seo ? { ...h.seo, shareImage: mapMedia(h.seo.shareImage) } : null,
    }
  })
}

export async function getCollection(draft: Draft, slug: string) {
  return cached(draft, `coll-${slug}-${draft}`, async () => {
    const payload = await getPayload({ config })
    const r = await payload.find({ collection: 'product-collections', where: { ...pub(draft), slug: { equals: slug } }, limit: 1, depth: 0, draft })
    const c: any = r.docs[0]
    return c ? { slug: c.slug, title: c.title, kind: c.kind, category: c.category || null, blurb: c.blurb || '', products: (c.products || []).map(idOf), seo: c.seo ? { ...c.seo } : null } : null
  })
}

export async function getPage(draft: Draft, slug: string) {
  return cached(draft, `page-${slug}-${draft}`, async () => {
    const payload = await getPayload({ config })
    const r = await payload.find({ collection: 'pages', where: { ...pub(draft), slug: { equals: slug } }, limit: 1, depth: 2, draft })
    const p: any = r.docs[0]
    if (!p) return null
    return {
      title: p.title, slug: p.slug, template: p.template, intro: p.intro || '', body: p.body || null,
      faqs: (p.faqs || []).map((f: any) => ({ question: f.question, answer: f.answer })),
      sizeChart: p.sizeChart && typeof p.sizeChart === 'object' ? p.sizeChart : null,
      photos: (p.photos || []).map((x: any) => mapMedia(x.image)).filter(Boolean),
      seo: p.seo ? { ...p.seo, shareImage: mapMedia(p.seo.shareImage) } : null,
    }
  })
}

export async function getPosts(draft: Draft) {
  return cached(draft, 'posts' + draft, async () => {
    const payload = await getPayload({ config })
    const r = await payload.find({ collection: 'posts', where: pub(draft), limit: 100, depth: 1, draft, sort: '-publishedOn' })
    return r.docs.map((p: any) => ({
      title: p.title, slug: p.slug, excerpt: p.excerpt || '', cover: mapMedia(p.coverImage), body: p.body || null,
      author: p.author || '', publishedOn: p.publishedOn || null, tags: p.tags || [], seo: p.seo ? { ...p.seo, shareImage: mapMedia(p.seo.shareImage) } : null,
    }))
  })
}

export async function getEvents(draft: Draft) {
  return cached(draft, 'events' + draft, async () => {
    const payload = await getPayload({ config })
    const r = await payload.find({ collection: 'events', where: pub(draft), limit: 100, depth: 1, draft, sort: 'startsOn' })
    return r.docs.map((e: any) => ({
      name: e.name, slug: e.slug, startsOn: e.startsOn, endsOn: e.endsOn, venue: e.venue, city: e.city, stall: e.stall || '',
      description: e.description || '', image: mapMedia(e.image), link: e.link || '',
    }))
  })
}

export const byIds = <T extends { id: number }>(list: T[], ids: number[]) =>
  ids.map((id) => list.find((p) => p.id === id)).filter(Boolean) as T[]
