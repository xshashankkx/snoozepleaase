import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CmsPage } from '@/storefront/pages/Content'
import { getPage, getSite, isPreview } from '@/lib/cms'
import { seoMeta } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(await isPreview(), slug)
  if (!page) return {}
  return seoMeta(page.seo, { title: page.title, description: page.intro, path: `/pages/${slug}` })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const draft = await isPreview()
  const [page, site] = await Promise.all([getPage(draft, slug), getSite(draft)])
  if (!page) notFound()
  return <CmsPage page={page} settings={site.settings} />
}
