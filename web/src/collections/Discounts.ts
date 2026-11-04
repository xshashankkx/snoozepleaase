import { APIError, type CollectionConfig } from 'payload'
import { isStaff } from './Users'

const liveStatus = (d: any, now = Date.now()) => {
  if (!d?.active) return 'Off'
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return 'Scheduled'
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return 'Ended'
  return 'Live'
}

// Offers and codes. Shoppers never read this collection directly: the shop asks the server for a
// price quote, so secret codes cannot be looked up and prices always come from the catalog.
export const Discounts: CollectionConfig = {
  slug: 'discounts',
  labels: { singular: 'Discount', plural: 'Discounts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'liveStatus', 'method', 'code', 'type', 'updatedAt'],
    listSearchableFields: ['title', 'code'],
    group: 'Marketing',
    description: 'Sales, codes and offers. When more than one offer fits a bag, the best single offer wins, unless an offer is marked "can combine".',
  },
  access: { read: isStaff, create: isStaff, update: isStaff, delete: isStaff },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.code) data.code = String(data.code).toUpperCase().replace(/\s+/g, '')
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        const d = { ...originalDoc, ...data }
        const fail = (m: string) => { throw new APIError(m, 400, undefined, true) }
        if (d.method === 'code' && !d.code) fail('Add the code shoppers will type in.')
        if (d.type === 'percentage' && !(d.value >= 1 && d.value <= 100)) fail('A percentage offer needs a value between 1 and 100.')
        if (d.type === 'flat' && !(d.value > 0)) fail('A flat offer needs an amount above 0.')
        if (d.type === 'buy_x_get_y') {
          const b = d.buy || {}
          if (!(b.buyQty >= 1) || !(b.getQty >= 1)) fail('Buy X get Y needs both numbers to be at least 1.')
          if (!(b.getPercent >= 1 && b.getPercent <= 100)) fail('The discount on the "get" items must be between 1% and 100%.')
        }
        if (d.appliesTo === 'categories' && !(d.categories?.length > 0)) fail('Choose at least one category, or set the offer to apply to everything.')
        if (d.appliesTo === 'products' && !(d.products?.length > 0)) fail('Choose at least one product, or set the offer to apply to everything.')
        if (d.startsAt && d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt)) fail('The end date must be after the start date.')
        if (d.headline?.showInHeader) {
          if (d.method !== 'automatic') fail('Only an automatic offer (no code) can be the headline sale in the header.')
          const others = await req.payload.find({
            collection: 'discounts', limit: 5, depth: 0,
            where: { and: [{ 'headline.showInHeader': { equals: true } }, { active: { equals: true } }, ...(operation === 'update' && originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : [])] },
          })
          if (d.active && others.totalDocs > 0) fail(`"${(others.docs[0] as any).title}" is already the headline sale. Switch it off or untick its header option first.`)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Name', admin: { description: 'Shoppers see this name in their bag, for example "Dreamtime Sale" or "Welcome code".' } },
    {
      type: 'row',
      fields: [
        { name: 'active', type: 'checkbox', defaultValue: false, label: 'Switched on', admin: { description: 'Nothing happens for shoppers until this is ticked.' } },
        { name: 'startsAt', type: 'date', label: 'Starts', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Optional. Leave empty to start straight away.' } },
        { name: 'endsAt', type: 'date', label: 'Ends', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Optional. Leave empty to run until switched off.' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'method', type: 'select', required: true, defaultValue: 'automatic', label: 'How shoppers get it',
          options: [{ label: 'Automatically (no code)', value: 'automatic' }, { label: 'With a code', value: 'code' }],
        },
        { name: 'code', type: 'text', unique: true, index: true, admin: { condition: (d) => d?.method === 'code', description: 'Shoppers type this in. Letters and numbers only, for example WELCOME10.' } },
      ],
    },
    {
      name: 'type', type: 'select', required: true, defaultValue: 'percentage', label: 'What it does',
      options: [
        { label: 'Percentage off', value: 'percentage' },
        { label: 'Flat amount off (₹)', value: 'flat' },
        { label: 'Buy X, get Y', value: 'buy_x_get_y' },
        { label: 'Free shipping', value: 'free_shipping' },
      ],
    },
    {
      name: 'value', type: 'number', min: 0, label: 'Amount',
      admin: { condition: (d) => d?.type === 'percentage' || d?.type === 'flat', description: 'A percentage (for example 10) or rupees (for example 150), depending on the choice above.' },
    },
    {
      name: 'buy', type: 'group', label: 'Buy X, get Y',
      admin: { condition: (d) => d?.type === 'buy_x_get_y', description: 'For every X + Y items in the bag, the cheapest Y get the discount. "Buy 2, get 1 free" is 2, 1 and 100%.' },
      fields: [{
        type: 'row',
        fields: [
          { name: 'buyQty', type: 'number', min: 1, defaultValue: 2, label: 'Buy (X)' },
          { name: 'getQty', type: 'number', min: 1, defaultValue: 1, label: 'Get (Y)' },
          { name: 'getPercent', type: 'number', min: 1, max: 100, defaultValue: 100, label: 'Discount on the Y items (%)' },
        ],
      }],
    },
    {
      name: 'appliesTo', type: 'select', defaultValue: 'all', label: 'Applies to',
      options: [{ label: 'Everything in the bag', value: 'all' }, { label: 'Certain categories', value: 'categories' }, { label: 'Certain products', value: 'products' }],
      admin: { condition: (d) => d?.type !== 'free_shipping' },
    },
    {
      name: 'categories', type: 'select', hasMany: true,
      options: [
        { label: 'Kids Nightwear', value: 'kids-nightwear' }, { label: 'Co-ords', value: 'co-ords' },
        { label: 'Bath & Towels', value: 'bath-towels' }, { label: 'Mom & Me', value: 'mom-me' },
      ],
      admin: { condition: (d) => d?.appliesTo === 'categories' && d?.type !== 'free_shipping' },
    },
    { name: 'products', type: 'relationship', relationTo: 'products', hasMany: true, admin: { condition: (d) => d?.appliesTo === 'products' && d?.type !== 'free_shipping' } },
    {
      name: 'rules', type: 'group', label: 'Rules',
      fields: [
        { name: 'minSubtotal', type: 'number', min: 0, label: 'Minimum spend (₹)', admin: { description: 'Optional. Counted on the items the offer applies to, before this offer.' } },
        { name: 'firstOrderOnly', type: 'checkbox', label: 'First order only', admin: { description: 'For shoppers with no earlier order. In this demo it is checked against orders saved in the shopper\'s browser, using the email or phone typed at checkout.' } },
        { name: 'oncePerCustomer', type: 'checkbox', label: 'Once per customer', admin: { description: 'Same demo-level check as above.' } },
      ],
    },
    { name: 'combinable', type: 'checkbox', defaultValue: false, label: 'Can combine with other offers', admin: { description: 'Off by default: the best single offer wins. Tick this for offers that should stack, such as free shipping.' } },
    {
      name: 'headline', type: 'group', label: 'Show in the header',
      admin: { condition: (d) => d?.method === 'automatic', description: 'Marks this as the sale shown in the header tag and on product pages. Only one can be the headline sale at a time.' },
      fields: [
        { name: 'showInHeader', type: 'checkbox', defaultValue: false, label: 'This is the headline sale' },
        {
          type: 'row',
          fields: [
            { name: 'tagName', type: 'text', label: 'Tag name', admin: { condition: (_, s) => !!s?.showInHeader, description: 'For example: Dreamtime Sale. Leave empty to use the offer name.' } },
            { name: 'tagText', type: 'text', label: 'Tag text', admin: { condition: (_, s) => !!s?.showInHeader, description: 'For example: 10% OFF. Leave empty to build it from the amount.' } },
          ],
        },
      ],
    },
    {
      name: 'liveStatus', type: 'text', virtual: true, label: 'Status',
      admin: { readOnly: true, position: 'sidebar', description: 'Live, Scheduled, Ended or Off.' },
      hooks: { afterRead: [({ siblingData }) => liveStatus(siblingData)] },
    },
  ],
}

export { liveStatus }
