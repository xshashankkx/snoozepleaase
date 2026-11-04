import type { Field, GlobalConfig } from 'payload'
import { isStaff } from '../collections/Users'
import { globalDrafts, publicRead, seoField } from '../lib/fields'

const cta = (name: string, label: string, defaults: { label: string; url: string }): Field => ({
  name,
  type: 'group',
  label,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'label', type: 'text', required: true, defaultValue: defaults.label },
        { name: 'url', type: 'text', required: true, defaultValue: defaults.url, admin: { description: 'A page on the site such as /collections/all.' } },
      ],
    },
  ],
})

// Every section of the home page, in the order shoppers see them.
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home page',
  admin: { preview: () => `/api/preview?path=${encodeURIComponent('/')}`, group: 'Site', description: 'Each tab is one section of the home page, from top to bottom.' },
  custom: publicRead,
  access: { read: () => true, update: isStaff },
  versions: globalDrafts,
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '1 Top of page',
          description: 'The big headline and the two buttons.',
          fields: [
            { name: 'headlineLine1', label: 'Headline, first line', type: 'text', required: true, defaultValue: 'Dream big,' },
            { name: 'headlineLine2', label: 'Headline, second line', type: 'text', required: true, defaultValue: 'sleep cozy' },
            { name: 'subline', label: 'Text under the headline', type: 'textarea', maxLength: 140, defaultValue: 'Premium handcrafted nightwear designed for relaxation, elegance and better sleep.' },
            cta('primaryButton', 'Main button', { label: 'Shop now', url: '/collections/all' }),
            cta('secondaryButton', 'Second button', { label: 'Kids nightwear', url: '/collections/kids-nightwear' }),
          ],
        },
        {
          label: '2 Featured boxes',
          description: 'The gift boxes right under the headline.',
          fields: [
            {
              name: 'featured', label: 'Products',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              minRows: 2,
              maxRows: 4,
              required: true,
              admin: { description: 'Pick two to four products. Four fill the 2 by 2 grid in the design.' },
            },
          ],
        },
        {
          label: '3 Ticker strip',
          description: 'The scrolling line of short promises under the age boxes.',
          fields: [
            {
              name: 'ticker', label: 'Messages',
              type: 'array',
              labels: { singular: 'Message', plural: 'Messages' },
              minRows: 2,
              maxRows: 8,
              admin: { components: { RowLabel: '/components/admin/RowLabels#MessageLabel' } },
              fields: [{ name: 'text', type: 'text', required: true, maxLength: 60 }],
            },
          ],
        },
        {
          label: '4 Best sellers',
          fields: [
            { name: 'bestSellersHeading', label: 'Section heading', type: 'text', required: true, defaultValue: 'Best sellers' },
            { name: 'bestSellers', label: 'Collection to show', type: 'relationship', relationTo: 'product-collections', admin: { description: 'The curated collection to show here.' } },
          ],
        },
        {
          label: '5 Choose your box',
          description: 'One box per category, linking to that category.',
          fields: [
            { name: 'boxesHeading', label: 'Section heading', type: 'text', required: true, defaultValue: 'Choose your box' },
            {
              name: 'boxes',
              type: 'array',
              labels: { singular: 'Box', plural: 'Boxes' },
              minRows: 2,
              maxRows: 4,
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
                { name: 'photoProduct', label: 'Product photo', type: 'relationship', relationTo: 'products', required: true, admin: { description: 'The product whose photo sits in the box window.' } },
              ],
            },
          ],
        },
        {
          label: '6 Our story',
          fields: [
            { name: 'storyHeading', label: 'Section heading', type: 'text', required: true, defaultValue: 'Luxury in every thread' },
            { name: 'storyLede', label: 'Intro text', type: 'textarea', maxLength: 300 },
            {
              name: 'promises', label: 'Promises',
              type: 'array',
              labels: { singular: 'Promise', plural: 'Promises' },
              maxRows: 4,
              admin: { components: { RowLabel: '/components/admin/RowLabels#PromiseLabel' } },
              fields: [
                { name: 'icon', type: 'select', defaultValue: 'star', options: [{ label: 'Leaf', value: 'leaf' }, { label: 'Star', value: 'star' }, { label: 'Shield', value: 'shield' }] },
                { name: 'title', type: 'text', required: true },
                { name: 'text', type: 'textarea', required: true, maxLength: 200 },
              ],
            },
            cta('storyButton', 'Button', { label: 'Our story', url: '/pages/about-us' }),
            {
              name: 'storyImages', label: 'Photos',
              type: 'array',
              labels: { singular: 'Photo', plural: 'Photos' },
              maxRows: 2,
              admin: { description: 'Two photos side by side.' },
              fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
            },
          ],
        },
        {
          label: '7 Photo strip',
          fields: [
            { name: 'stripHeading', label: 'Section heading', type: 'text', required: true, defaultValue: 'Bedtime, photographed' },
            {
              name: 'strip', label: 'Photos',
              type: 'array',
              labels: { singular: 'Photo', plural: 'Photos' },
              maxRows: 10,
              fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
            },
          ],
        },
        {
          label: '8 New arrivals',
          fields: [
            { name: 'newHeading', label: 'Section heading', type: 'text', required: true, defaultValue: 'Just landed' },
            { name: 'newArrivals', label: 'Collection to show', type: 'relationship', relationTo: 'product-collections', admin: { description: 'The curated collection to show here.' } },
          ],
        },
        {
          label: '9 Closing',
          fields: [
            { name: 'closingTitle', label: 'Closing words', type: 'textarea', required: true, defaultValue: 'Sleep naturally,\ndream sustainably.', admin: { description: 'Press Enter to start a new line.' } },
            cta('closingButton', 'Button', { label: 'Shop everything', url: '/collections/all' }),
          ],
        },
        { label: 'Search and sharing', fields: [seoField] },
      ],
    },
  ],
}
