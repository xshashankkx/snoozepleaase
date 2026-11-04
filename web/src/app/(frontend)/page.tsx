import type { Metadata } from 'next'
import Home from '@/storefront/pages/Home'
import { byIds, getCatalog, getHome, getSite, isPreview } from '@/lib/cms'
import { seoMeta } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHome(await isPreview())
  return seoMeta(home.seo, { title: 'Snooze Pleaase | Dream big, sleep cozy', description: home.subline, path: '/' })
}

export default async function HomePage() {
  const draft = await isPreview()
  const [home, catalog, site] = await Promise.all([getHome(draft), getCatalog(draft), getSite(draft)])
  const boxes = home.boxes
    .map((b: any) => {
      const cat = site.categories.find((c: any) => c.slug === b.category)
      const product = catalog.find((p: any) => p.id === b.product)
      return cat && product ? { slug: cat.slug, label: cat.label, blurb: cat.blurb, product } : null
    })
    .filter(Boolean)
  return (
    <Home
      home={home}
      featured={byIds(catalog, home.featured)}
      bestSellers={byIds(catalog, home.bestSellers)}
      newArrivals={byIds(catalog, home.newArrivals)}
      boxes={boxes as any}
    />
  )
}
