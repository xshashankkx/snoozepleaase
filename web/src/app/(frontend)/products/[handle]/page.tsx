import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Product from '@/storefront/pages/Product'
import { getCatalog, getSite, isPreview } from '@/lib/cms'
import { productJsonLd, seoMeta } from '@/lib/seo'

async function find(handle: string) {
  const draft = await isPreview()
  const [catalog, site] = await Promise.all([getCatalog(draft), getSite(draft)])
  const p = catalog.find((x: any) => x.handle === handle)
  return p ? { p, catalog, site } : null
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const data = await find(handle)
  if (!data) return {}
  const { p } = data
  return seoMeta(p.seo, {
    title: p.title,
    description: p.desc[0]?.slice(0, 160),
    path: `/products/${p.handle}`,
    image: p.images[0] ? { url: p.images[0].large, alt: p.images[0].alt } : null,
  })
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const data = await find(handle)
  if (!data) notFound()
  const { p, catalog, site } = data
  const related = catalog.filter((x: any) => x.cat === p.cat && x.handle !== p.handle).slice(0, 4)
  const catLabel = site.categories.find((c: any) => c.slug === p.cat)?.label || 'Shop'
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(p, catLabel, site.settings.brandName)) }} />
      <Product key={p.handle} p={p} related={related} />
    </>
  )
}
