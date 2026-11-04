import { APIError, type CollectionConfig } from 'payload'
import { isStaff } from './Users'
import { draftsWithSchedule, publicRead, publishedOrStaff, seoField, slugField } from '../lib/fields'

// The blog. The PRD lists it under Content; there are no posts on Shopify today.
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Blog post', plural: 'Blog posts' },
  admin: { preview: (doc: any) => `/api/preview?path=${encodeURIComponent(`/blog/${doc?.slug}`)}`, useAsTitle: 'title', defaultColumns: ['title', 'publishedOn', '_status', 'updatedAt'], group: 'Content' },
  custom: publicRead,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  versions: draftsWithSchedule,
  defaultSort: '-publishedOn',
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const d = { ...originalDoc, ...data }
        if (d._status === 'published') {
          if (!d.coverImage) throw new APIError('Add a cover image before publishing.', 400, undefined, true)
          if (!d.excerpt?.trim()) throw new APIError('Add a short summary before publishing.', 400, undefined, true)
          if (!data.publishedOn && !originalDoc?.publishedOn) data.publishedOn = new Date().toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title', 'The web address, for example my-first-post becomes /blog/my-first-post.'),
    { name: 'excerpt', type: 'textarea', maxLength: 220, admin: { description: 'A short summary shown on the blog list and in search results.' } },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
    {
      type: 'row',
      fields: [
        { name: 'author', type: 'text', admin: { description: 'For example: Snooze Pleaase team.' } },
        { name: 'publishedOn', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Filled in when you publish. Change it to backdate.' } },
      ],
    },
    { name: 'tags', type: 'text', hasMany: true, admin: { description: 'Press Enter after each tag.' } },
    seoField,
  ],
}
