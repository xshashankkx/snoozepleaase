import { APIError, type CollectionConfig } from 'payload'
import { isStaff } from './Users'
import { draftsWithSchedule, publicRead, publishedOrStaff, seoField, slugField } from '../lib/fields'

// About, FAQ, size guide, shipping and returns, privacy, contact, or any new page.
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: { preview: (doc: any) => `/api/preview?path=${encodeURIComponent(`/pages/${doc?.slug}`)}`, useAsTitle: 'title', defaultColumns: ['title', 'slug', 'template', '_status', 'updatedAt'], group: 'Content' },
  custom: publicRead,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  versions: draftsWithSchedule,
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const d = { ...originalDoc, ...data }
        if (d.template === 'faq' && d._status === 'published' && !(d.faqs?.length > 0)) {
          throw new APIError('Add at least one question before publishing an FAQ page.', 400, undefined, true)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title', 'The web address, for example about-us becomes /pages/about-us. Changing it breaks old links.'),
    {
      name: 'template',
      type: 'select',
      required: true,
      defaultValue: 'standard',
      admin: { description: 'Standard is a heading and text. The others add extra sections.' },
      options: [
        { label: 'Standard (text)', value: 'standard' },
        { label: 'About (text with photos)', value: 'about' },
        { label: 'FAQ (questions and answers)', value: 'faq' },
        { label: 'Size guide (size chart)', value: 'size-guide' },
        { label: 'Contact (details and form)', value: 'contact' },
      ],
    },
    { name: 'intro', type: 'textarea', admin: { description: 'A short opening line shown under the heading.' } },
    { name: 'body', type: 'richText' },
    {
      name: 'faqs',
      type: 'array',
      labels: { singular: 'Question', plural: 'Questions' },
      admin: { condition: (d) => d?.template === 'faq', description: 'Shown as an accordion, in this order.', components: { RowLabel: '/components/admin/RowLabels#QuestionLabel' } },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'richText', required: true },
      ],
    },
    {
      name: 'sizeChart',
      type: 'relationship',
      relationTo: 'size-charts',
      admin: { condition: (d) => d?.template === 'size-guide', description: 'The chart to show on this page.' },
    },
    {
      name: 'photos',
      type: 'array',
      labels: { singular: 'Photo', plural: 'Photos' },
      maxRows: 4,
      admin: { condition: (d) => d?.template === 'about', description: 'Shown beside the text.' },
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    seoField,
  ],
}
