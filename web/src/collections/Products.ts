import { APIError, type CollectionConfig } from 'payload'
import { isStaff } from './Users'
import { productIssues, slugify } from '../lib/readiness'
import { exportSheet, importSheet } from '../lib/sheet'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Product', plural: 'Products' },
  admin: { preview: (doc: any) => `/api/preview?path=${encodeURIComponent(`/products/${doc?.handle}`)}`,
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'isComplete', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'handle', 'variants.sku'],
    group: 'Catalog',
    components: { beforeListTable: ['/components/admin/SheetTools#SheetTools'] },
  },
  // Public shoppers read these through the API, so the two-factor access wrapper must leave `read` alone.
  custom: { totp: { disableAccessWrapper: { read: true } } },
  access: {
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  versions: {
    maxPerDoc: 25,
    drafts: { autosave: { interval: 2000 }, schedulePublish: true },
  },
  endpoints: [
    { path: '/export-sheet', method: 'get', handler: exportSheet },
    { path: '/import-sheet', method: 'post', handler: importSheet },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (data && !data.handle && !originalDoc?.handle && data.title) data.handle = slugify(data.title)
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        const merged = { ...originalDoc, ...data }
        const issues = productIssues(merged)
        data.isComplete = issues.length === 0
        data.readinessNote = issues.join('\n')
        if (data._status === 'published' && issues.length) {
          throw new APIError(`This product can't go live yet:\n• ${issues.join('\n• ')}`, 400, undefined, true)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'handle',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'The web address. Changing it breaks old links, so avoid it on live products.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'category',
          type: 'select',
          required: true,
          options: [
            { label: 'Kids Nightwear', value: 'kids-nightwear' },
            { label: 'Co-ords', value: 'co-ords' },
            { label: 'Bath & Towels', value: 'bath-towels' },
            { label: 'Mom & Me', value: 'mom-me' },
          ],
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          options: [
            { label: 'Nightsuit', value: 'nightsuit' },
            { label: 'Co-ord set', value: 'coord_set' },
            { label: 'Bathrobe', value: 'bathrobe' },
            { label: 'Towel', value: 'towel' },
            { label: 'Mom and kid set', value: 'mom_kid_set' },
          ],
        },
        {
          name: 'audience',
          type: 'select',
          required: true,
          defaultValue: 'kids',
          options: [{ label: 'Kids', value: 'kids' }, { label: 'Women', value: 'women' }, { label: 'Unisex', value: 'unisex' }],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'fabric', type: 'text', admin: { description: 'For example: 100% Premium Cotton, Waffle Cotton, Poplin.' } },
        { name: 'print', type: 'text', admin: { description: 'For example: Elephant, Mango, Solid.' } },
      ],
    },
    { name: 'description', type: 'richText' },
    {
      name: 'images',
      type: 'array',
      labels: { singular: 'Image', plural: 'Images' },
      admin: { description: 'The first image is the main one. Aim for four or more.' },
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    { name: 'videoUrl', type: 'text', admin: { description: 'Optional: a link to a product video.' } },
    { name: 'sizeChart', type: 'relationship', relationTo: 'size-charts' },
    {
      name: 'variants',
      type: 'array',
      labels: { singular: 'Size', plural: 'Sizes' },
      admin: { description: 'One row per size. SKU, barcode, weight and box size are needed before the product can go live.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'size', type: 'text', required: true, admin: { description: 'For example: 3-4 years, S, One size.' } },
            { name: 'sku', type: 'text', admin: { description: 'Unique stock code.' } },
            { name: 'barcode', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'price', type: 'number', required: true, min: 0, admin: { description: 'Rupees.' } },
            { name: 'compareAtPrice', type: 'number', min: 0, admin: { description: 'Struck-through price. Leave empty for none.' } },
            { name: 'weightGrams', type: 'number', min: 0, admin: { description: 'Packed weight in grams.' } },
          ],
        },
        {
          name: 'box',
          type: 'group',
          label: 'Packed box size (cm)',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'lengthCm', type: 'number', min: 0, label: 'Length' },
                { name: 'widthCm', type: 'number', min: 0, label: 'Width' },
                { name: 'heightCm', type: 'number', min: 0, label: 'Height' },
              ],
            },
          ],
        },
        {
          name: 'stock',
          type: 'number',
          defaultValue: 0,
          admin: { readOnly: true, description: 'Placeholder. Real stock will come from the inventory system.' },
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      label: 'Search and sharing',
      fields: [
        { name: 'metaTitle', type: 'text', maxLength: 70, admin: { description: 'Shown in Google results. Leave empty to use the product title.' } },
        { name: 'metaDescription', type: 'textarea', maxLength: 160 },
        { name: 'shareImage', type: 'upload', relationTo: 'media', admin: { description: 'Shown when the link is shared on WhatsApp or Instagram.' } },
      ],
    },
    {
      name: 'isComplete',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Ready to publish',
      admin: { readOnly: true, position: 'sidebar', components: { Cell: '/components/admin/ReadyCell#ReadyCell' } },
    },
    {
      name: 'readinessNote',
      type: 'textarea',
      label: 'Still needed',
      admin: { readOnly: true, position: 'sidebar', rows: 5 },
    },
  ],
}
