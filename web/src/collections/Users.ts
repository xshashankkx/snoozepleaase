import type { Access, CollectionConfig, FieldAccess } from 'payload'

type Role = 'owner' | 'manager'
const roleOf = (req: { user?: unknown }) => (req.user as { role?: Role } | null | undefined)?.role

export const isOwner: Access = ({ req }) => roleOf(req) === 'owner'
export const isStaff: Access = ({ req }) => !!req.user
const ownerField: FieldAccess = ({ req }) => roleOf(req) === 'owner'

// Owner: everything, including staff and settings. Store manager: products and content only.
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staff member', plural: 'Staff' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Settings',
    hidden: ({ user }) => (user as { role?: Role } | null)?.role !== 'owner',
  },
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    create: isOwner,
    delete: isOwner,
    read: ({ req }) => (roleOf(req) === 'owner' ? true : req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => (roleOf(req) === 'owner' ? true : req.user ? { id: { equals: req.user.id } } : false),
    admin: ({ req }) => !!req.user,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // The very first account is always the Owner.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users' })
          if (totalDocs === 0) data.role = 'owner'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'manager',
      saveToJWT: true,
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Store manager', value: 'manager' },
      ],
      access: { create: ownerField, update: ownerField },
      admin: { description: 'Owners can manage staff and settings. Store managers edit products and content. The very first account is always the Owner.' },
    },
  ],
}
