import { APIError, type CollectionConfig } from 'payload'
import { isStaff } from './Users'
import { draftsWithSchedule, publicRead, publishedOrStaff, seoField, slugField } from '../lib/fields'

// Fairs and pop-ups, shown on the public "Find us at events" page.
export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Event', plural: 'Events' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'city', 'startsOn', 'endsOn', '_status'], group: 'Content' },
  custom: publicRead,
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  versions: draftsWithSchedule,
  defaultSort: 'startsOn',
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const d = { ...originalDoc, ...data }
        if (d.startsOn && d.endsOn && new Date(d.endsOn) < new Date(d.startsOn)) {
          throw new APIError('The event cannot end before it starts.', 400, undefined, true)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'For example: Mumbai Kids Fair.' } },
    slugField('name', 'Used in the web address of the event.'),
    {
      type: 'row',
      fields: [
        { name: 'startsOn', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'endsOn', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'venue', type: 'text', required: true, admin: { description: 'Name of the place.' } },
        { name: 'city', type: 'text', required: true },
      ],
    },
    { name: 'stall', type: 'text', admin: { description: 'Where to find us, for example Hall 2, Stall B12.' } },
    { name: 'description', type: 'textarea', maxLength: 400 },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'link', type: 'text', admin: { description: 'Optional link to the event page or map.' } },
    seoField,
  ],
}
