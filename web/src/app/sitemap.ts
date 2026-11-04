import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCatalog, getPosts, getSite } from '@/lib/cms'
import { absolute } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, posts, site] = await Promise.all([getCatalog(false), getPosts(false), getSite(false)])
  const payload = await getPayload({ config })
  const published = { _status: { equals: 'published' } } as const
  const pages = await payload.find({ collection: 'pages', where: published, limit: 100, depth: 0 })
  const colls = await payload.find({ collection: 'product-collections', where: published, limit: 100, depth: 0 })
  const entries = (paths: string[], priority: number) => paths.map((p) => ({ url: absolute(p), priority }))
  return [
    ...entries(['/', '/events', '/blog'], 1),
    ...entries(
      ['/collections/all', ...site.categories.map((c: any) => `/collections/${c.slug}`), ...colls.docs.filter((c: any) => c.kind === 'curated').map((c: any) => `/collections/${c.slug}`)],
      0.8,
    ),
    ...catalog.map((p: any) => ({ url: absolute(`/products/${p.handle}`), priority: 0.7 })),
    ...pages.docs.map((p: any) => ({ url: absolute(`/pages/${p.slug}`), priority: 0.5 })),
    ...posts.map((p: any) => ({ url: absolute(`/blog/${p.slug}`), priority: 0.5 })),
  ]
}
