import { Suspense } from 'react'
import type { Metadata } from 'next'
import ShopView from '@/storefront/pages/Shop'
import { getCatalog, getSite, isPreview } from '@/lib/cms'
import { searchProducts } from '@/storefront/lib/product'

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const draft = await isPreview()
  const [catalog, site] = await Promise.all([getCatalog(draft), getSite(draft)])
  const label = (slug: string) => site.categories.find((c: any) => c.slug === slug)?.label || ''
  const items = searchProducts(catalog, q, label)
  return (
    <Suspense>
      <ShopView mode="search" coll={{ slug: 'search', label: `Results for “${q}”`, blurb: '', query: q, items }} />
    </Suspense>
  )
}
