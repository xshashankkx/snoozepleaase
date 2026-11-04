import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogPost } from '@/storefront/pages/Content'
import { getPosts, isPreview } from '@/lib/cms'
import { seoMeta } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = (await getPosts(await isPreview())).find((p: any) => p.slug === slug)
  if (!post) return {}
  return seoMeta(post.seo, { title: post.title, description: post.excerpt, path: `/blog/${slug}`, image: post.cover ? { url: post.cover.large, alt: post.cover.alt } : null })
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = (await getPosts(await isPreview())).find((p: any) => p.slug === slug)
  if (!post) notFound()
  return <BlogPost post={post} />
}
