import type { Access, CollectionConfig, Field, GlobalConfig } from 'payload'
import { slugify } from './readiness'

// Shoppers only ever see published content; staff see drafts too.
export const publishedOrStaff: Access = ({ req }) => (req.user ? true : { _status: { equals: 'published' } })

// The two-factor plugin wraps access rules, so public reads must opt out (shoppers are not logged in).
export const publicRead = { totp: { disableAccessWrapper: { read: true } } }

export const draftsWithSchedule: NonNullable<CollectionConfig['versions']> = {
  maxPerDoc: 25,
  drafts: { autosave: { interval: 2000 }, schedulePublish: true },
}

export const globalDrafts: NonNullable<GlobalConfig['versions']> = {
  max: 25,
  drafts: { schedulePublish: true },
}

export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'Search and sharing',
  fields: [
    { name: 'metaTitle', type: 'text', maxLength: 70, admin: { description: 'Shown in Google results. Leave empty to use the page title.' } },
    { name: 'metaDescription', type: 'textarea', maxLength: 160, admin: { description: 'One or two sentences. Google shows about 160 characters.' } },
    { name: 'shareImage', type: 'upload', relationTo: 'media', admin: { description: 'Shown when the link is shared on WhatsApp or Instagram.' } },
  ],
}

export const slugField = (source = 'title', description = 'The web address. Changing it breaks old links.'): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: { position: 'sidebar', description },
  hooks: {
    beforeValidate: [
      ({ value, data, originalDoc }) => {
        if (value) return slugify(String(value))
        const src = data?.[source] ?? originalDoc?.[source]
        return src ? slugify(String(src)) : value
      },
    ],
  },
})

// For links that can point to a page on the site (/collections/co-ords) or somewhere else (https://...).
export const linkFields = (labelDescription = 'The words shoppers see.'): Field[] => [
  { name: 'label', type: 'text', required: true, admin: { description: labelDescription } },
  {
    name: 'url',
    type: 'text',
    required: true,
    admin: { description: 'A page on the site such as /collections/co-ords or /pages/about-us, or a full link such as https://instagram.com/...' },
    validate: (v: unknown) => {
      const s = String(v ?? '').trim()
      if (!s) return 'Add a link.'
      if (!/^(\/|https?:\/\/|mailto:|tel:)/.test(s)) return 'Start with / for a page on the site, or with https://'
      return true
    },
  },
]
