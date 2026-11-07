import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { payloadTotp } from 'payload-totp'
import { withRefresh } from './lib/revalidate'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { SizeCharts } from './collections/SizeCharts'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Events } from './collections/Events'
import { Discounts } from './collections/Discounts'
import { Orders } from './collections/Orders'
import { ProductCollections } from './collections/ProductCollections'
import { HomePage } from './globals/HomePage'
import { AgeStep } from './globals/AgeStep'
import { Announcement } from './globals/Announcement'
import { Navigation } from './globals/Navigation'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' | Snooze Pleaase CMS', icons: [{ url: '/favicon.svg' }] },
    components: {
      graphics: { Logo: '/components/admin/Logo#Logo', Icon: '/components/admin/Icon#Icon' },
    },
  },
  collections: [Products, ProductCollections, Discounts, SizeCharts, Pages, Posts, Events, Media].map(withRefresh).concat([Orders, Users] as any),
  globals: [HomePage, AgeStep, Announcement, Navigation, SiteSettings].map(withRefresh),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL || '' } }),
  // Runs scheduled publishes (for example a banner that should go live on Diwali morning).
  jobs: { autoRun: [{ cron: '* * * * *', limit: 10 }] },
  upload: { limits: { fileSize: 10_000_000 } },
  sharp,
  // Keep this plugin last: it wraps the access rules of every collection added before it.
  plugins: [
    payloadTotp({
      collection: 'users',
      forceSetup: true,
      disabled: process.env.DISABLE_2FA === 'true',
      totp: { issuer: 'Snooze Pleaase CMS' },
    }),
  ],
})
