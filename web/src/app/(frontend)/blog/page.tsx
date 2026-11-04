import type { Metadata } from 'next'
import { BlogList } from '@/storefront/pages/Content'
import { getPosts, isPreview } from '@/lib/cms'

export const metadata: Metadata = { title: 'Blog', description: 'Stories, sleep tips and news from Snooze Pleaase.' }

export default async function BlogPage() {
  return <BlogList posts={await getPosts(await isPreview())} />
}
