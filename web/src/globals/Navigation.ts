import type { GlobalConfig } from 'payload'
import { isStaff } from '../collections/Users'
import { globalDrafts, linkFields, publicRead } from '../lib/fields'

// Header links and the footer columns.
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation menus',
  admin: { preview: () => `/api/preview?path=${encodeURIComponent('/')}`, group: 'Site', description: 'The links in the header and footer, in order.' },
  custom: publicRead,
  access: { read: () => true, update: isStaff },
  versions: globalDrafts,
  fields: [
    {
      name: 'header',
      type: 'array',
      label: 'Header links',
      labels: { singular: 'Link', plural: 'Links' },
      minRows: 1,
      maxRows: 6,
      admin: { description: 'Up to six links. More than that will not fit on a phone.', components: { RowLabel: '/components/admin/RowLabels#LinkLabel' } },
      fields: linkFields('For example: Kids Nightwear.'),
    },
    {
      name: 'footer',
      type: 'array',
      label: 'Footer columns',
      labels: { singular: 'Column', plural: 'Columns' },
      maxRows: 4,
      admin: { components: { RowLabel: '/components/admin/RowLabels#ColumnLabel' } },
      fields: [
        { name: 'heading', type: 'text', required: true },
        { name: 'links', type: 'array', labels: { singular: 'Link', plural: 'Links' }, minRows: 1, admin: { components: { RowLabel: '/components/admin/RowLabels#LinkLabel' } }, fields: linkFields() },
      ],
    },
  ],
}
