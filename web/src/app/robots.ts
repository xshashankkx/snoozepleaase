import type { MetadataRoute } from 'next'
import { absolute } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/checkout', '/account', '/order', '/search'] }],
    sitemap: absolute('/sitemap.xml'),
  }
}
