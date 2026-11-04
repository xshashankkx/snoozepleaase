import type { CollectionConfig } from 'payload'
import { isStaff } from './Users'
import { draftsWithSchedule, publicRead, publishedOrStaff, seoField, slugField } from '../lib/fields'

// The shelves shoppers browse: the four categories (their products come from each product's
// category) and hand-curated lists such as Best Sellers and New Arrivals.
export const ProductCollections: CollectionConfig = {
  slug: 'product-collections',
  labels: { singular: 'Collection', plural: 'Collections' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'kind', 'slug', '_status'], group: 'Catalog' },
  custom: publicRead,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  versions: draftsWithSchedule,
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title', 'The web address, for example best-sellers becomes /collections/best-sellers.'),
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'curated',
      admin: { description: 'A category lists every product with that category. A curated list is hand-picked.' },
      options: [
        { label: 'Category', value: 'category' },
        { label: 'Curated list', value: 'curated' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      admin: { condition: (d) => d?.kind === 'category' },
      options: [
        { label: 'Kids Nightwear', value: 'kids-nightwear' },
        { label: 'Co-ords', value: 'co-ords' },
        { label: 'Bath & Towels', value: 'bath-towels' },
        { label: 'Mom & Me', value: 'mom-me' },
      ],
    },
    { name: 'blurb', type: 'textarea', maxLength: 200, admin: { description: 'One line shown under the heading.' } },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: { condition: (d) => d?.kind === 'curated', description: 'Pick products in the order they should appear.' },
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    seoField,
  ],
}
