import type { CollectionConfig } from 'payload'
import { isStaff } from './Users'

// Every image needs alt text (PRD: "alt text on every image"), so uploads fail without it.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  admin: { useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'createdAt'], group: 'Library' },
  // Public shoppers read these through the API, so the two-factor access wrapper must leave `read` alone.
  custom: { totp: { disableAccessWrapper: { read: true } } },
  access: { read: () => true, create: isStaff, update: isStaff, delete: isStaff },
  upload: {
    mimeTypes: ['image/*'],
    staticDir: 'media',
    focalPoint: true,
    imageSizes: [
      { name: 'thumb', width: 240, height: 300, position: 'centre', formatOptions: { format: 'webp' } },
      { name: 'card', width: 640, height: 800, position: 'centre', formatOptions: { format: 'webp' } },
      { name: 'large', width: 1400, withoutEnlargement: true, formatOptions: { format: 'webp' } },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      minLength: 5,
      admin: { description: 'Describe what the picture shows, for screen readers and search engines. Example: "Child wearing the Mango co-ord set".' },
    },
  ],
}
