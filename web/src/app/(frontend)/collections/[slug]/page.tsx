import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import ShopView from '@/storefront/pages/Shop'
import { ageFromCookie, byIds, DEFAULT_CATEGORIES, getCatalog, getCollection, getSite, isPreview } from '@/lib/cms'
import { seoMeta } from '@/lib/seo'

// Old Shopify collection addresses, sent to their new homes.
const ALIASES: Record<string, string> = {
  'kids-night-wear': 'kids-nightwear', 'coo-rd-set': 'co-ords', 'bathrobe-towel': 'bath-towels', 'mom-kids-duo': 'mom-me', 'adult-nightsuit': 'mom-me',
}

async function load(slug: string, draft: boolean) {
  const [catalog, site] = await Promise.all([getCatalog(draft), getSite(draft)])
  if (slug === 'all') return { catalog, site, coll: { slug, label: 'All dreams', blurb: 'Every nightsuit, co-ord, robe and towel in one place.', items: catalog, seo: null } }
  const doc = await getCollection(draft, slug)
  const fallback = DEFAULT_CATEGORIES.find((c) => c.slug === slug)
  if (!doc && !fallback) return null
  const category = doc?.kind === 'curated' ? null : (doc?.category || fallback?.slug)
  const items = category ? catalog.filter((p: any) => p.cat === category) : byIds(catalog, doc?.products || [])
  const cat = site.categories.find((c: any) => c.slug === slug)
  return { catalog, site, coll: { slug, label: doc?.title || fallback?.label || slug, blurb: doc?.blurb || cat?.blurb || '', items, seo: doc?.seo || null } }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await load(ALIASES[slug] || slug, await isPreview())
  if (!data) return {}
  return seoMeta(data.coll.seo, { title: data.coll.label, description: data.coll.blurb, path: `/collections/${slug}` })
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (ALIASES[slug]) permanentRedirect(`/collections/${ALIASES[slug]}`)
  const draft = await isPreview()
  const data = await load(slug, draft)
  if (!data) notFound()
  const picksByStage = Object.fromEntries(data.site.age.stages.map((s: any) => [s.key, byIds(data.catalog, s.picks)]))
  return (
    <Suspense>
      <ShopView coll={data.coll as any} picksByStage={picksByStage} initialAge={await ageFromCookie()} />
    </Suspense>
  )
}
