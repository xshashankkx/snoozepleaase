import type { Metadata } from 'next'

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
export const absolute = (path: string) => new URL(path, BASE).toString()

type Seo = { metaTitle?: string; metaDescription?: string; shareImage?: { url: string; alt?: string; width?: number; height?: number } | null } | null | undefined

// Builds page metadata from the CMS "Search and sharing" fields, falling back to sensible defaults.
export function seoMeta(seo: Seo, o: { title: string; description?: string; path: string; image?: { url: string; alt?: string } | null; noindex?: boolean }): Metadata {
  const title = seo?.metaTitle || o.title
  const description = seo?.metaDescription || o.description
  const image = seo?.shareImage || o.image
  return {
    title,
    description,
    alternates: { canonical: absolute(o.path) },
    robots: o.noindex ? { index: false, follow: false } : undefined,
    openGraph: { title, description, url: absolute(o.path), siteName: 'Snooze Pleaase', type: 'website', images: image ? [{ url: absolute(image.url), alt: image.alt }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description },
  }
}

export function productJsonLd(p: any, categoryLabel: string, siteName: string) {
  const inStock = p.stock > 0
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: p.title,
        description: p.desc?.[0],
        image: p.images.map((i: any) => absolute(i.large)),
        brand: { '@type': 'Brand', name: siteName },
        material: p.fabric || undefined,
        sku: p.variants?.[0]?.sku || undefined,
        offers: {
          '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: p.price, highPrice: p.maxPrice, offerCount: p.variants.length,
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: absolute(`/products/${p.handle}`),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
          { '@type': 'ListItem', position: 2, name: categoryLabel, item: absolute(`/collections/${p.cat}`) },
          { '@type': 'ListItem', position: 3, name: p.title, item: absolute(`/products/${p.handle}`) },
        ],
      },
    ],
  }
}
