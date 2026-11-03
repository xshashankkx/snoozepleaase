import type { CollectionConfig } from 'payload'
import { isStaff } from './Users'

export const SizeCharts: CollectionConfig = {
  slug: 'size-charts',
  labels: { singular: 'Size chart', plural: 'Size charts' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'unit', 'updatedAt'], group: 'Catalog' },
  // Public shoppers read these through the API, so the two-factor access wrapper must leave `read` alone.
  custom: { totp: { disableAccessWrapper: { read: true } } },
  access: { read: () => true, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'For example: Kids nightwear and co-ords.' } },
    { name: 'unit', type: 'select', defaultValue: 'cm', options: [{ label: 'Centimetres', value: 'cm' }, { label: 'Inches', value: 'in' }] },
    {
      name: 'rows',
      type: 'array',
      labels: { singular: 'Size', plural: 'Sizes' },
      minRows: 1,
      fields: [
        { name: 'label', type: 'text', required: true, admin: { description: 'The size, for example 3–4 years or M.' } },
        {
          type: 'row',
          fields: [
            { name: 'height', type: 'text', admin: { width: '33%' } },
            { name: 'chest', type: 'text', admin: { width: '33%' } },
            { name: 'waist', type: 'text', admin: { width: '33%' } },
          ],
        },
      ],
    },
    { name: 'note', type: 'textarea', admin: { description: 'Shown under the chart, for example how to measure.' } },
  ],
}
