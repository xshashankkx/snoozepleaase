import { revalidateTag } from 'next/cache'

// Called after any content is saved or deleted, so published changes reach shoppers within seconds.
// It quietly does nothing when run outside the website (for example from the seed scripts).
export const refreshStorefront = () => {
  try {
    revalidateTag('cms', 'max')
  } catch {
    /* not running inside Next.js */
  }
}

export const withRefresh = <T extends { hooks?: any }>(c: T): T => ({
  ...c,
  hooks: {
    ...c.hooks,
    afterChange: [...(c.hooks?.afterChange ?? []), refreshStorefront],
    afterDelete: [...(c.hooks?.afterDelete ?? []), refreshStorefront],
  },
})
