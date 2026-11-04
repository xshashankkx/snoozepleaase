import { APIError, type GlobalConfig } from 'payload'
import { isStaff } from '../collections/Users'
import { globalDrafts, publicRead } from '../lib/fields'

// The "Who are you shopping for?" growth chart: its words, the age stages and the picks for each.
export const AgeStep: GlobalConfig = {
  slug: 'age-step',
  label: 'Age step (growth chart)',
  admin: { group: 'Site', description: 'The growth chart shoppers see before Kids Nightwear, Co-ords and Shop now.' },
  custom: publicRead,
  access: { read: () => true, update: isStaff },
  versions: globalDrafts,
  hooks: {
    beforeChange: [
      ({ data }) => {
        const stages: any[] = data.stages ?? []
        const keys = new Set<string>()
        for (const s of stages) {
          if (keys.has(s.key)) throw new APIError(`Two stages share the code "${s.key}". Each code must be different.`, 400, undefined, true)
          keys.add(s.key)
          if (s.ageFrom > s.ageTo) throw new APIError(`${s.label}: "from" age must not be higher than "to" age.`, 400, undefined, true)
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'heading', type: 'text', required: true, defaultValue: 'Who are you shopping for?' },
    { name: 'intro', type: 'text', defaultValue: 'Pick an age and we will show the sizes that fit.' },
    { name: 'skipLabel', type: 'text', defaultValue: 'Show me everything', label: 'Skip link' },
    {
      name: 'stages',
      type: 'array',
      labels: { singular: 'Stage', plural: 'Stages' },
      minRows: 2,
      maxRows: 6,
      admin: {
        description: 'Listed from youngest to oldest. A size fits a stage when its age range overlaps the stage, so "3–4 years" fits both a stage ending at 3 and one starting at 4.',
        initCollapsed: true,
        components: { RowLabel: '/components/admin/RowLabels#StageLabel' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { description: 'For example: Toddler.' } },
            { name: 'plural', type: 'text', required: true, admin: { description: 'For example: Toddlers. Used in "Picks for toddlers".' } },
            { name: 'key', type: 'text', required: true, admin: { description: 'Short code used in links, for example toddler.' } },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'agesLabel', type: 'text', required: true, admin: { description: 'Shown on the chart, for example 1–3.' } },
            { name: 'ageFrom', type: 'number', required: true, min: 0, max: 18 },
            { name: 'ageTo', type: 'number', required: true, min: 0, max: 99, admin: { description: 'Use 99 for "and up".' } },
          ],
        },
        {
          name: 'picks',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          maxRows: 8,
          admin: { description: 'Hand-picked products shown at the top for this stage, in this order.' },
        },
      ],
    },
  ],
}
