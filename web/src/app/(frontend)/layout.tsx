import React from 'react'
import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/grandstander'
import '@fontsource-variable/nunito'
import '@fontsource/patrick-hand'
import '@/storefront/styles/base.css'
import '@/storefront/styles/shell.css'
import '@/storefront/styles/box.css'
import '@/storefront/styles/pages.css'
import { getSite, isPreview } from '@/lib/cms'
import { absolute } from '@/lib/seo'
import { SiteProvider } from '@/storefront/lib/site'
import { StoreProvider } from '@/storefront/store/StoreProvider'
import AppShell from '@/storefront/components/AppShell'

export const viewport: Viewport = { themeColor: '#0e3dc4' }

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSite(await isPreview())
  const title = settings.seo?.metaTitle || 'Snooze Pleaase | Dream big, sleep cozy'
  const description = settings.seo?.metaDescription || 'Premium handcrafted cotton nightwear, co-ord sets, robes and towels for little dreamers.'
  const image = settings.seo?.shareImage
  return {
    metadataBase: new URL(absolute('/')),
    title: { default: title, template: '%s | Snooze Pleaase' },
    description,
    icons: { icon: '/favicon.svg' },
    openGraph: { siteName: 'Snooze Pleaase', type: 'website', images: image ? [{ url: image.url, alt: image.alt }] : undefined },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const preview = await isPreview()
  const site = await getSite(preview)
  return (
    <html lang="en">
      <body>
        <SiteProvider site={site}>
          <StoreProvider>
            <AppShell preview={preview}>{children}</AppShell>
          </StoreProvider>
        </SiteProvider>
      </body>
    </html>
  )
}
