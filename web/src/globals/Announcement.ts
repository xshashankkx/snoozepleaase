import type { GlobalConfig } from 'payload'
import { isStaff } from '../collections/Users'
import { globalDrafts, publicRead } from '../lib/fields'

// The top banner and the sale tag in the header. The sale tag's words come from the headline sale
// in Discounts, so the header, the product pages and the bag price can never disagree.
export const Announcement: GlobalConfig = {
  slug: 'announcement',
  label: 'Announcement bar and sale tag',
  admin: { preview: () => `/api/preview?path=${encodeURIComponent('/')}`, group: 'Site', description: 'The strip above the header and the sale tag. The words in the tag come from the live headline sale in Discounts; the fields below are used only when no sale is marked as the headline. Use Schedule to switch things on and off at set times.' },
  custom: publicRead,
  access: { read: () => true, update: isStaff },
  versions: globalDrafts,
  fields: [
    {
      name: 'bar',
      type: 'group',
      label: 'Announcement bar',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: false },
        { name: 'text', type: 'text', maxLength: 120, admin: { description: 'For example: Free shipping over ₹1,999.', condition: (_, s) => !!s?.enabled } },
        {
          name: 'link',
          type: 'group',
          admin: { condition: (_, s) => !!s?.enabled, description: 'Optional: makes the banner clickable.' },
          fields: [
            { name: 'label', type: 'text' },
            { name: 'url', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'saleTag',
      type: 'group',
      label: 'Sale tag in the header',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'name', type: 'text', defaultValue: 'Dreamtime Sale', admin: { condition: (_, s) => !!s?.enabled } },
        { name: 'offerText', label: 'Offer text', type: 'text', defaultValue: '10% OFF', admin: { condition: (_, s) => !!s?.enabled, description: 'Used only when no live sale in Discounts is marked as the headline sale.' } },
        { name: 'url', type: 'text', defaultValue: '/collections/all', admin: { condition: (_, s) => !!s?.enabled, description: 'Where the tag leads, for example /collections/all.' } },
      ],
    },
  ],
}
